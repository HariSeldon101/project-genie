-- Migration: Add generation analytics tracking
-- Date: 2025-08-26
-- Description: Track document generation metrics including tokens, costs, and performance

-- 1. Create generation_analytics table for detailed tracking
CREATE TABLE IF NOT EXISTS generation_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Provider and model information
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    
    -- Token usage
    input_tokens INTEGER,
    output_tokens INTEGER,
    reasoning_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Performance metrics
    generation_time_ms INTEGER NOT NULL,
    reasoning_effort VARCHAR(20),
    temperature DECIMAL(2,1),
    max_tokens INTEGER,
    
    -- Cost tracking
    cost_usd DECIMAL(10, 6),
    
    -- Status and error handling
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for common queries
    INDEX idx_generation_analytics_project (project_id),
    INDEX idx_generation_analytics_document (document_id),
    INDEX idx_generation_analytics_created (created_at),
    INDEX idx_generation_analytics_provider_model (provider, model)
);

-- 2. Add generation metrics to artifacts table
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS generation_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS generation_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS generation_tokens INTEGER,
ADD COLUMN IF NOT EXISTS generation_cost DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS generation_metadata JSONB;

-- 3. Create view for analytics dashboard
CREATE OR REPLACE VIEW generation_analytics_summary AS
SELECT 
    DATE(created_at) as date,
    provider,
    model,
    COUNT(*) as total_generations,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_generations,
    AVG(generation_time_ms) as avg_time_ms,
    SUM(total_tokens) as total_tokens_used,
    SUM(cost_usd) as total_cost,
    AVG(cost_usd) as avg_cost_per_doc
FROM generation_analytics
GROUP BY DATE(created_at), provider, model;

-- 4. Create view for document type analytics
CREATE OR REPLACE VIEW document_type_analytics AS
SELECT 
    a.type as document_type,
    ga.provider,
    ga.model,
    COUNT(*) as generation_count,
    AVG(ga.generation_time_ms) as avg_time_ms,
    AVG(ga.total_tokens) as avg_tokens,
    AVG(ga.cost_usd) as avg_cost,
    MIN(ga.generation_time_ms) as min_time_ms,
    MAX(ga.generation_time_ms) as max_time_ms,
    SUM(CASE WHEN ga.success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate
FROM generation_analytics ga
JOIN artifacts a ON ga.document_id = a.id
GROUP BY a.type, ga.provider, ga.model;

-- 5. Create function to calculate cost based on model and tokens
CREATE OR REPLACE FUNCTION calculate_generation_cost(
    p_model VARCHAR,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_reasoning_tokens INTEGER DEFAULT 0
) RETURNS DECIMAL(10, 6) AS $$
BEGIN
    -- GPT-5 pricing (per 1M tokens)
    IF p_model LIKE 'gpt-5%' THEN
        IF p_model = 'gpt-5-mini' THEN
            -- GPT-5-mini: $0.025 input, $0.20 output
            RETURN (p_input_tokens * 0.000025) + (p_output_tokens * 0.0002) + (p_reasoning_tokens * 0.0002);
        ELSIF p_model = 'gpt-5-nano' THEN
            -- GPT-5-nano: $0.025 input, $0.20 output  
            RETURN (p_input_tokens * 0.000025) + (p_output_tokens * 0.0002) + (p_reasoning_tokens * 0.0002);
        ELSE
            -- GPT-5 standard: $0.05 input, $0.40 output (estimated)
            RETURN (p_input_tokens * 0.00005) + (p_output_tokens * 0.0004) + (p_reasoning_tokens * 0.0004);
        END IF;
    -- GPT-4 pricing
    ELSIF p_model LIKE 'gpt-4%' THEN
        IF p_model = 'gpt-4-turbo' OR p_model = 'gpt-4-turbo-preview' THEN
            -- GPT-4-turbo: $0.01 input, $0.03 output
            RETURN (p_input_tokens * 0.00001) + (p_output_tokens * 0.00003);
        ELSE
            -- GPT-4: $0.03 input, $0.06 output
            RETURN (p_input_tokens * 0.00003) + (p_output_tokens * 0.00006);
        END IF;
    -- Groq pricing (very cheap)
    ELSIF p_model LIKE '%llama%' OR p_model LIKE '%mixtral%' THEN
        -- Groq models: ~$0.001 per 1K tokens
        RETURN (p_input_tokens + p_output_tokens) * 0.000001;
    ELSE
        -- Default/unknown model
        RETURN (p_input_tokens + p_output_tokens) * 0.000002;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-calculate cost
CREATE OR REPLACE FUNCTION update_generation_cost()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cost_usd IS NULL AND NEW.input_tokens IS NOT NULL AND NEW.output_tokens IS NOT NULL THEN
        NEW.cost_usd := calculate_generation_cost(
            NEW.model,
            NEW.input_tokens,
            NEW.output_tokens,
            COALESCE(NEW.reasoning_tokens, 0)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_cost_on_insert
BEFORE INSERT ON generation_analytics
FOR EACH ROW
EXECUTE FUNCTION update_generation_cost();

-- 7. Grant appropriate permissions
GRANT SELECT ON generation_analytics TO authenticated;
GRANT INSERT ON generation_analytics TO authenticated;
GRANT SELECT ON generation_analytics_summary TO authenticated;
GRANT SELECT ON document_type_analytics TO authenticated;

-- 8. Add RLS policies
ALTER TABLE generation_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for viewing analytics (project members only)
CREATE POLICY "Users can view generation analytics for their projects"
ON generation_analytics FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
        UNION
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
);

-- Policy for inserting analytics (system only via service role)
CREATE POLICY "Service role can insert generation analytics"
ON generation_analytics FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 9. Add comment for documentation
COMMENT ON TABLE generation_analytics IS 'Tracks detailed metrics for each document generation including token usage, costs, and performance';
COMMENT ON COLUMN generation_analytics.reasoning_tokens IS 'GPT-5 specific - tokens used for internal reasoning (not visible in output)';
COMMENT ON COLUMN generation_analytics.reasoning_effort IS 'GPT-5 specific - effort level: minimal, low, medium, high';