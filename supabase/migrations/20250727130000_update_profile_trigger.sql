/*
# [Operation Name]
Create or Update Trigger for Automatic Profile Creation

## Query Description: [This script automates the creation of a user profile whenever a new user signs up. It creates a function (`handle_new_user`) that inserts a new record into the `public.profiles` table, and a trigger (`on_auth_user_created`) that calls this function after a new user is added to the `auth.users` table. This is a safe and standard Supabase pattern that ensures data integrity between authentication and public user data. The script is idempotent, meaning it can be run multiple times without causing errors as it cleans up previous versions before creating new ones.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Creates/Replaces function: `public.handle_new_user()`
- Creates/Replaces trigger: `on_auth_user_created` on table `auth.users`

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [None for execution, but affects new user signup flow]
- The function uses `SECURITY DEFINER` to safely bypass RLS for the single purpose of creating a profile, which is a secure and recommended practice.

## Performance Impact:
- Indexes: [None]
- Triggers: [Added/Replaced]
- Estimated Impact: [Negligible. This trigger adds a very small overhead to the user signup process, which is a one-time event per user.]
*/

-- Drop the existing trigger and function if they exist, to ensure a clean setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function to handle new user creation
-- This function will be called by the trigger whenever a new user is created in the auth.users table.
-- It runs with the permissions of the definer (SECURITY DEFINER), which allows it to insert into the profiles table
-- even if the new user themselves doesn't have insert permissions yet.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert a new row into the public.profiles table, linking it to the new user.
  -- It copies the user's ID and email from the auth.users table.
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Create the trigger that fires after a new user is inserted into auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
