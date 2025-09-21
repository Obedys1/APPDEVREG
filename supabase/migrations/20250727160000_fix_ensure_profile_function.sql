/*
# [Function] `ensure_profile_exists` (Corrected)
[This script replaces the existing function with a corrected version. The previous version had a bug in retrieving the user's email, causing profile creation to fail silently. This version fixes that, ensuring profiles are created reliably for all users.]

## Query Description: "This operation updates a server-side function to fix a critical bug in user profile creation. It is safe to run and will resolve the foreign key violation errors. No backup is required."

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true] (by deploying a previous version of the function)

## Structure Details:
- Replaces a function: `public.ensure_profile_exists()`
- The function correctly inserts into: `public.profiles` by sourcing the email from the correct column.

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [Uses the calling user's ID]

## Performance Impact:
- Indexes: [N/A]
- Triggers: [N/A]
- Estimated Impact: [Negligible. Runs only on login/session refresh.]
*/

-- Drop the old function if it exists to ensure a clean replacement
DROP FUNCTION IF EXISTS public.ensure_profile_exists();

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function owner, bypassing RLS for the insert
AS $$
BEGIN
  -- Check if a profile already exists for the currently authenticated user
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    -- Insert a new profile record, getting the email from the correct `email` column in `auth.users`
    INSERT INTO public.profiles (id, email)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
END;
$$;
