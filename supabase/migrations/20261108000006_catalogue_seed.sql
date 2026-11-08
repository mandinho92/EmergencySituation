-- FamilyReady — initial catalogue (DEMO DATA).
--
-- * Generic rows carry PLANNING ESTIMATES (estimated_price_cents, estimate_date)
--   so the budget can be planned. They are not offers: the UI labels them as
--   "estimativa de planeamento" and never shows a purchase link for them.
-- * Brand products carry specifications checked against retailer/manufacturer
--   listings on specs_checked_on. Prices are intentionally NULL: no price is
--   shown until a verified row exists in product_prices (see docs/CATALOGUE.md).
-- * Every row is data_status = 'demo' until reviewed by the catalogue owner.

insert into public.product_catalog (slug, item_key, category, name, unit_label, estimated_price_cents, estimate_date) values
  ('gen-water-stored', 'water.stored', 'water', 'Água engarrafada (garrafão de 5 L) — referência genérica', 'L', 25, date '2026-11-08'),
  ('gen-water-container', 'water.container', 'water', 'Jerrican alimentar 10–20 L — referência genérica', 'un', 1200, date '2026-11-08'),
  ('gen-water-purification', 'water.purification', 'water', 'Pastilhas de purificação de água — referência genérica', 'emb.', 800, date '2026-11-08'),
  ('gen-food-rice', 'food.rice', 'food', 'Arroz — referência genérica', 'kg', 160, date '2026-11-08'),
  ('gen-food-pasta', 'food.pasta', 'food', 'Massa — referência genérica', 'kg', 150, date '2026-11-08'),
  ('gen-food-cereals', 'food.cereals', 'food', 'Cereais, tostas ou bolachas — referência genérica', 'kg', 350, date '2026-11-08'),
  ('gen-food-canned-protein', 'food.canned_protein', 'food', 'Conserva de peixe ou carne — referência genérica', 'latas', 150, date '2026-11-08'),
  ('gen-food-legumes', 'food.legumes', 'food', 'Leguminosas cozidas em frasco — referência genérica', 'frascos', 120, date '2026-11-08'),
  ('gen-food-milk-uht', 'food.milk_uht', 'food', 'Leite UHT — referência genérica', 'L', 95, date '2026-11-08'),
  ('gen-food-snacks', 'food.snacks', 'food', 'Frutos secos e barras — referência genérica', 'kg', 1200, date '2026-11-08'),
  ('gen-food-infant-formula', 'food.infant_formula', 'food', 'Leite infantil (custo por dia) — referência genérica', 'dias', 200, date '2026-11-08'),
  ('gen-food-baby-food', 'food.baby_food', 'food', 'Refeições infantis (custo por dia) — referência genérica', 'dias', 400, date '2026-11-08'),
  ('gen-pets-food', 'pets.food', 'pets', 'Ração para animais — referência genérica', 'kg', 300, date '2026-11-08'),
  ('gen-kitchen-can-opener', 'kitchen.can_opener', 'kitchen', 'Abre-latas manual — referência genérica', 'un', 400, date '2026-11-08'),
  ('gen-kitchen-lighter', 'kitchen.lighter', 'kitchen', 'Isqueiro — referência genérica', 'un', 200, date '2026-11-08'),
  ('gen-kitchen-camping-stove', 'kitchen.camping_stove', 'kitchen', 'Fogareiro de campismo — referência genérica', 'un', 2500, date '2026-11-08'),
  ('gen-kitchen-gas-cartridges', 'kitchen.gas_cartridges', 'kitchen', 'Cartucho de gás — referência genérica', 'un', 400, date '2026-11-08'),
  ('gen-kitchen-reusable-tableware', 'kitchen.reusable_tableware', 'kitchen', 'Conjunto de loiça reutilizável — referência genérica', 'conj.', 1000, date '2026-11-08'),
  ('gen-hygiene-toilet-paper', 'hygiene.toilet_paper', 'hygiene', 'Papel higiénico — referência genérica', 'rolos', 40, date '2026-11-08'),
  ('gen-hygiene-wet-wipes', 'hygiene.wet_wipes', 'hygiene', 'Toalhitas — referência genérica', 'emb.', 150, date '2026-11-08'),
  ('gen-hygiene-soap', 'hygiene.soap', 'hygiene', 'Sabonete — referência genérica', 'un', 100, date '2026-11-08'),
  ('gen-hygiene-hand-sanitizer', 'hygiene.hand_sanitizer', 'hygiene', 'Gel desinfetante 250 ml — referência genérica', 'frascos', 300, date '2026-11-08'),
  ('gen-hygiene-trash-bags', 'hygiene.trash_bags', 'hygiene', 'Sacos do lixo (rolo de 20) — referência genérica', 'rolos', 200, date '2026-11-08'),
  ('gen-hygiene-oral-care', 'hygiene.oral_care', 'hygiene', 'Escova e pasta de dentes — referência genérica', 'kits', 300, date '2026-11-08'),
  ('gen-hygiene-menstrual', 'hygiene.menstrual', 'hygiene', 'Produtos de higiene menstrual — referência genérica', 'emb.', 300, date '2026-11-08'),
  ('gen-sanitation-toilet-bags', 'sanitation.toilet_bags', 'sanitation', 'Saco para sanita de emergência — referência genérica', 'un', 80, date '2026-11-08'),
  ('gen-sanitation-bleach', 'sanitation.bleach', 'sanitation', 'Lixívia sem perfume — referência genérica', 'L', 120, date '2026-11-08'),
  ('gen-sanitation-gloves', 'sanitation.gloves', 'sanitation', 'Luvas descartáveis (caixa) — referência genérica', 'caixa', 600, date '2026-11-08'),
  ('gen-first-aid-kit', 'first_aid.kit', 'first_aid', 'Kit de primeiros socorros doméstico — referência genérica', 'un', 3000, date '2026-11-08'),
  ('gen-first-aid-dressings', 'first_aid.dressings', 'first_aid', 'Compressas, ligaduras e pensos — referência genérica', 'emb.', 600, date '2026-11-08'),
  ('gen-first-aid-thermometer', 'first_aid.thermometer', 'first_aid', 'Termómetro digital — referência genérica', 'un', 1000, date '2026-11-08'),
  ('gen-first-aid-saline', 'first_aid.saline', 'first_aid', 'Soro fisiológico (unidoses) — referência genérica', 'emb.', 300, date '2026-11-08'),
  ('gen-first-aid-otc-pain-fever', 'first_aid.otc_pain_fever', 'first_aid', 'Analgésico/antipirético de venda livre — referência genérica', 'emb.', 300, date '2026-11-08'),
  ('gen-fire-smoke-detector', 'fire.smoke_detector', 'fire', 'Detetor de fumo — referência genérica', 'un', 1500, date '2026-11-08'),
  ('gen-fire-extinguisher', 'fire.extinguisher', 'fire', 'Extintor de pó ABC — referência genérica', 'un', 3000, date '2026-11-08'),
  ('gen-fire-blanket', 'fire.blanket', 'fire', 'Manta ignífuga — referência genérica', 'un', 1500, date '2026-11-08'),
  ('gen-fire-co-detector', 'fire.co_detector', 'fire', 'Detetor de monóxido de carbono — referência genérica', 'un', 2500, date '2026-11-08'),
  ('gen-lighting-flashlight', 'lighting.flashlight', 'lighting', 'Lanterna LED — referência genérica', 'un', 800, date '2026-11-08'),
  ('gen-lighting-area-lantern', 'lighting.area_lantern', 'lighting', 'Candeeiro LED de campismo — referência genérica', 'un', 1500, date '2026-11-08'),
  ('gen-lighting-batteries', 'lighting.batteries', 'lighting', 'Pilhas AA/AAA (4 un) — referência genérica', 'emb.', 400, date '2026-11-08'),
  ('gen-communications-radio', 'communications.radio', 'communications', 'Rádio portátil de emergência (pilhas/manivela) — referência genérica', 'un', 3000, date '2026-11-08'),
  ('gen-communications-powerbank', 'communications.powerbank', 'communications', 'Powerbank 10 000 mAh — referência genérica', 'un', 2500, date '2026-11-08'),
  ('gen-communications-cables', 'communications.cables', 'communications', 'Cabos de carregamento — referência genérica', 'conj.', 800, date '2026-11-08'),
  ('gen-communications-pmr446', 'communications.pmr446', 'communications', 'Walkie-talkies PMR446 (par) — referência genérica', 'par', 3500, date '2026-11-08'),
  ('gen-energy-rechargeable-batteries', 'energy.rechargeable_batteries', 'energy', 'Pilhas recarregáveis com carregador — referência genérica', 'conj.', 2500, date '2026-11-08'),
  ('gen-tools-multitool', 'tools.multitool', 'tools', 'Canivete multifunções — referência genérica', 'un', 2000, date '2026-11-08'),
  ('gen-tools-duct-tape', 'tools.duct_tape', 'tools', 'Fita adesiva resistente — referência genérica', 'un', 500, date '2026-11-08'),
  ('gen-tools-work-gloves', 'tools.work_gloves', 'tools', 'Luvas de trabalho — referência genérica', 'pares', 500, date '2026-11-08'),
  ('gen-tools-shutoff-key', 'tools.shutoff_key', 'tools', 'Chave de corte de gás/água — referência genérica', 'un', 800, date '2026-11-08'),
  ('gen-tools-furniture-straps', 'tools.furniture_straps', 'tools', 'Fixações anti-queda para móveis — referência genérica', 'conj.', 1200, date '2026-11-08'),
  ('gen-protection-ffp2', 'protection.ffp2', 'protection', 'Máscara FFP2 — referência genérica', 'un', 60, date '2026-11-08'),
  ('gen-protection-tarp', 'protection.tarp', 'protection', 'Lona impermeável — referência genérica', 'un', 1200, date '2026-11-08'),
  ('gen-protection-whistle', 'protection.whistle', 'protection', 'Apito de emergência — referência genérica', 'un', 300, date '2026-11-08'),
  ('gen-protection-flood-barrier', 'protection.flood_barrier', 'protection', 'Saco/barreira anti-inundação — referência genérica', 'un', 800, date '2026-11-08'),
  ('gen-shelter-thermal-blanket', 'shelter.thermal_blanket', 'shelter', 'Manta térmica de emergência — referência genérica', 'un', 200, date '2026-11-08'),
  ('gen-shelter-blankets', 'shelter.blankets', 'shelter', 'Cobertor — referência genérica', 'un', 1500, date '2026-11-08'),
  ('gen-documents-waterproof-pouch', 'documents.waterproof_pouch', 'documents', 'Bolsa estanque para documentos — referência genérica', 'un', 800, date '2026-11-08'),
  ('gen-children-diapers', 'children.diapers', 'children', 'Fralda — referência genérica', 'un', 25, date '2026-11-08'),
  ('gen-children-diaper-cream', 'children.diaper_cream', 'children', 'Creme para a muda da fralda — referência genérica', 'un', 500, date '2026-11-08'),
  ('gen-children-pediatric-fever', 'children.pediatric_fever', 'children', 'Medicação pediátrica (conforme prescrição) — referência genérica', 'emb.', 500, date '2026-11-08'),
  ('gen-children-activities', 'children.activities', 'children', 'Jogos e livros — referência genérica', 'conj.', 1000, date '2026-11-08'),
  ('gen-pets-cat-litter', 'pets.cat_litter', 'pets', 'Areia para gatos — referência genérica', 'kg', 80, date '2026-11-08'),
  ('gen-pets-waste-bags', 'pets.waste_bags', 'pets', 'Sacos para dejetos — referência genérica', 'rolo', 300, date '2026-11-08'),
  ('gen-bag-water-bottles', 'bag.water.bottles', 'water', 'Água em garrafas pequenas — referência genérica', 'L', 50, date '2026-11-08'),
  ('gen-bag-water-purification', 'bag.water.purification', 'water', 'Pastilhas de purificação — referência genérica', 'emb.', 800, date '2026-11-08'),
  ('gen-bag-water-reusable-bottle', 'bag.water.reusable_bottle', 'water', 'Garrafa reutilizável — referência genérica', 'un', 800, date '2026-11-08'),
  ('gen-bag-water-small-bottle', 'bag.water.small_bottle', 'water', 'Garrafa de água pequena — referência genérica', 'L', 50, date '2026-11-08'),
  ('gen-bag-food-energy-bars', 'bag.food.energy_bars', 'food', 'Barra energética — referência genérica', 'un', 100, date '2026-11-08'),
  ('gen-bag-food-easy-open-cans', 'bag.food.easy_open_cans', 'food', 'Conserva de abertura fácil — referência genérica', 'un', 150, date '2026-11-08'),
  ('gen-bag-food-nuts', 'bag.food.nuts', 'food', 'Frutos secos — referência genérica', 'emb.', 300, date '2026-11-08'),
  ('gen-bag-food-snacks', 'bag.food.snacks', 'food', 'Snacks — referência genérica', 'un', 80, date '2026-11-08'),
  ('gen-bag-hygiene-kit', 'bag.hygiene.kit', 'hygiene', 'Kit de higiene de viagem — referência genérica', 'un', 600, date '2026-11-08'),
  ('gen-bag-hygiene-wipes', 'bag.hygiene.wipes', 'hygiene', 'Toalhitas — referência genérica', 'emb.', 150, date '2026-11-08'),
  ('gen-bag-hygiene-sanitizer', 'bag.hygiene.sanitizer', 'hygiene', 'Gel desinfetante pequeno — referência genérica', 'un', 200, date '2026-11-08'),
  ('gen-bag-hygiene-toilet-paper', 'bag.hygiene.toilet_paper', 'hygiene', 'Papel higiénico — referência genérica', 'rolo', 40, date '2026-11-08'),
  ('gen-bag-hygiene-ffp2', 'bag.hygiene.ffp2', 'hygiene', 'Máscara FFP2 — referência genérica', 'un', 60, date '2026-11-08'),
  ('gen-bag-first-aid-compact-kit', 'bag.first_aid.compact_kit', 'first_aid', 'Kit de primeiros socorros compacto — referência genérica', 'un', 1500, date '2026-11-08'),
  ('gen-bag-lighting-headlamp', 'bag.lighting.headlamp', 'lighting', 'Lanterna frontal LED — referência genérica', 'un', 1200, date '2026-11-08'),
  ('gen-bag-lighting-batteries', 'bag.lighting.batteries', 'lighting', 'Pilhas de reserva — referência genérica', 'emb.', 400, date '2026-11-08'),
  ('gen-bag-lighting-small-flashlight', 'bag.lighting.small_flashlight', 'lighting', 'Lanterna pequena — referência genérica', 'un', 500, date '2026-11-08'),
  ('gen-bag-communications-powerbank', 'bag.communications.powerbank', 'communications', 'Powerbank 10 000 mAh — referência genérica', 'un', 2500, date '2026-11-08'),
  ('gen-bag-communications-cable', 'bag.communications.cable', 'communications', 'Cabo de carregamento — referência genérica', 'un', 800, date '2026-11-08'),
  ('gen-bag-communications-radio', 'bag.communications.radio', 'communications', 'Rádio portátil — referência genérica', 'un', 3000, date '2026-11-08'),
  ('gen-bag-protection-thermal-blanket', 'bag.protection.thermal_blanket', 'protection', 'Manta térmica — referência genérica', 'un', 200, date '2026-11-08'),
  ('gen-bag-protection-whistle', 'bag.protection.whistle', 'protection', 'Apito — referência genérica', 'un', 300, date '2026-11-08'),
  ('gen-bag-protection-poncho', 'bag.protection.poncho', 'protection', 'Poncho impermeável — referência genérica', 'un', 500, date '2026-11-08'),
  ('gen-bag-protection-work-gloves', 'bag.protection.work_gloves', 'protection', 'Luvas de trabalho — referência genérica', 'par', 500, date '2026-11-08'),
  ('gen-bag-protection-multitool', 'bag.protection.multitool', 'protection', 'Canivete multifunções — referência genérica', 'un', 2000, date '2026-11-08'),
  ('gen-bag-children-diapers', 'bag.children.diapers', 'children', 'Fralda — referência genérica', 'un', 25, date '2026-11-08'),
  ('gen-bag-children-baby-wipes', 'bag.children.baby_wipes', 'children', 'Toalhitas de bebé — referência genérica', 'emb.', 200, date '2026-11-08'),
  ('gen-bag-children-infant-food', 'bag.children.infant_food', 'children', 'Alimentação infantil (custo por dia) — referência genérica', 'dias', 300, date '2026-11-08'),
  ('gen-bag-pets-food', 'bag.pets.food', 'pets', 'Ração — referência genérica', 'kg', 300, date '2026-11-08'),
  ('gen-bag-pets-water', 'bag.pets.water', 'pets', 'Água — referência genérica', 'L', 25, date '2026-11-08'),
  ('gen-bag-pets-bowls', 'bag.pets.bowls', 'pets', 'Taças dobráveis — referência genérica', 'conj.', 600, date '2026-11-08'),
  ('gen-bag-pets-leash', 'bag.pets.leash', 'pets', 'Trela e coleira — referência genérica', 'un', 1000, date '2026-11-08'),
  ('gen-bag-pets-waste-bags', 'bag.pets.waste_bags', 'pets', 'Sacos para dejetos — referência genérica', 'rolo', 300, date '2026-11-08'),
  ('gen-bag-pets-carrier', 'bag.pets.carrier', 'pets', 'Transportadora — referência genérica', 'un', 2500, date '2026-11-08');

