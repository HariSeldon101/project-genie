-- Migration: Add Corporate Structure Support for Multi-Brand Companies
-- This enables tracking of parent companies, subsidiaries, and sub-brands

-- Create enum for company relationship types
CREATE TYPE company_relationship_type AS ENUM (
  'parent',
  'subsidiary',
  'sub_brand',
  'division',
  'joint_venture',
  'franchise',
  'affiliate'
);

-- Create corporate_entities table
CREATE TABLE IF NOT EXISTS corporate_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  entity_type company_relationship_type NOT NULL DEFAULT 'parent',
  parent_entity_id UUID REFERENCES corporate_entities(id) ON DELETE CASCADE,
  
  -- Primary domain and website
  primary_domain TEXT,
  website_url TEXT,
  
  -- Corporate information
  founded_year INTEGER,
  headquarters_location TEXT,
  industry TEXT,
  employee_count TEXT,
  revenue_range TEXT,
  stock_symbol TEXT,
  
  -- Brand assets (each entity can have its own)
  brand_assets JSONB DEFAULT '{}',
  /* Structure:
  {
    "logo": "url",
    "favicon": "url",
    "colors": ["#hex1", "#hex2"],
    "fonts": ["font1", "font2"],
    "brandGuidelines": "url",
    "brandDescription": "text"
  }
  */
  
  -- Additional domains and websites
  additional_domains TEXT[] DEFAULT '{}',
  social_profiles JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(legal_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(primary_domain, '')), 'C')
  ) STORED
);

-- Create index for search
CREATE INDEX idx_corporate_entities_search ON corporate_entities USING GIN(search_vector);
CREATE INDEX idx_corporate_entities_parent ON corporate_entities(parent_entity_id);
CREATE INDEX idx_corporate_entities_domain ON corporate_entities(primary_domain);

-- Create entity_relationships table for complex relationships
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity_id UUID NOT NULL REFERENCES corporate_entities(id) ON DELETE CASCADE,
  child_entity_id UUID NOT NULL REFERENCES corporate_entities(id) ON DELETE CASCADE,
  relationship_type company_relationship_type NOT NULL,
  ownership_percentage DECIMAL(5,2),
  relationship_start_date DATE,
  relationship_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(parent_entity_id, child_entity_id, relationship_type)
);

