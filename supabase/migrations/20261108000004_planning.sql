-- FamilyReady — family emergency plan: contacts, communication plan, meeting
-- points, per-scenario plans, tasks and reminders.

-- ---------------------------------------------------------------------------
-- emergency_contacts (people/organisations outside the account system)
-- ---------------------------------------------------------------------------
create table public.emergency_contacts (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 80),
  relationship      text check (relationship is null or char_length(relationship) <= 60),
  phone             text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,20}$'),
  phone_alt         text check (phone_alt is null or phone_alt ~ '^\+?[0-9 ()-]{6,20}$'),
  email             text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  region            text check (region is null or char_length(region) <= 80),
  is_out_of_region  boolean not null default false,
  notes             text check (notes is null or char_length(notes) <= 300),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (family_id, id),
  check (phone is not null or phone_alt is not null or email is not null)
);

create index emergency_contacts_family_idx on public.emergency_contacts (family_id);
create trigger emergency_contacts_updated_at before update on public.emergency_contacts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- meeting_points
-- ---------------------------------------------------------------------------
create table public.meeting_points (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references public.families (id) on delete cascade,
  kind                 text not null check (kind in ('near_home', 'out_of_area', 'alternative')),
  name                 text not null check (char_length(name) between 1 and 80),
  address              text check (address is null or char_length(address) <= 200),
  latitude             numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude            numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  description          text check (description is null or char_length(description) <= 500),
  access_instructions  text check (access_instructions is null or char_length(access_instructions) <= 500),
  scenario_keys        text[] not null default '{}',
  sort_order           smallint not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (family_id, id),
  check ((latitude is null) = (longitude is null))
);

create index meeting_points_family_idx on public.meeting_points (family_id, sort_order);
create trigger meeting_points_updated_at before update on public.meeting_points
  for each row execute function private.set_updated_at();

create table public.meeting_point_responsibles (
  meeting_point_id   uuid not null,
  member_profile_id  uuid not null,
  family_id          uuid not null,
  primary key (meeting_point_id, member_profile_id),
  foreign key (family_id, meeting_point_id) references public.meeting_points (family_id, id) on delete cascade,
  foreign key (family_id, member_profile_id) references public.member_profiles (family_id, id) on delete cascade
);

create index meeting_point_responsibles_family_idx on public.meeting_point_responsibles (family_id);

-- ---------------------------------------------------------------------------
-- communication_plans (1:1 with family)
-- ---------------------------------------------------------------------------
create table public.communication_plans (
  family_id                   uuid primary key references public.families (id) on delete cascade,
  primary_contact_id          uuid,
  secondary_contact_id        uuid,
  out_of_region_contact_id    uuid,
  channels                    text[] not null default '{call,sms}'
                                check (channels <@ array['call','sms','whatsapp','email','pmr446','radio','meeting_point']::text[]),
  call_order                  text check (call_order is null or char_length(call_order) <= 1000),
  no_internet_plan            text check (no_internet_plan is null or char_length(no_internet_plan) <= 1000),
  calls_fail_plan             text check (calls_fail_plan is null or char_length(calls_fail_plan) <= 1000),
  phones_down_meeting_point_id uuid,
  pmr446_channel              text check (pmr446_channel is null or char_length(pmr446_channel) <= 40),
  updated_at                  timestamptz not null default now(),
  foreign key (family_id, primary_contact_id)
    references public.emergency_contacts (family_id, id) on delete set null (primary_contact_id),
  foreign key (family_id, secondary_contact_id)
    references public.emergency_contacts (family_id, id) on delete set null (secondary_contact_id),
  foreign key (family_id, out_of_region_contact_id)
    references public.emergency_contacts (family_id, id) on delete set null (out_of_region_contact_id),
  foreign key (family_id, phones_down_meeting_point_id)
    references public.meeting_points (family_id, id) on delete set null (phones_down_meeting_point_id)
);

