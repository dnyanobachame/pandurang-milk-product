-- ============================================================================
-- SECURITY FIX — prevent customers from escalating their own privileges
-- Run this in the Supabase SQL editor (production DB).
--
-- PROBLEM: "profiles_update_own" allows any user to UPDATE their own row
-- with no restriction on WHICH columns change. Since RLS `USING` only
-- gates which ROWS a policy applies to (not which columns), a customer
-- could currently run:
--   update profiles set role = 'admin' where id = auth.uid();
-- and it would succeed.
--
-- FIX: a BEFORE UPDATE trigger (approach #3 from the request) that
-- silently pins protected columns back to their existing DB value unless
-- the request is coming from an admin. This is more robust than a RLS
-- WITH CHECK clause alone, because it can't be bypassed by any future
-- policy that also grants UPDATE on profiles.
-- ============================================================================

create or replace function protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_role app_role;
begin
  -- Look up the role of whoever is making this request (not the row
  -- being edited) directly from auth.uid(), bypassing RLS via
  -- security definer.
  select role into acting_role from profiles where id = auth.uid();

  if acting_role is distinct from 'admin' then
    -- Not an admin: force every privileged column back to its current
    -- stored value, no matter what the UPDATE statement tried to set.
    new.role := old.role;
    new.is_active := old.is_active;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    -- updated_by may legitimately be set by an admin acting on someone
    -- else's row; for a self-edit by a non-admin, pin it to null/self.
    new.updated_by := old.updated_by;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on profiles;

create trigger trg_protect_profile_privileged_columns
  before update on profiles
  for each row execute function protect_profile_privileged_columns();

-- ----------------------------------------------------------------------------
-- Defense in depth: tighten the RLS policy itself too, so the *documented*
-- contract of "profiles_update_own" matches what it should allow (a
-- customer only ever edits their own row, never someone else's) even
-- though the trigger above is what actually stops column-level abuse.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_update_own" on profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Verification queries — run these as a normal (non-admin) authenticated
-- user afterwards. All three should either fail outright or silently no-op
-- the protected column while still allowing safe fields (full_name,
-- mobile, avatar_url) through.
-- ----------------------------------------------------------------------------
-- update profiles set role = 'admin' where id = auth.uid();          -- blocked
-- update profiles set is_active = false where id = auth.uid();       -- blocked
-- update profiles set full_name = 'New Name' where id = auth.uid();  -- allowed
