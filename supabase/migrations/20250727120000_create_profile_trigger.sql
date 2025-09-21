/*
# [Create Profile on New User Trigger]
This migration automates the creation of a user profile in the `public.profiles` table whenever a new user is created in the `auth.users` table.

## Query Description: [This operation creates a new function and a trigger. It ensures that every new user in the authentication system automatically gets a corresponding profile entry, which is essential for the application to function correctly. This is a safe, structural change and does not affect existing data.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Creates function: `public.handle_new_user()`
- Creates trigger: `on_auth_user_created` on table `auth.users`

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No] - This complements existing RLS policies by ensuring profile rows exist for users.
- Auth Requirements: [The trigger runs with the permissions of the user who defines it, typically a superuser.]

## Performance Impact:
- Indexes: [None]
- Triggers: [Added] - A new trigger is added to `auth.users`. The performance impact is negligible as it's a simple insert operation that runs once per user creation.
- Estimated Impact: [Low]
*/

-- Function to create a profile for a new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Trigger to call the function when a new user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
