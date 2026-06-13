-- ===========================================================
--  D.STUDIO — client portal database schema
--  Run ONCE in Supabase → SQL Editor → New query → Run.
--  Safe to re-run (idempotent).
-- ===========================================================

-- ---------- 1. Profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text default '',
  email      text,
  role       text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Helper: is the current user an admin?
-- SECURITY DEFINER lets it read profiles without tripping RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles read"   on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles insert" on public.profiles;
create policy "profiles insert" on public.profiles for insert
  with check (id = auth.uid() or public.is_admin());

-- Auto-create a profile whenever a new auth user is added.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          new.email,
          'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. Projects ----------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  service_type text not null default 'graphics',   -- graphics | video | landing
  stage        smallint not null default 0 check (stage between 0 and 3),
  notes        text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.projects enable row level security;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop policy if exists "projects read"  on public.projects;
create policy "projects read" on public.projects for select
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "projects admin" on public.projects;
create policy "projects admin" on public.projects for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 3. Project files (binary lives in Storage) ----------
create table if not exists public.project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  kind         text not null default 'preview' check (kind in ('preview','final')),
  created_at   timestamptz default now()
);
alter table public.project_files enable row level security;

drop policy if exists "files read"  on public.project_files;
create policy "files read" on public.project_files for select
  using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "files admin" on public.project_files;
create policy "files admin" on public.project_files for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 4. Comments ----------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;

drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select
  using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "comments insert" on public.comments;
create policy "comments insert" on public.comments for insert
  with check (
    author_id = auth.uid() and (
      public.is_admin() or exists (
        select 1 from public.projects p
        where p.id = project_id and p.client_id = auth.uid()
      )
    )
  );

-- A view so the portal can show comment author name + role in one query.
create or replace view public.comments_with_author
with (security_invoker = true) as
  select c.*, pr.full_name as author_name, pr.role as author_role
  from public.comments c
  join public.profiles pr on pr.id = c.author_id;

-- ---------- 5. Storage bucket + policies ----------
-- Files are stored under  {project_id}/{filename}
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

drop policy if exists "storage read"   on storage.objects;
create policy "storage read" on storage.objects for select
  using (
    bucket_id = 'project-files' and (
      public.is_admin() or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.client_id = auth.uid()
      )
    )
  );

drop policy if exists "storage insert" on storage.objects;
create policy "storage insert" on storage.objects for insert
  with check (bucket_id = 'project-files' and public.is_admin());

drop policy if exists "storage update" on storage.objects;
create policy "storage update" on storage.objects for update
  using (bucket_id = 'project-files' and public.is_admin());

drop policy if exists "storage delete" on storage.objects;
create policy "storage delete" on storage.objects for delete
  using (bucket_id = 'project-files' and public.is_admin());

-- ===========================================================
--  AFTER running the above, make yourself an admin:
--  (replace the email with the account you created)
--
--    update public.profiles set role = 'admin'
--    where email = 'you@example.com';
-- ===========================================================
