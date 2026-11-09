-- Reference prices for brand products.
--
-- These are prices observed in public listings (store, link and date kept
-- with the row). They are NOT live prices or offers: the UI labels them
-- "preço de referência" with the source and date. Verified store prices
-- still belong in product_prices (see docs/CATALOGUE.md).

alter table public.product_catalog
  add column price_reference_label text check (price_reference_label is null or char_length(price_reference_label) <= 160),
  add column price_reference_url text check (price_reference_url is null or price_reference_url ~ '^https://');

update public.product_catalog set estimated_price_cents = 22999, estimate_date = date '2026-11-09',
  price_reference_label = 'Smartify.pt (data da listagem não indicada)',
  price_reference_url = 'https://smartify.pt/en/products/river-2-ecoflow-gerador-inteligente-portatil-a-bateria'
where slug = 'ecoflow-river-2';

update public.product_catalog set estimated_price_cents = 54900, estimate_date = date '2026-11-09',
  price_reference_label = 'MediaMarkt Bélgica (data da listagem não indicada)',
  price_reference_url = 'https://www.mediamarkt.be/en/product/_ecoflow-power-station-river-2-pro-power-station-2136637.html'
where slug = 'ecoflow-river-2-pro';

update public.product_catalog set estimated_price_cents = 99900, estimate_date = date '2026-11-09',
  price_reference_label = 'Smartify.pt (data da listagem não indicada)',
  price_reference_url = 'https://smartify.pt/en/products/delta-2-ecoflow-gerador-inteligente-portatil-a-bateria'
where slug = 'ecoflow-delta-2';

update public.product_catalog set estimated_price_cents = 30500, estimate_date = date '2026-11-09',
  price_reference_label = 'Berger Camping, Alemanha (data da listagem não indicada)',
  price_reference_url = 'https://berger-camping.com/item/jackery-powerstation-explorer-300-plus-392990'
where slug = 'jackery-explorer-300-plus';

update public.product_catalog set estimated_price_cents = 27243, estimate_date = date '2025-07-08',
  price_reference_label = 'Amazon, promoção Prime Day 2025 (noticiado pela 4gnews)',
  price_reference_url = 'https://4gnews.pt/ofertas-do-prime-day-2025-gerador-solar-bluetti-eb3a-com-desconto-32-na-amazon/'
where slug = 'bluetti-eb3a';

update public.product_catalog set estimated_price_cents = 79900, estimate_date = date '2026-11-09',
  price_reference_label = 'PcComponentes.pt, versão C1000X (data da listagem não indicada)',
  price_reference_url = 'https://www.pccomponentes.pt/estacao-de-energia-anker-solix-c1000x-1056wh-4-portas-ac-4-portas-usb-bateria-lifepo4-carregador-solar-wi-fi-lcd'
where slug = 'anker-solix-c1000';
