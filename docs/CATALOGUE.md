# Product catalogue

## Rules

1. No invented prices, stock, specifications or compatibility.
2. No fake store integrations or guessed deep links.
3. Every price shown is either a **verified price** (`product_prices`: store, price, URL, `checked_at`) or a **planning estimate** (`product_catalog.estimated_price_cents` + `estimate_date`), and the UI labels which one ("≈ estimativa" vs "verificado em …").
4. `data_status = 'demo'` rows are shown with a "Demonstração" badge.

## Current seed (`20261108000006_catalogue_seed.sql`)

- ~100 generic references keyed by engine `item_key` (`water.stored`, `food.rice`, `bag.lighting.headlamp`, …) with planning estimates dated 2026-11-08. These are rough retail orders of magnitude for budgeting only and have **not** been checked against stores.
- 6 power stations (EcoFlow RIVER 2, RIVER 2 Pro, DELTA 2; Jackery Explorer 300 Plus; Bluetti EB3A; Anker SOLIX C1000) with capacity, AC output, surge, solar input, chemistry, weight and expandability cross-checked against public retailer/manufacturer listings (source URL stored per product). Anker C1000 maximum solar input could not be confirmed and is stored as unknown. **No prices.**
- 2 generic portable panels (100 W, 200 W) and a generic 20 000 mAh powerbank.

## Reference prices (`20261109000007_reference_prices.sql`)

Brand power stations carry a **reference price**: a price observed in a public listing, stored with the source label, link and consultation date (`price_reference_label`, `price_reference_url`, `estimate_date`). The UI shows it as "≈ … · Preço de referência · <fonte> · consultado <data>" with a link. It is not an offer: listings did not show their own date, some are from other EU countries (Belgium, Germany) or past promotions (Bluetti EB3A, Prime Day 2025). Replace them with verified `product_prices` rows when the catalogue process below is in place. Price order between reference prices is used to pick the cheapest station that covers the need.

## Maintenance process (to put in place before presenting offers)

1. Catalogue owner verifies the product page at the store, records `product_prices` (store, price, https URL, `checked_at`) using the service role (SQL migration or admin script).
2. Mark the product `data_status = 'verified'` after checking specifications against the manufacturer datasheet.
3. Re-check prices on a fixed cadence (e.g. monthly); the UI always shows the check date.
4. Only use partner feeds (`source = 'partner_feed'`) from authorised affiliate/product programmes.
5. Compatibility between panels and stations (Voc, connector, max input) must come from the manufacturer; until then the UI tells users to confirm.

Clients can only read the catalogue (RLS); there is no client write path.
