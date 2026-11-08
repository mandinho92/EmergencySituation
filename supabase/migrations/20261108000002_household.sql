-- FamilyReady — household composition, dwelling and location.

create type public.member_category as enum ('adult', 'child', 'baby', 'senior');
create type public.dwelling_type as enum ('apartment', 'house', 'farm', 'other');

-- ---------------------------------------------------------------------------
-- household_profiles: dwelling + approximate location (1:1 with family)
-- The exact address is optional and never required for any calculation.
-- ---------------------------------------------------------------------------
create table public.household_profiles (
  family_id          uuid primary key references public.families (id) on delete cascade,
  dwelling_type      public.dwelling_type,
  floors             smallint check (floors is null or floors between 0 and 200),
  has_garage         boolean not null default false,
  has_garden         boolean not null default false,
  has_storage_room   boolean not null default false,
  has_fireplace      boolean not null default false,
  has_gas            boolean not null default false,
  has_electric_stove boolean not null default false,
  has_solar_panels   boolean not null default false,
  has_home_battery   boolean not null default false,
  has_generator      boolean not null default false,
  has_well           boolean not null default false,
  storage_space      text check (storage_space in ('small', 'medium', 'large')),
  country            text not null default 'PT' check (country ~ '^[A-Z]{2}$'),
  district           text check (district is null or district ~ '^[a-z0-9-]{2,40}$'),
  municipality       text check (municipality is null or char_length(municipality) <= 80),
  parish             text check (parish is null or char_length(parish) <= 120),
  address_line       text check (address_line is null or char_length(address_line) <= 200),
  -- Risks confirmed by the family. NULL = use regional defaults (indicative only).
  selected_risks     text[],
  updated_at         timestamptz not null default now()
);

create trigger household_profiles_updated_at before update on public.household_profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- member_profiles: the persons of the household (spec: member_profiles)
-- ---------------------------------------------------------------------------
create table public.member_profiles (
  id                     uuid primary key default gen_random_uuid(),
  family_id              uuid not null references public.families (id) on delete cascade,
  display_name           text not null check (char_length(display_name) between 1 and 60),
  category               public.member_category not null,
  age_years              smallint check (age_years is null or age_years between 0 and 120),
  linked_user_id         uuid references public.profiles (id) on delete set null,
  reduced_mobility       boolean not null default false,
  dietary_needs          text check (dietary_needs is null or char_length(dietary_needs) <= 300),
  special_equipment      text check (special_equipment is null or char_length(special_equipment) <= 300),
  -- Children / babies
  uses_diapers           boolean not null default false,
  infant_feeding         text check (infant_feeding in ('formula', 'breastfeeding', 'baby_food', 'mixed')),
  clothing_notes         text check (clothing_notes is null or char_length(clothing_notes) <= 300),
  transport_equipment    text check (transport_equipment is null or char_length(transport_equipment) <= 200),
  comfort_items          text check (comfort_items is null or char_length(comfort_items) <= 200),
  responsible_member_id  uuid,
  sort_order             smallint not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (family_id, id),
  foreign key (family_id, responsible_member_id)
    references public.member_profiles (family_id, id) on delete set null (responsible_member_id),
  check (responsible_member_id is null or responsible_member_id <> id),
  check (category not in ('child', 'baby') or age_years is null or age_years < 18)
);

create index member_profiles_family_idx on public.member_profiles (family_id, sort_order);
create unique index member_profiles_linked_user_unique
  on public.member_profiles (family_id, linked_user_id) where linked_user_id is not null;

create trigger member_profiles_updated_at before update on public.member_profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- member_health: sensitive health data, split out so it can have stricter RLS.
-- Rows exist only after explicit consent (consent_at NOT NULL).
-- Visibility: editors/admins, members (not viewers), and the linked person.
-- ---------------------------------------------------------------------------
create table public.member_health (
  member_profile_id  uuid primary key,
  family_id          uuid not null,
  allergies          text check (allergies is null or char_length(allergies) <= 500),
  medication         text check (medication is null or char_length(medication) <= 500),
  health_needs       text check (health_needs is null or char_length(health_needs) <= 500),
  include_on_card    boolean not null default false,
  consent_at         timestamptz not null,
  consent_by         uuid references public.profiles (id) on delete set null,
  updated_at         timestamptz not null default now(),
  foreign key (family_id, member_profile_id)
    references public.member_profiles (family_id, id) on delete cascade
);

create trigger member_health_updated_at before update on public.member_health
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------
create table public.pets (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 60),
  species          text not null check (species in ('dog', 'cat', 'bird', 'rabbit', 'rodent', 'reptile', 'fish', 'other')),
  quantity         smallint not null default 1 check (quantity between 1 and 50),
  approx_weight_kg numeric(5, 1) check (approx_weight_kg is null or approx_weight_kg between 0 and 150),
  food_notes       text check (food_notes is null or char_length(food_notes) <= 300),
  medication       text check (medication is null or char_length(medication) <= 300),
  has_carrier      boolean not null default false,
  has_microchip    boolean not null default false,
  documents_notes  text check (documents_notes is null or char_length(documents_notes) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (family_id, id)
);

create index pets_family_idx on public.pets (family_id);

create trigger pets_updated_at before update on public.pets
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.household_profiles enable row level security;
alter table public.member_profiles enable row level security;
alter table public.member_health enable row level security;
alter table public.pets enable row level security;

create policy household_select on public.household_profiles for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy household_write on public.household_profiles for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));

create policy member_profiles_select on public.member_profiles for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy member_profiles_insert on public.member_profiles for insert to authenticated
  with check (private.has_family_role(family_id, 'editor'));
create policy member_profiles_update on public.member_profiles for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));
create policy member_profiles_delete on public.member_profiles for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

create policy member_health_select on public.member_health for select to authenticated
  using (
    private.has_family_role(family_id, 'member')
    or exists (
      select 1 from public.member_profiles mp
      where mp.id = member_health.member_profile_id
        and mp.linked_user_id = (select auth.uid())
    )
  );
create policy member_health_insert on public.member_health for insert to authenticated
  with check (private.has_family_role(family_id, 'editor') and consent_by = (select auth.uid()));
create policy member_health_update on public.member_health for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));
create policy member_health_delete on public.member_health for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

create policy pets_select on public.pets for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy pets_insert on public.pets for insert to authenticated
  with check (private.has_family_role(family_id, 'editor'));
create policy pets_update on public.pets for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));
create policy pets_delete on public.pets for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));
