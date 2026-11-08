-- FamilyReady — core identity, families, memberships and invitations.
--
-- Security model (see docs/ARCHITECTURE.md §5):
--   * Every family-owned row carries family_id.
--   * Access is decided by the caller's role in that family:
--       viewer < member < editor < admin   (enum order matters — do not reorder)
--   * Helper functions live in the `private` schema, are SECURITY DEFINER and
--     have an empty search_path so they cannot be hijacked and are not exposed
--     through PostgREST.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.family_role as enum ('viewer', 'member', 'editor', 'admin');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (spec: "users")
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  locale      text not null default 'pt-PT' check (locale in ('pt-PT', 'en', 'es', 'fr')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create the profile automatically from the sign-up metadata.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if v_name is null then
    v_name := split_part(coalesce(new.email, 'Utilizador'), '@', 1);
  end if;
  insert into public.profiles (id, full_name)
  values (new.id, left(v_name, 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------
create table public.families (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (char_length(name) between 1 and 80),
  created_by               uuid references public.profiles (id) on delete set null,
  country                  text not null default 'PT' check (country ~ '^[A-Z]{2}$'),
  currency                 text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  budget_cents             integer check (budget_cents is null or budget_cents between 0 and 100000000),
  onboarding_step          text not null default 'members',
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger families_updated_at before update on public.families
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- family_members: account memberships (who can access the family)
-- Household *persons* (incl. children without accounts) live in member_profiles.
-- ---------------------------------------------------------------------------
create table public.family_members (
  family_id   uuid not null references public.families (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.family_role not null default 'member',
  invited_by  uuid references public.profiles (id) on delete set null,
  joined_at   timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_members_user_idx on public.family_members (user_id);

-- ---------------------------------------------------------------------------
-- Role helpers (used by every RLS policy)
-- ---------------------------------------------------------------------------
create or replace function private.family_role(p_family_id uuid)
returns public.family_role
language sql
stable
security definer
set search_path = ''
as $$
  select fm.role
  from public.family_members fm
  where fm.family_id = p_family_id
    and fm.user_id = (select auth.uid());
$$;

create or replace function private.has_family_role(p_family_id uuid, p_min public.family_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.family_role(p_family_id) >= p_min, false);
$$;

grant execute on function private.family_role(uuid) to authenticated;
grant execute on function private.has_family_role(uuid, public.family_role) to authenticated;

-- Guard: a family must always keep at least one admin while it has members.
create or replace function private.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining_admins integer;
  v_remaining_members integer;
begin
  if old.role <> 'admin' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.role = 'admin' then
    return new;
  end if;
  -- Family itself is being deleted (cascade): nothing to protect.
  if not exists (select 1 from public.families f where f.id = old.family_id) then
    return coalesce(new, old);
  end if;

  select count(*) filter (where role = 'admin'), count(*)
    into v_remaining_admins, v_remaining_members
  from public.family_members
  where family_id = old.family_id
    and user_id <> old.user_id;

  if v_remaining_admins = 0 and v_remaining_members > 0 then
    raise exception 'last_admin: promova outro membro a administrador antes de sair ou alterar a função'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger family_members_guard_last_admin
  before update or delete on public.family_members
  for each row execute function private.guard_last_admin();

-- Garbage-collect families that no longer have any account attached.
create or replace function private.delete_orphan_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.family_members where family_id = old.family_id) then
    delete from public.families where id = old.family_id;
  end if;
  return null;
end;
$$;

create trigger family_members_delete_orphan
  after delete on public.family_members
  for each row execute function private.delete_orphan_family();

-- ---------------------------------------------------------------------------
-- family_invitations
-- The raw token is never stored: only its SHA-256 hex digest.
-- ---------------------------------------------------------------------------
create table public.family_invitations (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  email        text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         public.family_role not null default 'editor',
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by   uuid references public.profiles (id) on delete set null,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id) on delete set null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  check (expires_at > created_at)
);

create index family_invitations_family_idx on public.family_invitations (family_id, created_at desc);
create unique index family_invitations_one_pending
  on public.family_invitations (family_id, email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- RLS — profiles / families / memberships / invitations
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;

-- A user sees their own profile and the profiles of people they share a family with.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.family_members mine
      join public.family_members theirs on theirs.family_id = mine.family_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy families_select on public.families for select to authenticated
  using (private.has_family_role(id, 'viewer'));
create policy families_update on public.families for update to authenticated
  using (private.has_family_role(id, 'editor')) with check (private.has_family_role(id, 'editor'));
create policy families_delete on public.families for delete to authenticated
  using (private.has_family_role(id, 'admin'));
-- No INSERT policy: families are created through public.create_family().

create policy family_members_select on public.family_members for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy family_members_update on public.family_members for update to authenticated
  using (private.has_family_role(family_id, 'admin'))
  with check (private.has_family_role(family_id, 'admin'));
-- Admins remove anyone; any user may leave (delete own membership).
create policy family_members_delete on public.family_members for delete to authenticated
  using (user_id = (select auth.uid()) or private.has_family_role(family_id, 'admin'));
-- No INSERT policy: memberships are created by create_family() / accept_invitation().

create policy invitations_select on public.family_invitations for select to authenticated
  using (private.has_family_role(family_id, 'admin'));
create policy invitations_insert on public.family_invitations for insert to authenticated
  with check (
    private.has_family_role(family_id, 'admin')
    and invited_by = (select auth.uid())
    and accepted_at is null and revoked_at is null
    and expires_at <= now() + interval '14 days'
  );
create policy invitations_update on public.family_invitations for update to authenticated
  using (private.has_family_role(family_id, 'admin'))
  with check (private.has_family_role(family_id, 'admin'));
create policy invitations_delete on public.family_invitations for delete to authenticated
  using (private.has_family_role(family_id, 'admin'));

-- Invitation rows may only be revoked by clients; acceptance happens in accept_invitation().
create or replace function private.guard_invitation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- SECURITY DEFINER functions (accept_invitation) run as the owner, not as a client role.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.token_hash <> old.token_hash or new.email <> old.email or new.family_id <> old.family_id
     or new.accepted_at is distinct from old.accepted_at
     or new.accepted_by is distinct from old.accepted_by then
    raise exception 'invitation_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger family_invitations_guard before update on public.family_invitations
  for each row execute function private.guard_invitation_update();
