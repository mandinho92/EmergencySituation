-- FamilyReady — HOME KIT, GO BAGS, inventory, catalogue, shopping and energy.
--
-- Design note (docs/ARCHITECTURE.md §4): required quantities for generated
-- items are *derived* at read time by the calculation engine from the family
-- composition. Rows here only persist what the family did (quantity owned,
-- packed, purchased by whom, overrides, custom items). This avoids stale
-- duplicated "required" values whenever the household changes.

create or replace function private.is_home_kit_category(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array['water','food','energy','kitchen','first_aid','fire','lighting','communications',
                        'hygiene','sanitation','tools','protection','shelter','documents','children','seniors','pets']);
$$;

create or replace function private.is_bag_category(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array['water','food','clothing','hygiene','first_aid','medication','lighting','communications',
                        'documents','money','protection','children','pets']);
$$;

create or replace function private.is_any_category(p text)
returns boolean language sql immutable set search_path = '' as $$
  select private.is_home_kit_category(p) or private.is_bag_category(p) or p = 'other';
$$;

-- ---------------------------------------------------------------------------
-- Product catalogue (global reference data, read-only for clients)
-- ---------------------------------------------------------------------------
create table public.product_catalog (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  item_key                text check (item_key is null or item_key ~ '^[a-z0-9_.-]{2,60}$'),
  category                text not null check (private.is_any_category(category)),
  name                    text not null,
  brand                   text,
  model                   text,
  description             text,
  image_url               text,
  -- 'demo' rows are illustrative and MUST be labelled as such in the UI.
  data_status             text not null default 'demo' check (data_status in ('demo', 'verified')),
  specs_source_url        text,
  specs_checked_on        date,
  -- Planning estimate only, never shown as an offer. NULL = unknown.
  estimated_price_cents   integer check (estimated_price_cents is null or estimated_price_cents >= 0),
  estimate_date           date,
  unit_label              text,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (estimated_price_cents is null or estimate_date is not null)
);

create index product_catalog_item_key_idx on public.product_catalog (item_key) where is_active;
create trigger product_catalog_updated_at before update on public.product_catalog
  for each row execute function private.set_updated_at();

create table public.product_energy_specs (
  product_id          uuid primary key references public.product_catalog (id) on delete cascade,
  kind                text not null check (kind in ('power_station', 'solar_panel', 'powerbank')),
  capacity_wh         numeric(7, 1) check (capacity_wh is null or capacity_wh > 0),
  ac_output_w         integer check (ac_output_w is null or ac_output_w > 0),
  surge_w             integer check (surge_w is null or surge_w > 0),
  solar_input_max_w   integer check (solar_input_max_w is null or solar_input_max_w > 0),
  panel_w             integer check (panel_w is null or panel_w > 0),
  chemistry           text check (chemistry in ('LFP', 'NMC', 'Li-ion', 'other')),
  weight_kg           numeric(5, 2),
  warranty_years      smallint,
  expandable          boolean,
  max_expanded_wh     numeric(7, 1),
  check (kind <> 'power_station' or (capacity_wh is not null and ac_output_w is not null)),
  check (kind <> 'solar_panel' or panel_w is not null),
  check (kind <> 'powerbank' or capacity_wh is not null)
);

create table public.product_prices (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.product_catalog (id) on delete cascade,
  store        text not null check (store in ('decathlon', 'leroy_merlin', 'worten', 'continente', 'auchan',
                                              'pingo_doce', 'amazon_es', 'pharmacy', 'specialist', 'other')),
  price_cents  integer not null check (price_cents >= 0),
  url          text check (url is null or url ~ '^https://'),
  checked_at   timestamptz not null,
  source       text not null default 'manual' check (source in ('manual', 'partner_feed')),
  unique (product_id, store)
);

create index product_prices_product_idx on public.product_prices (product_id);

-- ---------------------------------------------------------------------------
-- HOME KIT
-- ---------------------------------------------------------------------------
create table public.home_kits (
  family_id               uuid primary key references public.families (id) on delete cascade,
  target_days             smallint not null default 3 check (target_days between 1 and 60),
  -- Optional override of the adult daily water reference (litres/day, all uses).
  water_adult_l_per_day   numeric(4, 1) check (water_adult_l_per_day is null or water_adult_l_per_day between 1 and 30),
  include_hygiene_water   boolean not null default true,
  hot_climate             boolean not null default false,
  last_reviewed_at        timestamptz,
  updated_at              timestamptz not null default now()
);

create trigger home_kits_updated_at before update on public.home_kits
  for each row execute function private.set_updated_at();

