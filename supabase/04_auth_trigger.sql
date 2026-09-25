-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- New auth.users row -> profiles row with role='customer' by default.
-- Staff accounts (production, packing, delivery, admin, etc.) are created
-- by Admin from /admin/users, which inserts into profiles directly with
-- the correct role after creating the auth user via the Supabase Admin API
-- (service role key, server-side only).
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, mobile, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New Customer'),
    new.raw_user_meta_data ->> 'mobile',
    new.email,
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
