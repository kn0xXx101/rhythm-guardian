-- Storage Policies for Avatars bucket
-- This ensures that users can upload their own profile images

-- 1. Create the bucket if it doesn't exist (though it usually does)
-- Note: buckets table is in storage schema
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- 2. Allow public access to read avatars
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- 3. Allow authenticated users to upload their own avatar
-- We use user.id in the path as the folder name
CREATE POLICY "Users can upload their own avatar" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects 
FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);