create table public.home_kit_items (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.home_kits (family_id) on delete cascade,
  item_key            text check (item_key is null or item_key ~ '^[a-z0-9_.-]{2,60}$'),
  name                text not null check (char_length(name) between 1 and 120),
  category            text not null check (private.is_home_kit_category(category)),
  unit                text not null default 'un' check (char_length(unit) between 1 and 16),
  -- Required quantity: NULL on generated items means "use the engine value".
  quantity_required   numeric(10, 2) check (quantity_required is null or quantity_required >= 0),
  quantity_have       numeric(10, 2) not null default 0 check (quantity_have >= 0),
  priority            smallint not null default 2 check (priority between 0 and 3),
  is_excluded         boolean not null default false,
  acquired_via        text check (acquired_via in ('purchased', 'owned')),
  purchased_by        uuid references public.profiles (id) on delete set null,
  purchased_at        timestamptz,
  expires_on          date,
  storage_location    text check (storage_location is null or char_length(storage_location) <= 120),
  product_id          uuid references public.product_catalog (id) on delete set null,
  notes               text check (notes is null or char_length(notes) <= 500),
  updated_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (item_key is not null or quantity_required is not null)
);

create unique index home_kit_items_key_unique on public.home_kit_items (family_id, item_key) where item_key is not null;
create index home_kit_items_expiry_idx on public.home_kit_items (family_id, expires_on) where expires_on is not null;

create trigger home_kit_items_updated_at before update on public.home_kit_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- GO BAGS
-- ---------------------------------------------------------------------------
create table public.evacuation_bags (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families (id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 60),
  kind               text not null check (kind in ('adult', 'child', 'pet')),
  owner_member_id    uuid,
  pet_id             uuid,
  capacity_liters    smallint check (capacity_liters is null or capacity_liters between 5 and 120),
  last_checked_at    timestamptz,
  notes              text check (notes is null or char_length(notes) <= 500),
  sort_order         smallint not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (family_id, id),
  foreign key (family_id, owner_member_id)
    references public.member_profiles (family_id, id) on delete set null (owner_member_id),
  foreign key (family_id, pet_id)
    references public.pets (family_id, id) on delete set null (pet_id)
);

create index evacuation_bags_family_idx on public.evacuation_bags (family_id, sort_order);

create trigger evacuation_bags_updated_at before update on public.evacuation_bags
  for each row execute function private.set_updated_at();

create table public.evacuation_bag_items (
  id                  uuid primary key default gen_random_uuid(),
  bag_id              uuid not null,
  family_id           uuid not null,
  item_key            text check (item_key is null or item_key ~ '^[a-z0-9_.-]{2,60}$'),
  name                text not null check (char_length(name) between 1 and 120),
  category            text not null check (private.is_bag_category(category)),
  unit                text not null default 'un' check (char_length(unit) between 1 and 16),
  quantity_required   numeric(10, 2) check (quantity_required is null or quantity_required >= 0),
  quantity_have       numeric(10, 2) not null default 0 check (quantity_have >= 0),
  unit_weight_g       integer check (unit_weight_g is null or unit_weight_g between 0 and 50000),
  priority            smallint not null default 1 check (priority between 0 and 3),
  is_excluded         boolean not null default false,
  is_packed           boolean not null default false,
  packed_at           timestamptz,
  acquired_via        text check (acquired_via in ('purchased', 'owned')),
  purchased_by        uuid references public.profiles (id) on delete set null,
  purchased_at        timestamptz,
  expires_on          date,
  product_id          uuid references public.product_catalog (id) on delete set null,
  notes               text check (notes is null or char_length(notes) <= 500),
  updated_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (family_id, bag_id) references public.evacuation_bags (family_id, id) on delete cascade,
  check (item_key is not null or quantity_required is not null)
);

create unique index evacuation_bag_items_key_unique on public.evacuation_bag_items (bag_id, item_key) where item_key is not null;
create index evacuation_bag_items_family_idx on public.evacuation_bag_items (family_id);
create index evacuation_bag_items_expiry_idx on public.evacuation_bag_items (family_id, expires_on) where expires_on is not null;

