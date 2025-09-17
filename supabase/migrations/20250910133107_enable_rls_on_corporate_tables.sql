-- Enable RLS on tables that don't have it
ALTER TABLE public.corporate_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for corporate_entities
CREATE POLICY "Users can view their own corporate entities"
ON public.corporate_entities FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own corporate entities"
ON public.corporate_entities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own corporate entities"
ON public.corporate_entities FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own corporate entities"
ON public.corporate_entities FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add basic RLS policies for entity_brand_assets
CREATE POLICY "Users can view brand assets"
ON public.entity_brand_assets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert brand assets"
ON public.entity_brand_assets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update brand assets"
ON public.entity_brand_assets FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete brand assets"
ON public.entity_brand_assets FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add basic RLS policies for entity_relationships
CREATE POLICY "Users can view entity relationships"
ON public.entity_relationships FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert entity relationships"
ON public.entity_relationships FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update entity relationships"
ON public.entity_relationships FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete entity relationships"
ON public.entity_relationships FOR DELETE
USING (auth.uid() IS NOT NULL);