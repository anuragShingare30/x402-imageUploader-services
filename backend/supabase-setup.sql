-- Supabase Database Setup for x402 Image Uploader Service

-- Create the images table
CREATE TABLE IF NOT EXISTS images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_address TEXT, -- Optional: wallet address or user identifier
    path TEXT NOT NULL, -- Storage path in Supabase bucket
    mime TEXT NOT NULL, -- MIME type (e.g., image/jpeg, image/png)
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    public_url TEXT, -- Public URL for accessing the image
    file_size INTEGER, -- File size in bytes
    original_name TEXT -- Original filename
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_user_address ON images(user_address) WHERE user_address IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access to all images (you can modify this based on your needs)
CREATE POLICY "Allow read access to images" ON images
    FOR SELECT USING (true);

-- Create a policy to allow insert access (you might want to restrict this further)
CREATE POLICY "Allow insert access to images" ON images
    FOR INSERT WITH CHECK (true);

-- Create the storage bucket for images (run this in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Set up storage policies for the images bucket
-- These policies should be created in Supabase Dashboard > Storage > images bucket > Policies

-- Policy 1: Allow public read access to images
-- CREATE POLICY "Allow public read access" ON storage.objects
-- FOR SELECT USING (bucket_id = 'images');

-- Policy 2: Allow authenticated upload to images bucket
-- CREATE POLICY "Allow upload access" ON storage.objects
-- FOR INSERT WITH CHECK (bucket_id = 'images');

-- Policy 3: Allow update access (optional)
-- CREATE POLICY "Allow update access" ON storage.objects
-- FOR UPDATE USING (bucket_id = 'images');

-- Policy 4: Allow delete access (optional)
-- CREATE POLICY "Allow delete access" ON storage.objects
-- FOR DELETE USING (bucket_id = 'images');