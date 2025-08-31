-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,  -- Make public for easy access
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- Create RLS policies for PDF bucket
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Users can update their own PDFs" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own PDFs" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view PDFs" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pdfs');