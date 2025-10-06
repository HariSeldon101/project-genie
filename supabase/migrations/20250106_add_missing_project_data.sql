-- Migration: Add missing project data columns
-- Description: Adds agilometer and prince2_roles columns to preserve all wizard data
-- Author: Claude Code
-- Date: 2025-01-06

-- Add agilometer settings column for Hybrid methodology
-- Stores: flexibility, teamExperience, riskTolerance, documentation, governance (0-100 scale)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS agilometer JSONB;

-- Add PRINCE2 role mappings column
-- Stores: {seniorUserId: uuid, seniorSupplierId: uuid, executiveId: uuid}
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS prince2_roles JSONB;

-- Add comments for documentation
COMMENT ON COLUMN projects.agilometer IS 'Hybrid methodology settings: flexibility, teamExperience, riskTolerance, documentation, governance (0-100 scale)';
COMMENT ON COLUMN projects.prince2_roles IS 'PRINCE2 stakeholder role mappings: {seniorUserId, seniorSupplierId, executiveId} referencing stakeholders table';

-- Create index on methodology_type for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_methodology_type ON projects(methodology_type);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: agilometer and prince2_roles columns added to projects table';
END $$;
