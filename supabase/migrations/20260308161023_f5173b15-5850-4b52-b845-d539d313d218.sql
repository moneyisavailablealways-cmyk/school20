-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload school logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-logos');

-- Allow public read access
CREATE POLICY "Public can view school logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-logos');

-- Allow authenticated users to update/delete their logos
CREATE POLICY "Authenticated users can update school logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'school-logos');

CREATE POLICY "Authenticated users can delete school logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'school-logos');