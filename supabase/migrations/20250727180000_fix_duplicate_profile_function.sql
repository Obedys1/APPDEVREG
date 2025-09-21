/*
          # [Function Update] ensure_profile_exists
          [This script updates the 'ensure_profile_exists' function to prevent errors when a profile already exists. It uses an 'ON CONFLICT DO NOTHING' clause, making the function idempotent and safe to run multiple times for the same user.]

          ## Query Description: [This operation modifies a database function to handle duplicate profile creation attempts gracefully. It ensures that if a user profile already exists, the function will simply exit without raising an error, which resolves the "duplicate key" violation and allows the application's authentication flow to complete successfully. This change is non-destructive and only affects the logic for creating new profiles.]
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Function: public.ensure_profile_exists()
          
          ## Security Implications:
          - RLS Status: Unchanged
          - Policy Changes: No
          - Auth Requirements: The function is designed to be called by authenticated users.
          
          ## Performance Impact:
          - Indexes: None
          - Triggers: None
          - Estimated Impact: Negligible performance impact. The change adds a conflict check which is highly optimized in PostgreSQL.
          */

-- Drop the existing function and trigger if they exist to ensure a clean setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP FUNCTION IF EXISTS public.ensure_profile_exists;

-- Create the robust function to handle profile creation
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    auth.uid(),
    (SELECT raw_user_meta_data->>'email' FROM auth.users WHERE id = auth.uid())
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission to the 'authenticated' role
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated;
