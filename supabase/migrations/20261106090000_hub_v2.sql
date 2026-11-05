-- Dream Life Exit Hub v2: one private document and one shared document per client.
--
-- Privacy model (spec §11, §14):
--   client_private  -> vault metadata, checklist, dates, planner, journal, contacts, household.
--                      Only the client can read or write it. Coaches have NO policy here.
--   client_shared   -> the four-week plan and checklist totals. Client and coach can read and write.
--   storage 'vault' -> files under <client_id>/..., readable only by that client.
--
-- Run once in Supabase > SQL editor. Safe to run on the earlier schema: it removes the
-- old per-feature tables (they held no client data) and the coach's access to them.

-- 1. Remove the old tables, which let coaches read everything.
drop table if exists plan_steps, plan_weeks, tasks, task_templates, documents, important_dates,
  planner_entries, contacts_links, household_members, journeys cascade;
drop policy if exists vault_rw on storage.objects;

-- 2. Profiles: created automatically for every new sign-in user.
alter table profiles add column if not exists updated_at timestamptz default now();
alter table invites add column if not exists session_date date;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, session_date)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name',
          nullif(new.raw_user_meta_data->>'session_date', '')::date)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill any users that signed up before the trigger existed.
insert into profiles (id, email)
select id, email from auth.users on conflict (id) do nothing;

-- An invited client becomes active the first time they sign in. Paused stays paused.
create or replace function activate_self() returns void
language sql security definer set search_path = public as $$
  update profiles set access = 'active', updated_at = now()
  where id = auth.uid() and access = 'invited' and role = 'client';
$$;
grant execute on function activate_self() to authenticated;

-- Clients must not change their own role or access.
drop policy if exists p_read on profiles;
drop policy if exists p_coach on profiles;
create policy p_read on profiles for select using (id = auth.uid() or is_coach());
create policy p_coach on profiles for update using (is_coach()) with check (is_coach());

-- 3. Private client data: owner only.
create table if not exists client_private (
  client_id uuid primary key references profiles on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table client_private enable row level security;
drop policy if exists cp_owner on client_private;
create policy cp_owner on client_private for all
  using (client_id = auth.uid() and is_active_client())
  with check (client_id = auth.uid() and is_active_client());

-- 4. Shared with the coach: plan and checklist totals.
create table if not exists client_shared (
  client_id uuid primary key references profiles on delete cascade,
  plan jsonb,
  checklist_done int not null default 0,
  checklist_total int not null default 0,
  updated_at timestamptz default now()
);
alter table client_shared enable row level security;
drop policy if exists cs_owner on client_shared;
drop policy if exists cs_coach on client_shared;
create policy cs_owner on client_shared for all
  using (client_id = auth.uid() and is_active_client())
  with check (client_id = auth.uid() and is_active_client());
create policy cs_coach on client_shared for all using (is_coach()) with check (is_coach());

-- Live plan updates from coach to client.
do $$ begin
  alter publication supabase_realtime add table client_shared;
exception when duplicate_object then null; end $$;

-- 5. Vault files: the owning client only. No coach policy.
update storage.buckets set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png'] where id = 'vault';
drop policy if exists vault_owner on storage.objects;
create policy vault_owner on storage.objects for all
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text and is_active_client())
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text and is_active_client());
