/*
# [Function] Create RPC to ensure profile exists
Creates a security definer function that can be called from the client to safely create a user profile if one does not already exist. This is necessary to handle users who signed up before the automatic profile creation trigger was in place.

## Query Description:
- This operation creates a new function `ensure_profile_exists` in the `public` schema.
- The function is `SECURITY DEFINER`, meaning it runs with the privileges of the user who created it (the database owner), allowing it to bypass Row-Level Security policies.
- It performs an `UPSERT` operation on the `public.profiles` table. It attempts to `INSERT` a new profile for the currently authenticated user (`auth.uid()`).
- If a profile for that user ID already exists, the `ON CONFLICT (id) DO NOTHING` clause ensures that no action is taken and no error is thrown.
- This makes the function safe to call every time a user logs in.

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (the function can be dropped)

## Structure Details:
- Function Created: `public.ensure_profile_exists()`

## Security Implications:
- RLS Status: The function is designed to work with RLS by safely creating the necessary profile row.
- Policy Changes: No
- Auth Requirements: The function uses `auth.uid()` and `auth.email()`, so it must be called by an authenticated user.
*/
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (auth.uid(), auth.email())
  ON CONFLICT (id) DO NOTHING;
END;
$$;
