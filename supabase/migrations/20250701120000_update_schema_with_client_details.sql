/*
# [GDM Devoluções - Schema Update with Client Details]
This script resets and creates the complete database schema, including new fields for client details.

## Query Description:
- Drops existing tables, functions, and policies to ensure a clean setup.
- Adds `vendedor`, `rede`, `cidade`, and `uf` columns to the `devolucoes` table.
- Recreates all tables, triggers, Row Level Security (RLS) policies, and Storage policies.
This is a foundational script. It will remove existing data in the tables to apply the new structure.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High" (as it drops and recreates tables)
- Requires-Backup: true (if you have existing data you want to keep)
- Reversible: false (without a backup)

## Structure Details:
- Tables Modified: public.devolucoes (added 4 columns)
- All other structures are recreated.

## Security Implications:
- RLS is re-enabled on all tables with the correct policies.

## Performance Impact:
- Low.
*/

-- 1. CLEANUP PHASE
-- Drop existing objects in reverse order of dependency to avoid errors.
DROP POLICY IF EXISTS "Users can delete their own attachments." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments." ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own attachments." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments to their own folder." ON storage.objects;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.produtos_devolvidos;
DROP TABLE IF EXISTS public.devolucoes;
DROP TABLE IF EXISTS public.profiles;


-- 2. PROFILES TABLE
-- Stores public user data, linked to the authentication system.
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';


-- 3. TRIGGER TO CREATE PROFILE ON NEW USER SIGN-UP
-- This function is called by a trigger when a new user is created in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger that executes the function above.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. DEVOLUCOES (RETURNS) TABLE -- UPDATED
-- Main table to store each return event.
CREATE TABLE public.devolucoes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cliente TEXT NOT NULL,
  vendedor TEXT,
  rede TEXT,
  cidade TEXT,
  uf TEXT,
  motorista TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  anexos_urls TEXT[]
);
COMMENT ON TABLE public.devolucoes IS 'Main table for devolution records with client details.';


-- 5. PRODUTOS_DEVOLVIDOS (RETURNED PRODUCTS) TABLE
-- Stores each product associated with a return.
CREATE TABLE public.produtos_devolvidos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  devolution_id BIGINT NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
  codigo TEXT,
  produto TEXT,
  familia TEXT NOT NULL,
  grupo TEXT,
  quantidade NUMERIC NOT NULL,
  tipo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  estado TEXT,
  reincidencia TEXT NOT NULL
);
COMMENT ON TABLE public.produtos_devolvidos IS 'Stores individual products for each devolution.';


-- 6. ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables to enforce data privacy.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_devolvidos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for `profiles`
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for `devolucoes`
CREATE POLICY "Users can view their own devolutions."
  ON public.devolucoes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own devolutions."
  ON public.devolucoes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own devolutions."
  ON public.devolucoes FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own devolutions."
  ON public.devolucoes FOR DELETE
  USING (auth.uid() = usuario_id);

-- RLS Policies for `produtos_devolvidos`
CREATE POLICY "Users can view products of their own devolutions."
  ON public.produtos_devolvidos FOR SELECT
  USING (
    auth.uid() = (
      SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id
    )
  );

CREATE POLICY "Users can insert products for their own devolutions."
  ON public.produtos_devolvidos FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id
    )
  );

CREATE POLICY "Users can update products of their own devolutions."
  ON public.produtos_devolvidos FOR UPDATE
  USING (
    auth.uid() = (
      SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id
    )
  );

CREATE POLICY "Users can delete products of their own devolutions."
  ON public.produtos_devolvidos FOR DELETE
  USING (
    auth.uid() = (
      SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id
    )
  );


-- 7. STORAGE BUCKET AND POLICIES
-- Create a bucket for storing attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos_devolucoes', 'anexos_devolucoes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies to allow users to manage files in their own folder.
CREATE POLICY "Users can upload attachments to their own folder."
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can view their own attachments."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can update their own attachments."
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can delete their own attachments."
  ON storage.objects FOR DELETE
  USING (bucket_id = 'anexos_devolucoes' AND (storage.foldername(name))[1] = (auth.uid())::text);
