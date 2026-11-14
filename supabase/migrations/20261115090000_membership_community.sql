-- Paid membership, members' library and community.
--
--   profiles.membership   -> set ONLY by the Stripe webhook (server, secret key). Clients can't change it.
--   library_items         -> titles and teasers: every signed-in user sees them (the "shop window").
--   library_content       -> the actual content: free items for everyone, locked items for members only.
--   storage 'library'     -> files under <item_id>/..., same rule as library_content.
--   posts / comments / reactions -> members (and the coach) only. Kept apart from each client's private Hub.

-- 1. Membership on profiles
alter table profiles add column if not exists membership text not null default 'none'
  check (membership in ('none','trialing','active','past_due','canceled'));
alter table profiles add column if not exists stripe_customer_id text unique;
alter table profiles add column if not exists membership_renews_at timestamptz;

create or replace function is_member() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and (role = 'coach' or (access = 'active' and membership in ('active','trialing')))
  )
$$;
grant execute on function is_member() to authenticated;

-- 2. Library
create table if not exists library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  kind text not null default 'lesson' check (kind in ('lesson','video','worksheet','replay','course')),
  category text not null default '',
  locked boolean not null default true,
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz default now()
);
alter table library_items enable row level security;
drop policy if exists li_read on library_items;
drop policy if exists li_coach on library_items;
create policy li_read on library_items for select using (auth.uid() is not null and (published or is_coach()));
create policy li_coach on library_items for all using (is_coach()) with check (is_coach());

create table if not exists library_content (
  item_id uuid primary key references library_items on delete cascade,
  body text not null default '',
  video_url text not null default '',
  file_path text,
  file_name text
);
alter table library_content enable row level security;
drop policy if exists lc_read on library_content;
drop policy if exists lc_coach on library_content;
create policy lc_read on library_content for select using (
  exists (select 1 from library_items i where i.id = item_id
          and (is_coach() or (i.published and (not i.locked or is_member())))));
create policy lc_coach on library_content for all using (is_coach()) with check (is_coach());

insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 52428800) on conflict (id) do nothing;
drop policy if exists library_read on storage.objects;
drop policy if exists library_coach on storage.objects;
create policy library_read on storage.objects for select using (
  bucket_id = 'library' and exists (
    select 1 from library_items i where i.id::text = (storage.foldername(name))[1]
      and (is_coach() or (i.published and (not i.locked or is_member())))));
create policy library_coach on storage.objects for all
  using (bucket_id = 'library' and is_coach()) with check (bucket_id = 'library' and is_coach());

-- 3. Community
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  author_name text not null default 'Member',
  author_role text not null default 'client',
  body text not null check (char_length(body) between 1 and 5000),
  pinned boolean not null default false,
  created_at timestamptz default now(),
  edited_at timestamptz
);
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  author_name text not null default 'Member',
  author_role text not null default 'client',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now()
);
create table if not exists post_reactions (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  emoji text not null check (emoji in ('heart','clap','sparkle')),
  primary key (post_id, user_id, emoji)
);
create index if not exists post_comments_post on post_comments (post_id);

-- Authors are always the signed-in user, shown by first name only. Only the coach can pin.
create or replace function stamp_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.author_name := coalesce(nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''), 'Member');
    new.author_role := coalesce(p.role::text, 'client');
    if tg_table_name = 'posts' and coalesce(p.role::text, '') <> 'coach' then new.pinned := false; end if;
  else
    new.author_id := old.author_id; new.author_name := old.author_name; new.author_role := old.author_role;
    if tg_table_name = 'posts' then
      if coalesce(p.role::text, '') <> 'coach' then new.pinned := old.pinned; end if;
      if new.body is distinct from old.body then new.edited_at := now(); end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists posts_author on posts;
create trigger posts_author before insert or update on posts for each row execute function stamp_author();
drop trigger if exists comments_author on post_comments;
create trigger comments_author before insert or update on post_comments for each row execute function stamp_author();

alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_reactions enable row level security;
drop policy if exists posts_read on posts;
drop policy if exists posts_add on posts;
drop policy if exists posts_edit on posts;
drop policy if exists posts_remove on posts;
create policy posts_read on posts for select using (is_member());
create policy posts_add on posts for insert with check (is_member());
create policy posts_edit on posts for update using (is_member() and (author_id = auth.uid() or is_coach()));
create policy posts_remove on posts for delete using (author_id = auth.uid() or is_coach());
drop policy if exists comments_read on post_comments;
drop policy if exists comments_add on post_comments;
drop policy if exists comments_remove on post_comments;
create policy comments_read on post_comments for select using (is_member());
create policy comments_add on post_comments for insert with check (is_member());
create policy comments_remove on post_comments for delete using (author_id = auth.uid() or is_coach());
drop policy if exists reactions_read on post_reactions;
drop policy if exists reactions_add on post_reactions;
drop policy if exists reactions_remove on post_reactions;
create policy reactions_read on post_reactions for select using (is_member());
create policy reactions_add on post_reactions for insert with check (is_member() and user_id = auth.uid());
create policy reactions_remove on post_reactions for delete using (user_id = auth.uid());

do $$ begin alter publication supabase_realtime add table posts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table post_comments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table post_reactions; exception when duplicate_object then null; end $$;
