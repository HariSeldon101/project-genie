-- Add PDF customization settings to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pdf_watermark_text TEXT DEFAULT 'Strictly Private & Confidential',
ADD COLUMN IF NOT EXISTS pdf_hide_attribution BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pdf_watermark_enabled BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.pdf_watermark_text IS 'Custom watermark text for paid users PDFs';
COMMENT ON COLUMN profiles.pdf_hide_attribution IS 'Whether to hide Project Genie attribution (paid users only)';
COMMENT ON COLUMN profiles.pdf_watermark_enabled IS 'Whether to show watermark on PDFs (paid users can disable)';