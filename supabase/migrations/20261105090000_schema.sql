-- Dream Life Exit Hub: core schema, row level security and private vault bucket.
create type app_role as enum ('client','coach');
create type access_status as enum ('invited','active','paused');
create type task_status as enum ('not_started','in_progress','completed','not_applicable');
create type task_priority as enum ('high','medium','low');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role app_role not null default 'client',
  full_name text,
  email text,
  access access_status not null default 'invited',
  session_date date,
  created_at timestamptz default now()
);

create table journeys (
  client_id uuid primary key references profiles on delete cascade,
  destination text,
  destination_chosen boolean default false,
  move_date date,
  household_note text,
  focus_categories text[] default '{}',
  plan_week int default 1 check (plan_week between 1 and 4),
  updated_at timestamptz default now()
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles on delete cascade,
  name text not null,
  relationship text,
  birth_date date
);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  priority task_priority default 'medium',
  sort int default 0
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles on delete cascade,
  template_id uuid references task_templates,
  category text not null,
  title text not null,
  priority task_priority default 'medium',
  status task_status default 'not_started',
  due_date date,
  note text,
  assignee text,
  is_custom boolean default false,
  sort int default 0,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table plan_weeks (
  client_id uuid references profiles on delete cascade,
  week int check (week between 1 and 4),
  title text,
  intro text,
  milestone text,
  reflection text,
  coach_note text,
  primary key (client_id, week)
);

create table plan_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles on delete cascade,
  week int not null check (week between 1 and 4),
  title text not null,
  done boolean default false,
  sort int default 0
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles on delete cascade,
  title text not null,
  category text,
  storage_path text not null,
  mime text,
  size_bytes bigint,
  uploaded_at timestamptz default now()
);

create table important_dates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles on delete cascade,
  title text not null,
  category text,
  due_date date not null,
  remind_days_before int default 7,
  reminded_at timestamptz,
  note text
);

create table planner_entries (
  client_id uuid primary key references profiles on delete cascade,
  vision text,
  core_values text[] default '{}',
  reflections jsonb default '[]',
  updated_at timestamptz default now()
);

-- client_id null = shared by the coach with everyone
create table contacts_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references profiles on delete cascade,
  kind text check (kind in ('contact','link')),
  title text not null,
  url text,
  phone text,
  email text,
  category text,
  note text
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  token text unique not null default encode(gen_random_bytes(24),'hex'),
  claimed_by uuid references profiles,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '14 days'
);

-- Helpers
create function is_coach() returns boolean language sql security definer stable as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'coach') $$;

create function is_active_client() returns boolean language sql security definer stable as
$$ select exists(select 1 from profiles where id = auth.uid() and access = 'active') $$;

-- Row level security
alter table profiles enable row level security;
create policy p_read on profiles for select using (id = auth.uid() or is_coach());
create policy p_coach on profiles for all using (is_coach()) with check (is_coach());

do $$
declare t text;
begin
  foreach t in array array['journeys','household_members','tasks','plan_weeks','plan_steps',
    'documents','important_dates','planner_entries'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy own_rw on %I for all using (client_id = auth.uid() and is_active_client()) with check (client_id = auth.uid() and is_active_client())', t);
    execute format('create policy coach_all on %I for all using (is_coach()) with check (is_coach())', t);
  end loop;
end $$;

alter table task_templates enable row level security;
create policy tt_read on task_templates for select using (auth.uid() is not null);
create policy tt_coach on task_templates for all using (is_coach()) with check (is_coach());

alter table contacts_links enable row level security;
create policy cl_read on contacts_links for select using (client_id is null or client_id = auth.uid());
create policy cl_own on contacts_links for all using (client_id = auth.uid() and is_active_client()) with check (client_id = auth.uid() and is_active_client());
create policy cl_coach on contacts_links for all using (is_coach()) with check (is_coach());

alter table invites enable row level security;
create policy inv_coach on invites for all using (is_coach()) with check (is_coach());

-- Private vault bucket: files live under <client_id>/...
insert into storage.buckets (id, name, public) values ('vault','vault',false) on conflict do nothing;
create policy vault_rw on storage.objects for all
  using (bucket_id = 'vault' and (((storage.foldername(name))[1] = auth.uid()::text and is_active_client()) or is_coach()))
  with check (bucket_id = 'vault' and (((storage.foldername(name))[1] = auth.uid()::text and is_active_client()) or is_coach()));