create trigger evacuation_bag_items_updated_at before update on public.evacuation_bag_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory: equipment and stock that is not tracked as a kit item
-- ---------------------------------------------------------------------------
create table public.inventory_items (
  id                         uuid primary key default gen_random_uuid(),
  family_id                  uuid not null references public.families (id) on delete cascade,
  name                       text not null check (char_length(name) between 1 and 120),
  category                   text not null default 'other' check (private.is_any_category(category)),
  quantity                   numeric(10, 2) not null default 1 check (quantity >= 0),
  unit                       text not null default 'un' check (char_length(unit) between 1 and 16),
  storage_location           text check (storage_location is null or char_length(storage_location) <= 120),
  acquired_on                date,
  expires_on                 date,
  condition                  text not null default 'ok' check (condition in ('ok', 'needs_recharge', 'needs_maintenance', 'damaged')),
  maintenance_interval_days  smallint check (maintenance_interval_days is null or maintenance_interval_days between 7 and 1825),
  last_maintained_on         date,
  notes                      text check (notes is null or char_length(notes) <= 500),
  updated_by                 uuid references public.profiles (id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index inventory_items_family_idx on public.inventory_items (family_id, category);

create trigger inventory_items_updated_at before update on public.inventory_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shopping list: extra manual items (kit gaps are derived, not copied here)
-- ---------------------------------------------------------------------------
create table public.shopping_list_items (
  id                          uuid primary key default gen_random_uuid(),
  family_id                   uuid not null references public.families (id) on delete cascade,
  name                        text not null check (char_length(name) between 1 and 120),
  category                    text not null default 'other' check (private.is_any_category(category)),
  quantity                    numeric(10, 2) not null default 1 check (quantity > 0),
  unit                        text not null default 'un' check (char_length(unit) between 1 and 16),
  estimated_unit_price_cents  integer check (estimated_unit_price_cents is null or estimated_unit_price_cents >= 0),
  store                       text check (store is null or char_length(store) <= 60),
  url                         text check (url is null or url ~ '^https?://'),
  priority                    smallint not null default 2 check (priority between 0 and 3),
  status                      text not null default 'pending' check (status in ('pending', 'purchased')),
  purchased_by                uuid references public.profiles (id) on delete set null,
  purchased_at                timestamptz,
  product_id                  uuid references public.product_catalog (id) on delete set null,
  notes                       text check (notes is null or char_length(notes) <= 500),
  created_by                  uuid references public.profiles (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index shopping_list_items_family_idx on public.shopping_list_items (family_id, status, priority);

create trigger shopping_list_items_updated_at before update on public.shopping_list_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Energy (optional module)
-- ---------------------------------------------------------------------------
create table public.energy_profiles (
  family_id                    uuid primary key references public.families (id) on delete cascade,
  tier                         text not null default 'undecided'
                                 check (tier in ('undecided', 'none', 'powerbanks', 'economic', 'balanced', 'advanced', 'manual')),
  autonomy_days                numeric(4, 1) not null default 3 check (autonomy_days between 0.5 and 30),
  inverter_efficiency          numeric(3, 2) not null default 0.85 check (inverter_efficiency between 0.5 and 1),
  peak_sun_hours               numeric(3, 1) not null default 3.0 check (peak_sun_hours between 0.5 and 10),
  solar_derate                 numeric(3, 2) not null default 0.75 check (solar_derate between 0.3 and 1),
  selected_station_product_id  uuid references public.product_catalog (id) on delete set null,
  selected_panel_product_id    uuid references public.product_catalog (id) on delete set null,
  panel_count                  smallint check (panel_count is null or panel_count between 0 and 20),
  station_acquired             boolean not null default false,
  panels_acquired              boolean not null default false,
  updated_at                   timestamptz not null default now()
);

create trigger energy_profiles_updated_at before update on public.energy_profiles
  for each row execute function private.set_updated_at();

-- spec: "equipment" — the loads the family wants to power
create table public.energy_devices (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.energy_profiles (family_id) on delete cascade,
  preset_key      text check (preset_key is null or preset_key ~ '^[a-z0-9_]{2,40}$'),
  name            text not null check (char_length(name) between 1 and 80),
  watts           numeric(7, 1) not null check (watts > 0 and watts <= 5000),
  surge_watts     numeric(7, 1) check (surge_watts is null or surge_watts >= watts),
  hours_per_day   numeric(4, 1) not null check (hours_per_day > 0 and hours_per_day <= 24),
  quantity        smallint not null default 1 check (quantity between 1 and 20),
  is_ac           boolean not null default true,
  is_essential    boolean not null default true,
  created_at      timestamptz not null default now()
);

create index energy_devices_family_idx on public.energy_devices (family_id);

-- ---------------------------------------------------------------------------
-- RLS
--   catalogue: read for authenticated users, writes only via service role.
--   structural data (kits config, bags, energy config): editor+
--   operational data (item status, inventory, shopping): member+
-- ---------------------------------------------------------------------------
alter table public.product_catalog enable row level security;
alter table public.product_energy_specs enable row level security;
alter table public.product_prices enable row level security;
alter table public.home_kits enable row level security;
alter table public.home_kit_items enable row level security;
alter table public.evacuation_bags enable row level security;
alter table public.evacuation_bag_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.energy_profiles enable row level security;
alter table public.energy_devices enable row level security;

create policy catalog_read on public.product_catalog for select to authenticated using (is_active);
create policy energy_specs_read on public.product_energy_specs for select to authenticated using (true);
create policy prices_read on public.product_prices for select to authenticated using (true);

create policy home_kits_select on public.home_kits for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy home_kits_update on public.home_kits for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));

create policy home_kit_items_select on public.home_kit_items for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy home_kit_items_insert on public.home_kit_items for insert to authenticated
  with check (private.has_family_role(family_id, 'member'));
create policy home_kit_items_update on public.home_kit_items for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy home_kit_items_delete on public.home_kit_items for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

create policy bags_select on public.evacuation_bags for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy bags_insert on public.evacuation_bags for insert to authenticated
  with check (private.has_family_role(family_id, 'editor'));
-- Members may record a bag check (last_checked_at); see guard trigger below.
create policy bags_update on public.evacuation_bags for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy bags_delete on public.evacuation_bags for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

create policy bag_items_select on public.evacuation_bag_items for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy bag_items_insert on public.evacuation_bag_items for insert to authenticated
  with check (private.has_family_role(family_id, 'member'));
create policy bag_items_update on public.evacuation_bag_items for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy bag_items_delete on public.evacuation_bag_items for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

create policy inventory_select on public.inventory_items for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy inventory_insert on public.inventory_items for insert to authenticated
  with check (private.has_family_role(family_id, 'member'));
create policy inventory_update on public.inventory_items for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy inventory_delete on public.inventory_items for delete to authenticated
  using (private.has_family_role(family_id, 'member'));

create policy shopping_select on public.shopping_list_items for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy shopping_insert on public.shopping_list_items for insert to authenticated
  with check (private.has_family_role(family_id, 'member'));
create policy shopping_update on public.shopping_list_items for update to authenticated
  using (private.has_family_role(family_id, 'member')) with check (private.has_family_role(family_id, 'member'));
create policy shopping_delete on public.shopping_list_items for delete to authenticated
  using (private.has_family_role(family_id, 'member'));

create policy energy_profiles_select on public.energy_profiles for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy energy_profiles_update on public.energy_profiles for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));

