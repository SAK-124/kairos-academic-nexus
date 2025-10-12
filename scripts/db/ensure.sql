-- Ensure baseline extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  is_admin boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'read own profile'
  ) then
    create policy "read own profile" on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'update own profile'
  ) then
    create policy "update own profile" on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;

-- App roles enum
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role'
      and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('admin', 'user');
  end if;
end
$$;

-- User roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'read own roles'
  ) then
    create policy "read own roles" on public.user_roles
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'admins manage roles'
  ) then
    create policy "admins manage roles" on public.user_roles
      for all to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and coalesce(p.is_admin, false)
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and coalesce(p.is_admin, false)
        )
      );
  end if;
end
$$;

-- Content sections
create table if not exists public.content_sections (
  id uuid primary key default gen_random_uuid(),
  section_name text not null unique,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);
alter table public.content_sections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_sections'
      and policyname = 'public read content sections'
  ) then
    create policy "public read content sections" on public.content_sections
      for select to public using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_sections'
      and policyname = 'admins manage content sections'
  ) then
    create policy "admins manage content sections" on public.content_sections
      for all to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and coalesce(p.is_admin, false)
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and coalesce(p.is_admin, false)
        )
      );
  end if;
end
$$;

-- Button mappings
create table if not exists public.button_mappings (
  id uuid primary key default gen_random_uuid(),
  button_id text not null unique,
  text text not null,
  hover_text text,
  route text,
  enabled boolean default true,
  updated_at timestamptz default now()
);
alter table public.button_mappings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'button_mappings'
      and policyname = 'public read button mappings'
  ) then
    create policy "public read button mappings" on public.button_mappings
      for select to public using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'button_mappings'
      and policyname = 'admins manage button mappings'
  ) then
    create policy "admins manage button mappings" on public.button_mappings
      for all to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      );
  end if;
end
$$;

-- Animation settings
create table if not exists public.animation_settings (
  id uuid primary key default gen_random_uuid(),
  setting_name text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.animation_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'animation_settings'
      and policyname = 'public read animation settings'
  ) then
    create policy "public read animation settings" on public.animation_settings
      for select to public using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'animation_settings'
      and policyname = 'admins manage animation settings'
  ) then
    create policy "admins manage animation settings" on public.animation_settings
      for all to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      );
  end if;
end
$$;

-- Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.courses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'users manage own courses'
  ) then
    create policy "users manage own courses" on public.courses
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Folders
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  parent_id uuid references public.folders(id) on delete set null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.folders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'folders'
      and policyname = 'users manage own folders'
  ) then
    create policy "users manage own folders" on public.folders
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  plain_text text,
  plain_text_search tsvector,
  tags text[] default array[]::text[],
  character_count integer,
  word_count integer,
  is_archived boolean default false,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_edited_at timestamptz
);
alter table public.notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'users manage own notes'
  ) then
    create policy "users manage own notes" on public.notes
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- AI interactions
create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.notes(id) on delete set null,
  interaction_type text not null,
  prompt text not null,
  response text not null,
  model text,
  tokens_used integer,
  created_at timestamptz default now()
);
alter table public.ai_interactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_interactions'
      and policyname = 'users manage own ai interactions'
  ) then
    create policy "users manage own ai interactions" on public.ai_interactions
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Study materials
create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  last_reviewed_at timestamptz,
  created_at timestamptz default now()
);
alter table public.study_materials enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_materials'
      and policyname = 'users manage own study materials'
  ) then
    create policy "users manage own study materials" on public.study_materials
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Contact submissions
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  resolved boolean default false,
  created_at timestamptz default now()
);
alter table public.contact_submissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_submissions'
      and policyname = 'public create contact submissions'
  ) then
    create policy "public create contact submissions" on public.contact_submissions
      for insert to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_submissions'
      and policyname = 'admins review contact submissions'
  ) then
    create policy "admins review contact submissions" on public.contact_submissions
      for select using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_submissions'
      and policyname = 'admins update contact submissions'
  ) then
    create policy "admins update contact submissions" on public.contact_submissions
      for update to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      );
  end if;
end
$$;

-- Early access signups
create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  created_at timestamptz default now()
);
alter table public.early_access_signups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'early_access_signups'
      and policyname = 'public join waitlist'
  ) then
    create policy "public join waitlist" on public.early_access_signups
      for insert to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'early_access_signups'
      and policyname = 'admins read waitlist'
  ) then
    create policy "admins read waitlist" on public.early_access_signups
      for select to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and coalesce(p.is_admin, false)
        )
      );
  end if;
end
$$;

-- Helper to check admin role from SQL
create or replace function public.has_role(_role public.app_role, _user_id uuid)
returns boolean
language sql
stable
as
$$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
  );
$$;
