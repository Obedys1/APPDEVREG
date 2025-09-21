/*
# [FEATURE] Update Storage and RLS Policies for Shared Data Access

This migration configures Supabase Storage for public image access and updates Row Level Security (RLS) policies to allow all authenticated users to view all devolution records, while restricting modifications to the original author.

## Query Description:
This script performs the following actions:
1.  **Storage Bucket:** Creates a public storage bucket named `anexos_devolucoes` for devolution attachments. If it already exists, it ensures it is public.
2.  **Storage RLS Policies:** Sets up security policies on the new bucket to:
    - Allow any authenticated user to view images.
    - Allow authenticated users to upload, update, or delete only their own files.
3.  **Table RLS Policies:** Enables and configures RLS on the `devolucoes` and `produtos_devolvidos` tables to:
    - Allow any authenticated user to read all records.
    - Allow users to insert, update, or delete only their own records.

This change is crucial for enabling shared data visibility across the application as requested.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true (by dropping policies and bucket)

## Structure Details:
- storage.buckets: Inserts 'anexos_devolucoes'.
- storage.objects: Adds RLS policies for SELECT, INSERT, UPDATE, DELETE.
- public.devolucoes: Enables RLS and adds policies for SELECT, INSERT, UPDATE, DELETE.
- public.produtos_devolvidos: Enables RLS and adds policies for SELECT, INSERT, UPDATE, DELETE.

## Security Implications:
- RLS Status: Enabled on `devolucoes`, `produtos_devolvidos`, and `storage.objects`.
- Policy Changes: Yes. Policies are added to allow broader read access while maintaining ownership for write operations. This is a significant change to the data access model.
- Auth Requirements: All operations require an authenticated user.

## Performance Impact:
- Indexes: None.
- Triggers: None.
- Estimated Impact: RLS policies add a minor overhead to queries, but it is generally negligible for this use case.
*/

-- 1. Create a public bucket for devolution attachments if it doesn't exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos_devolucoes', 'anexos_devolucoes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Set up RLS policies for the storage bucket.
-- Allow any authenticated user to view images.
DROP POLICY IF EXISTS "Allow authenticated read access" ON storage.objects;
CREATE POLICY "Allow authenticated read access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'anexos_devolucoes');

-- Allow authenticated users to upload their own files.
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;
CREATE POLICY "Allow authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anexos_devolucoes' AND auth.uid() = owner);

-- Allow authenticated users to update their own files.
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'anexos_devolucoes' AND auth.uid() = owner);

-- Allow authenticated users to delete their own files.
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'anexos_devolucoes' AND auth.uid() = owner);


-- 3. Enable RLS on the main tables and set up policies for shared viewing.
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_devolvidos ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Enable read access for own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.devolucoes;
DROP POLICY IF EXISTS "Enable update for own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Enable delete for own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Allow authenticated read access to all" ON public.devolucoes;
DROP POLICY IF EXISTS "Allow insert for own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Allow update for own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Allow delete for own records" ON public.devolucoes;

-- Policies for 'devolucoes' table
-- Allow all authenticated users to read all records.
CREATE POLICY "Allow authenticated read access to all"
ON public.devolucoes
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own records.
CREATE POLICY "Allow insert for own records"
ON public.devolucoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Allow users to update their own records.
CREATE POLICY "Allow update for own records"
ON public.devolucoes
FOR UPDATE
TO authenticated
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- Allow users to delete their own records.
CREATE POLICY "Allow delete for own records"
ON public.devolucoes
FOR DELETE
TO authenticated
USING (auth.uid() = usuario_id);


-- Policies for 'produtos_devolvidos' table
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Enable read access for own records" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Enable update for own records" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Enable delete for own records" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Allow authenticated read access to all" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Allow insert for own records" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Allow update for own records" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Allow delete for own records" ON public.produtos_devolvidos;

-- Allow all authenticated users to read all product records.
CREATE POLICY "Allow authenticated read access to all"
ON public.produtos_devolvidos
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert product records linked to a devolution they own.
CREATE POLICY "Allow insert for own records"
ON public.produtos_devolvidos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.devolucoes
    WHERE id = devolution_id AND usuario_id = auth.uid()
  )
);

-- Allow users to update product records linked to a devolution they own.
CREATE POLICY "Allow update for own records"
ON public.produtos_devolvidos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.devolucoes
    WHERE id = devolution_id AND usuario_id = auth.uid()
  )
);

-- Allow users to delete product records linked to a devolution they own.
CREATE POLICY "Allow delete for own records"
ON public.produtos_devolvidos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.devolucoes
    WHERE id = devolution_id AND usuario_id = auth.uid()
  )
);