create policy energy_devices_select on public.energy_devices for select to authenticated
  using (private.has_family_role(family_id, 'viewer'));
create policy energy_devices_insert on public.energy_devices for insert to authenticated
  with check (private.has_family_role(family_id, 'editor'));
create policy energy_devices_update on public.energy_devices for update to authenticated
  using (private.has_family_role(family_id, 'editor')) with check (private.has_family_role(family_id, 'editor'));
create policy energy_devices_delete on public.energy_devices for delete to authenticated
  using (private.has_family_role(family_id, 'editor'));

-- ---------------------------------------------------------------------------
-- Column guards for the "member" role.
-- Members update operational state only; definition columns need editor+.
-- ---------------------------------------------------------------------------
create or replace function private.guard_member_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if private.has_family_role(new.family_id, 'editor') then
    return new;
  end if;
  -- Generated items may be materialised by members (first status change),
  -- but definition fields stay as the engine/editor defined them.
  if tg_op = 'UPDATE' and (
       new.name is distinct from old.name
       or new.category is distinct from old.category
       or new.unit is distinct from old.unit
       or new.quantity_required is distinct from old.quantity_required
       or new.priority is distinct from old.priority
       or new.is_excluded is distinct from old.is_excluded
       or new.item_key is distinct from old.item_key) then
    raise exception 'insufficient_role: apenas editores podem alterar a definição do artigo' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and (new.item_key is null or new.quantity_required is not null or new.is_excluded) then
    raise exception 'insufficient_role: apenas editores podem criar artigos personalizados' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger home_kit_items_member_guard before insert or update on public.home_kit_items
  for each row execute function private.guard_member_item_update();
create trigger evacuation_bag_items_member_guard before insert or update on public.evacuation_bag_items
  for each row execute function private.guard_member_item_update();

create or replace function private.guard_member_bag_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or private.has_family_role(new.family_id, 'editor') then
    return new;
  end if;
  if (to_jsonb(new) - 'last_checked_at' - 'updated_at') <> (to_jsonb(old) - 'last_checked_at' - 'updated_at') then
    raise exception 'insufficient_role: membros apenas podem registar a verificação da mochila' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger evacuation_bags_member_guard before update on public.evacuation_bags
  for each row execute function private.guard_member_bag_update();
