-- FamilyReady — RPC functions, audit log, rate limiting and realtime.

-- ---------------------------------------------------------------------------
-- create_family: creates the family, the caller's admin membership and the
-- 1:1 configuration rows. SECURITY DEFINER because no client may insert
-- memberships directly.
-- ---------------------------------------------------------------------------
create or replace function public.create_family(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_family uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_name) not between 1 and 80 then
    raise exception 'invalid_family_name' using errcode = '22023';
  end if;
  if (select count(*) from public.family_members where user_id = v_user and role = 'admin') >= 5 then
    raise exception 'family_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.families (name, created_by) values (v_name, v_user) returning id into v_family;
  insert into public.family_members (family_id, user_id, role) values (v_family, v_user, 'admin');
  insert into public.household_profiles (family_id) values (v_family);
  insert into public.home_kits (family_id) values (v_family);
  insert into public.energy_profiles (family_id) values (v_family);
  insert into public.communication_plans (family_id) values (v_family);
  insert into public.reminders (family_id, kind, title, due_on, recurrence_months)
    values (v_family, 'quarterly_review', 'Revisão trimestral do plano e dos kits', (current_date + interval '3 months')::date, 3);
  return v_family;
end;
$$;

revoke all on function public.create_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
create or replace function private.hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

-- Minimal, non-sensitive preview shown on the invitation landing page.
create or replace function public.invitation_preview(p_token text)
returns table (family_name text, inviter_name text, role public.family_role, email text, expires_at timestamptz, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select f.name,
         split_part(coalesce(p.full_name, ''), ' ', 1),
         i.role,
         -- Only reveal the address shape, never the full email.
         left(i.email, 2) || '•••@' || split_part(i.email, '@', 2),
         i.expires_at,
         case
           when i.revoked_at is not null then 'revoked'
           when i.accepted_at is not null then 'accepted'
           when i.expires_at <= now() then 'expired'
           else 'pending'
         end
  from public.family_invitations i
  join public.families f on f.id = i.family_id
  left join public.profiles p on p.id = i.invited_by
  where char_length(coalesce(p_token, '')) between 32 and 128
    and i.token_hash = private.hash_token(p_token);
$$;

revoke all on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to anon, authenticated;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  v_inv public.family_invitations%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_inv
  from public.family_invitations
  where token_hash = private.hash_token(coalesce(p_token, ''))
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = v_user then
      return v_inv.family_id;
    end if;
    raise exception 'invitation_already_used' using errcode = 'P0001';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;
  -- The invitation is bound to the invited address: a forwarded link cannot be used by someone else.
  if v_inv.email <> v_email then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, role, invited_by)
  values (v_inv.family_id, v_user, v_inv.role, v_inv.invited_by)
  on conflict (family_id, user_id) do nothing;

  update public.family_invitations
     set accepted_at = now(), accepted_by = v_user
   where id = v_inv.id;

  return v_inv.family_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- Per-family invitation throttle, enforced in the database regardless of caller.
create or replace function private.throttle_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.family_invitations
      where family_id = new.family_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited: demasiados convites na última hora' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger family_invitations_throttle before insert on public.family_invitations
  for each row execute function private.throttle_invitations();

-- ---------------------------------------------------------------------------
-- complete_reminder: marks a review done and schedules the next occurrence.
-- SECURITY INVOKER: RLS applies to both statements.
-- ---------------------------------------------------------------------------
create or replace function public.complete_reminder(p_reminder_id uuid, p_completed_items text[] default '{}')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_r public.reminders%rowtype;
  v_next uuid;
begin
  update public.reminders
     set completed_at = now(), completed_by = (select auth.uid()), completed_items = coalesce(p_completed_items, '{}')
   where id = p_reminder_id and completed_at is null
  returning * into v_r;

  if not found then
    raise exception 'reminder_not_found' using errcode = 'P0002';
  end if;

  if v_r.recurrence_months is not null then
    insert into public.reminders (family_id, kind, title, due_on, recurrence_months)
    values (v_r.family_id, v_r.kind, v_r.title,
            (greatest(current_date, v_r.due_on) + make_interval(months => v_r.recurrence_months))::date,
            v_r.recurrence_months)
    returning id into v_next;
  end if;

  if v_r.kind = 'quarterly_review' then
    update public.home_kits set last_reviewed_at = now() where family_id = v_r.family_id;
  end if;
  return v_next;
end;
$$;

revoke all on function public.complete_reminder(uuid, text[]) from public, anon;
grant execute on function public.complete_reminder(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log — records who changed what (field names only, never values,
-- so no health data is ever copied into the log).
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  family_id       uuid not null references public.families (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete set null,
  table_name      text not null,
  record_id       text,
  action          text not null check (action in ('insert', 'update', 'delete')),
  changed_fields  text[],
  created_at      timestamptz not null default now()
);

create index audit_logs_family_idx on public.audit_logs (family_id, created_at desc);

alter table public.audit_logs enable row level security;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (private.has_family_role(family_id, 'member'));
-- No write policies: rows are written by the trigger below only.

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_family uuid;
  v_record text;
  v_fields text[];
begin
  v_family := case when tg_table_name = 'families' then (v_row ->> 'id')::uuid else (v_row ->> 'family_id')::uuid end;
  if v_family is null or not exists (select 1 from public.families where id = v_family) then
    return null; -- family being deleted (cascade) — nothing to record
  end if;

  v_record := coalesce(v_row ->> 'id', v_row ->> 'member_profile_id', v_row ->> 'user_id', v_row ->> 'family_id');

  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into v_fields
    from jsonb_each(v_new) n
    where key not in ('updated_at', 'updated_by')
      and n.value is distinct from (v_old -> key);
    if v_fields is null then
      return null; -- no meaningful change
    end if;
  end if;

  insert into public.audit_logs (family_id, actor_id, table_name, record_id, action, changed_fields)
  values (v_family, (select auth.uid()), tg_table_name, v_record, lower(tg_op), v_fields);
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'families', 'family_members', 'family_invitations', 'household_profiles', 'member_profiles', 'member_health',
    'pets', 'home_kits', 'home_kit_items', 'evacuation_bags', 'evacuation_bag_items', 'inventory_items',
    'shopping_list_items', 'energy_profiles', 'energy_devices', 'emergency_contacts', 'meeting_points',
    'communication_plans', 'emergency_plans', 'tasks', 'reminders'
  ] loop
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$I for each row execute function private.audit_row()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting for unauthenticated endpoints (magic-link requests).
-- Fixed window counter; callable only with the service role key from the server.
-- ---------------------------------------------------------------------------
create table private.rate_limits (
  key           text primary key,
  window_start  timestamptz not null,
  hits          integer not null
);

create or replace function public.consume_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into private.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
        window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning hits into v_hits;

  -- Opportunistic cleanup of stale windows.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime: shared, frequently-updated tables. RLS applies to subscriptions.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.home_kit_items, public.evacuation_bag_items, public.evacuation_bags, public.inventory_items,
      public.shopping_list_items, public.tasks, public.emergency_plans, public.meeting_points,
      public.member_profiles, public.family_members, public.home_kits, public.reminders;
  end if;
end;
$$;