-- Power stations (LFP chemistry for all listed models).
with p as (
  insert into public.product_catalog (slug, item_key, category, name, brand, model, description, specs_source_url, specs_checked_on)
  values ('ecoflow-river-2', 'energy.power_station', 'energy', 'EcoFlow RIVER 2', 'EcoFlow', 'RIVER 2',
          'Power station portátil. Confirme especificações, garantia e compatibilidade de painéis com o fabricante antes de comprar.',
          'https://www.cliftoncameras.co.uk/uploads/specifications/EcoFlow%20RIVER%202%20UK%20Specifications.pdf', date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh, ac_output_w, surge_w, solar_input_max_w, chemistry, weight_kg, expandable)
select id, 'power_station', 256, 300, 600, 110, 'LFP', 3.5, false from p;
with p as (
  insert into public.product_catalog (slug, item_key, category, name, brand, model, description, specs_source_url, specs_checked_on)
  values ('jackery-explorer-300-plus', 'energy.power_station', 'energy', 'Jackery Explorer 300 Plus', 'Jackery', 'Explorer 300 Plus',
          'Power station portátil. Confirme especificações, garantia e compatibilidade de painéis com o fabricante antes de comprar.',
          'https://outboundpower.com/products/jackery-explorer-300-plus-portable-power-station-288wh-300w-100w-solar-input', date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh, ac_output_w, surge_w, solar_input_max_w, chemistry, weight_kg, expandable)
select id, 'power_station', 288, 300, 600, 100, 'LFP', 3.75, false from p;
with p as (
  insert into public.product_catalog (slug, item_key, category, name, brand, model, description, specs_source_url, specs_checked_on)
  values ('bluetti-eb3a', 'energy.power_station', 'energy', 'Bluetti EB3A', 'Bluetti', 'EB3A',
          'Power station portátil. Confirme especificações, garantia e compatibilidade de painéis com o fabricante antes de comprar.',
          'https://www.bluettipower.eu/products/eb3a', date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh, ac_output_w, surge_w, solar_input_max_w, chemistry, weight_kg, expandable)
select id, 'power_station', 268, 600, 1200, 200, 'LFP', 4.6, false from p;
with p as (
  insert into public.product_catalog (slug, item_key, category, name, brand, model, description, specs_source_url, specs_checked_on)
  values ('ecoflow-river-2-pro', 'energy.power_station', 'energy', 'EcoFlow RIVER 2 Pro', 'EcoFlow', 'RIVER 2 Pro',
          'Power station portátil. Confirme especificações, garantia e compatibilidade de painéis com o fabricante antes de comprar.',
          'https://jbhifi.co.nz/products/ecoflow-river-2-pro-portable-power-station', date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh, ac_output_w, surge_w, solar_input_max_w, chemistry, weight_kg, expandable)
select id, 'power_station', 768, 800, 1600, 220, 'LFP', 7.8, false from p;
with p as (
  insert into public.product_catalog (slug, item_key, category, name, brand, model, description, specs_source_url, specs_checked_on)
  values ('ecoflow-delta-2', 'energy.power_station', 'energy', 'EcoFlow DELTA 2', 'EcoFlow', 'DELTA 2',
          'Power station portátil. Confirme especificações, garantia e compatibilidade de painéis com o fabricante antes de comprar.',
          'https://www.cliftoncameras.co.uk/uploads/specifications/EcoFlow%20DELTA%202%20UK%20Specifications.pdf', date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh, ac_output_w, surge_w, solar_input_max_w, chemistry, weight_kg, expandable)
select id, 'power_station', 1024, 1800, 2700, 500, 'LFP', 12.0, true from p;
with p as (
  insert into public.product_catalog (slug, item_key, category, name, brand, model, description, specs_source_url, specs_checked_on)
  values ('anker-solix-c1000', 'energy.power_station', 'energy', 'Anker SOLIX C1000', 'Anker SOLIX', 'C1000',
          'Power station portátil. Confirme especificações, garantia e compatibilidade de painéis com o fabricante antes de comprar.',
          'https://www.mygenerator.com.au/product/anker-solix-c1000-portable-power-station-1056wh-1800w', date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh, ac_output_w, surge_w, solar_input_max_w, chemistry, weight_kg, expandable)
select id, 'power_station', 1056, 1800, 2400, null, 'LFP', 12.9, true from p;

-- Generic portable panels: connector and voltage compatibility must be confirmed per station.
with p as (
  insert into public.product_catalog (slug, item_key, category, name, description)
  values ('gen-solar-panel-100w', 'energy.solar_panel', 'energy', 'Painel solar portátil dobrável 100 W — referência genérica',
          'Referência genérica. Verifique tensão de circuito aberto (Voc), conector e potência máxima de entrada da power station.')
  returning id
)
insert into public.product_energy_specs (product_id, kind, panel_w) select id, 'solar_panel', 100 from p;
with p as (
  insert into public.product_catalog (slug, item_key, category, name, description)
  values ('gen-solar-panel-200w', 'energy.solar_panel', 'energy', 'Painel solar portátil dobrável 200 W — referência genérica',
          'Referência genérica. Verifique tensão de circuito aberto (Voc), conector e potência máxima de entrada da power station.')
  returning id
)
insert into public.product_energy_specs (product_id, kind, panel_w) select id, 'solar_panel', 200 from p;

with p as (
  insert into public.product_catalog (slug, item_key, category, name, description, estimated_price_cents, estimate_date)
  values ('gen-powerbank-20000', 'energy.powerbank', 'energy', 'Powerbank 20 000 mAh — referência genérica',
          'Cerca de 70 Wh nominais (20 000 mAh × 3,6 V); energia útil inferior devido a perdas.', 3500, date '2026-11-08')
  returning id
)
insert into public.product_energy_specs (product_id, kind, capacity_wh) select id, 'powerbank', 72 from p;
