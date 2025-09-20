/*
  # [Complete Schema for GDM Devoluções]
  This script sets up the complete database schema, including all tables, relationships,
  security policies (RLS), and storage configurations for the GDM Devoluções application.
  It includes the addition of 'familia' and 'grupo' columns as requested.

  ## Query Description:
  - Creates tables for user profiles, devolutions (returns), and returned products.
  - Establishes relationships between these tables and the authentication system.
  - Implements Row Level Security (RLS) to ensure users can only access their own data.
  - Sets up a trigger to automatically create a user profile upon sign-up.
  - Configures a storage bucket for file uploads with appropriate security policies.
  This is a foundational script. It is safe to run on a new project. If you have existing tables
  with these names, you should drop them first to avoid errors.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High" (as it defines the core structure)
  - Requires-Backup: false (on a new project)
  - Reversible: true (by dropping the created objects)

  ## Structure Details:
  - Tables Created: public.profiles, public.devolucoes, public.produtos_devolvidos
  - Columns Added: familia, grupo to produtos_devolvidos
  - Functions Created: public.handle_new_user()
  - Triggers Created: on_auth_user_created on auth.users
  - Storage Buckets Created: anexos_devolucoes

  ## Security Implications:
  - RLS Status: Enabled on all new public tables.
  - Policy Changes: Yes, new policies are created to restrict data access per user.
  - Auth Requirements: Policies are based on `auth.uid()`.

  ## Performance Impact:
  - Indexes: Primary keys and foreign keys are indexed by default.
  - Triggers: A trigger is added to `auth.users` which runs once per user creation.
  - Estimated Impact: Low.
*/

-- 1. PROFILES TABLE
-- Stores public user data, linked to the authentication system.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';

-- 2. TRIGGER TO CREATE PROFILE ON NEW USER SIGN-UP
-- This function is called by a trigger when a new user is created in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- The trigger that executes the function above.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. DEVOLUCOES (RETURNS) TABLE
-- Main table to store each return event.
CREATE TABLE IF NOT EXISTS public.devolucoes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cliente TEXT NOT NULL,
  motorista TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  anexos_urls TEXT[]
);
COMMENT ON TABLE public.devolucoes IS 'Main table for devolution records.';

-- 4. PRODUTOS_DEVOLVIDOS (RETURNED PRODUCTS) TABLE
-- Stores each product associated with a return. Includes 'familia' and 'grupo'.
CREATE TABLE IF NOT EXISTS public.produtos_devolvidos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  devolution_id BIGINT NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
  codigo TEXT,
  produto TEXT,
  familia TEXT NOT NULL, -- Added as per user request (mandatory)
  grupo TEXT,          -- Added as per user request (optional)
  quantidade NUMERIC NOT NULL,
  tipo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  estado TEXT,
  reincidencia TEXT NOT NULL
);
COMMENT ON TABLE public.produtos_devolvidos IS 'Stores individual products for each devolution, including family and group.';

-- 5. ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables to enforce data privacy.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_devolvidos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for `profiles` (Create if not exists)
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for `devolucoes` (Create if not exists)
DROP POLICY IF EXISTS "Users can view their own devolutions." ON public.devolucoes;
CREATE POLICY "Users can view their own devolutions."
  ON public.devolucoes FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can insert their own devolutions." ON public.devolucoes;
CREATE POLICY "Users can insert their own devolutions."
  ON public.devolucoes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can update their own devolutions." ON public.devolucoes;
CREATE POLICY "Users can update their own devolutions."
  ON public.devolucoes FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete their own devolutions." ON public.devolucoes;
CREATE POLICY "Users can delete their own devolutions."
  ON public.devolucoes FOR DELETE
  USING (auth.uid() = usuario_id);

-- RLS Policies for `produtos_devolvidos` (Create if not exists)
DROP POLICY IF EXISTS "Users can view products of their own devolutions." ON public.produtos_devolvidos;
CREATE POLICY "Users can view products of their own devolutions."
  ON public.produtos_devolvidos FOR SELECT
  USING (auth.uid() = (SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id));

DROP POLICY IF EXISTS "Users can insert products for their own devolutions." ON public.produtos_devolvidos;
CREATE POLICY "Users can insert products for their own devolutions."
  ON public.produtos_devolvidos FOR INSERT
  WITH CHECK (auth.uid() = (SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id));

DROP POLICY IF EXISTS "Users can update products of their own devolutions." ON public.produtos_devolvidos;
CREATE POLICY "Users can update products of their own devolutions."
  ON public.produtos_devolvidos FOR UPDATE
  USING (auth.uid() = (SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id));

DROP POLICY IF EXISTS "Users can delete products of their own devolutions." ON public.produtos_devolvidos;
CREATE POLICY "Users can delete products of their own devolutions."
  ON public.produtos_devolvidos FOR DELETE
  USING (auth.uid() = (SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id));


-- 6. STORAGE BUCKET AND POLICIES
-- Create a bucket for storing attachments.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('anexos_devolucoes', 'anexos_devolucoes', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif'];

-- Storage policies to allow users to manage files in their own folder.
-- Using auth.uid() to create user-specific folders.
DROP POLICY IF EXISTS "Users can upload attachments to their own folder." ON storage.objects;
CREATE POLICY "Users can upload attachments to their own folder."
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can view their own attachments." ON storage.objects;
CREATE POLICY "Users can view their own attachments."
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can update their own attachments." ON storage.objects;
CREATE POLICY "Users can update their own attachments."
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete their own attachments." ON storage.objects;
CREATE POLICY "Users can delete their own attachments."
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);