create trigger communication_plans_updated_at before update on public.communication_plans
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- emergency_plans: the family's decisions for each scenario.
-- Scenario procedures themselves are versioned content in the codebase
-- (src/content/scenarios), referenced here by scenario_key.
-- ---------------------------------------------------------------------------
create table public.emergency_plans (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families (id) on delete cascade,
  scenario_key      text not null check (scenario_key ~ '^[a-z0-9-]{2,60}$'),
  meeting_point_id  uuid,
  bag_strategy      text check (bag_strategy in ('go_bags', 'home_kit', 'both')),
  notes             text check (notes is null or char_length(notes) <= 2000),
  completed_steps   text[] not null default '{}',
  updated_by        uuid references public.profiles (id) on delete set null,
  updated_at        timestamptz not null default now(),
  unique (family_id, scenario_key),
  foreign key (family_id, meeting_point_id)
    references public.meeting_points (family_id, id) on delete set null (meeting_point_id)
);

create trigger emergency_plans_updated_at before update on public.emergency_plans
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 140),
  description       text check (description is null or char_length(description) <= 1000),
  assignee_user_id  uuid,
  due_on            date,
  status            text not null default 'open' check (status in ('open', 'done')),
  completed_at      timestamptz,
  completed_by      uuid references public.profiles (id) on delete set null,
  action_key        text check (action_key is null or char_length(action_key) <= 80),
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Assignee must be an account of the same family; unassigned when they leave.
  foreign key (family_id, assignee_user_id)
    references public.family_members (family_id, user_id) on delete set null (assignee_user_id),
  check ((status = 'done') = (completed_at is not null))
);

create index tasks_family_idx on public.tasks (family_id, status, due_on);
create index tasks_assignee_idx on public.tasks (assignee_user_id) where status = 'open';
create trigger tasks_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- reminders: periodic reviews (quarterly by default) and custom reminders
-- ---------------------------------------------------------------------------
create table public.reminders (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families (id) on delete cascade,
  kind               text not null check (kind in ('quarterly_review', 'custom')),
  title              text not null check (char_length(title) between 1 and 140),
  due_on             date not null,
  recurrence_months  smallint check (recurrence_months is null or recurrence_months between 1 and 24),
  completed_items    text[] not null default '{}',
  completed_at       timestamptz,
  completed_by       uuid references public.profiles (id) on delete set null,
  notes              text check (notes is null or char_length(notes) <= 1000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index reminders_family_due_idx on public.reminders (family_id, due_on) where completed_at is null;
create trigger reminders_updated_at before update on public.reminders
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.emergency_contacts enable row level security;
alter table public.meeting_points enable row level security;
alter table public.meeting_point_responsibles enable row level security;
alter table public.communication_plans enable row level security;
alter table public.emergency_plans enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;

-- Structural plan data: viewer reads, editor writes.
do $$
declare
  t text;
begin
  foreach t in array array['emergency_contacts', 'meeting_points', 'meeting_point_responsibles'] loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (private.has_family_role(family_id, ''viewer''))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (private.has_family_role(family_id, ''editor''))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (private.has_family_role(family_id, ''editor'')) with check (private.has_family_role(family_id, ''editor''))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (private.has_family_role(family_id, ''editor''))', t);
  end loop;
end;
$$;

create policy communication_plans_select on public.communication_plans for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy communication_plans_update on public.communication_plans for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));

-- Scenario checklists are operational: members tick steps during drills/emergencies.
create policy emergency_plans_select on public.emergency_plans for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy emergency_plans_insert on public.emergency_plans for insert to authenticated
  with check (private.has_family_role(family_id, 'member'));
create policy emergency_plans_update on public.emergency_plans for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy emergency_plans_delete on public.emergency_plans for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

create policy tasks_select on public.tasks for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (private.has_family_role(family_id, 'member') and created_by = (select auth.uid()));
create policy tasks_update on public.tasks for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy tasks_delete on public.tasks for delete to authenticated
  using (private.has_family_role(family_id, 'editor') or created_by = (select auth.uid()));

create policy reminders_select on public.reminders for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy reminders_insert on public.reminders for insert to authenticated
  with check (private.has_family_role(family_id, 'member'));
create policy reminders_update on public.reminders for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy reminders_delete on public.reminders for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));