-- Create entity_brand_assets table for tracking brand evolution
CREATE TABLE IF NOT EXISTS entity_brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES corporate_entities(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'logo', 'color_scheme', 'typography', 'guidelines'
  asset_data JSONB NOT NULL,
  version TEXT,
  is_current BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Link research sessions to corporate entities
ALTER TABLE research_sessions 
ADD COLUMN IF NOT EXISTS corporate_entity_id UUID REFERENCES corporate_entities(id),
ADD COLUMN IF NOT EXISTS discovered_entities JSONB DEFAULT '[]';
/* discovered_entities structure:
[
  {
    "name": "Subsidiary Name",
    "domain": "subsidiary.com",
    "relationship": "subsidiary",
    "confidence": 0.95
  }
]
*/

-- Create function to get full corporate hierarchy
CREATE OR REPLACE FUNCTION get_corporate_hierarchy(root_entity_id UUID)
RETURNS TABLE (
  entity_id UUID,
  name TEXT,
  entity_type company_relationship_type,
  level INTEGER,
  parent_id UUID,
  primary_domain TEXT,
  brand_assets JSONB
) AS $$
WITH RECURSIVE hierarchy AS (
  -- Base case: root entity
  SELECT 
    id as entity_id,
    name,
    entity_type,
    0 as level,
    parent_entity_id as parent_id,
    primary_domain,
    brand_assets
  FROM corporate_entities
  WHERE id = root_entity_id
  
  UNION ALL
  
  -- Recursive case: children
  SELECT 
    ce.id as entity_id,
    ce.name,
    ce.entity_type,
    h.level + 1,
    ce.parent_entity_id as parent_id,
    ce.primary_domain,
    ce.brand_assets
  FROM corporate_entities ce
  INNER JOIN hierarchy h ON ce.parent_entity_id = h.entity_id
)
SELECT * FROM hierarchy ORDER BY level, name;
$$ LANGUAGE SQL STABLE;

-- Create function to discover related entities from scraped data
CREATE OR REPLACE FUNCTION discover_related_entities(
  p_domain TEXT,
  p_scraped_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_entities JSONB := '[]'::JSONB;
  v_entity JSONB;
BEGIN
  -- Extract potential subsidiaries from content patterns
  -- This is a placeholder for actual entity extraction logic
  -- In practice, this would analyze the scraped content for:
  -- - "Our brands" sections
  -- - "Subsidiaries" mentions
  -- - "Part of [Parent Company]" text
  -- - Footer company information
  -- - About page corporate structure
  
  -- Example detection (would be more sophisticated in practice)
  IF p_scraped_data ? 'content' THEN
    -- Look for common patterns
    IF p_scraped_data->>'content' ~* 'subsidiary|division|brand|part of|owned by|parent company' THEN
      v_entities := v_entities || jsonb_build_object(
        'detected', true,
        'confidence', 0.8,
        'message', 'Corporate structure indicators found in content'
      );
    END IF;
  END IF;
  
  RETURN v_entities;
END;
$$ LANGUAGE plpgsql;

-- Create view for entity overview
CREATE OR REPLACE VIEW corporate_entity_overview AS
SELECT 
  ce.id,
  ce.name,
  ce.entity_type,
  ce.primary_domain,
  ce.brand_assets,
  parent.name as parent_name,
  parent.id as parent_id,
  COUNT(DISTINCT children.id) as subsidiary_count,
  COUNT(DISTINCT rs.id) as research_session_count,
  ce.created_at,
  ce.updated_at
FROM corporate_entities ce
LEFT JOIN corporate_entities parent ON ce.parent_entity_id = parent.id
LEFT JOIN corporate_entities children ON ce.id = children.parent_entity_id
LEFT JOIN research_sessions rs ON ce.id = rs.corporate_entity_id
GROUP BY ce.id, ce.name, ce.entity_type, ce.primary_domain, ce.brand_assets, 
         parent.name, parent.id, ce.created_at, ce.updated_at;

-- Add RLS policies
ALTER TABLE corporate_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_brand_assets ENABLE ROW LEVEL SECURITY;

-- Policy for corporate_entities
CREATE POLICY "Users can view all corporate entities" ON corporate_entities
  FOR SELECT USING (true);

CREATE POLICY "Users can create corporate entities" ON corporate_entities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their created entities" ON corporate_entities
  FOR UPDATE USING (created_by = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));

-- Policy for entity_relationships
CREATE POLICY "Users can view all relationships" ON entity_relationships
  FOR SELECT USING (true);

CREATE POLICY "Users can manage relationships" ON entity_relationships
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Policy for entity_brand_assets
CREATE POLICY "Users can view all brand assets" ON entity_brand_assets
  FOR SELECT USING (true);

CREATE POLICY "Users can manage brand assets" ON entity_brand_assets
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_entity_brand_assets_entity ON entity_brand_assets(entity_id);
CREATE INDEX idx_entity_brand_assets_current ON entity_brand_assets(is_current) WHERE is_current = true;
CREATE INDEX idx_research_sessions_entity ON research_sessions(corporate_entity_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corporate_entities_updated_at 
  BEFORE UPDATE ON corporate_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_relationships_updated_at
  BEFORE UPDATE ON entity_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE corporate_entities IS 'Stores parent companies, subsidiaries, and sub-brands with their relationships';
COMMENT ON TABLE entity_relationships IS 'Tracks complex relationships between corporate entities';
COMMENT ON TABLE entity_brand_assets IS 'Historical tracking of brand assets for each entity';
COMMENT ON FUNCTION get_corporate_hierarchy IS 'Returns the full corporate hierarchy tree for a given entity';
COMMENT ON FUNCTION discover_related_entities IS 'Analyzes scraped data to discover potential related entities';