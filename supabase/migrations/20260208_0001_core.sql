-- Core owned backend schema bootstrap for Steelbuilder Pro.
-- Keep this minimal and additive; expand in follow-up migrations.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text default 'user',
  custom_role text,
  phone text,
  title text,
  department text,
  notification_preferences jsonb default '{}'::jsonb,
  display_preferences jsonb default '{}'::jsonb,
  workflow_preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_number text unique,
  name text not null,
  client text,
  status text default 'bidding',
  phase text default 'detailing',
  project_manager text,
  superintendent text,
  assigned_users text[] default '{}',
  location text,
  contract_value numeric,
  start_date date,
  target_completion date,
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);
create index if not exists idx_projects_project_manager on public.projects(project_manager);
create index if not exists idx_projects_assigned_users_gin on public.projects using gin (assigned_users);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- Profiles: users can see/update themselves.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Projects: broad authenticated access initially; tighten per-role later.
drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "projects_insert_authenticated" on public.projects;
create policy "projects_insert_authenticated"
on public.projects
for insert
to authenticated
with check (true);

drop policy if exists "projects_update_authenticated" on public.projects;
create policy "projects_update_authenticated"
on public.projects
for update
to authenticated
using (true)
with check (true);

drop policy if exists "projects_delete_authenticated" on public.projects;
create policy "projects_delete_authenticated"
on public.projects
for delete
to authenticated
using (true);
