# Calculation engine

Code: `src/domain/**` (pure functions). Tests: `src/domain/__tests__`. Reference values: `src/domain/preparedness/reference.ts` (`REFERENCE_VERSION`).

All outputs are **planning references**, not medical, nutritional or engineering advice. The UI states this next to every result. When a value changes, update this file and the tests in the same commit.

## Inputs

Household snapshot: members (category adult/child/baby/senior, age, reduced mobility, dietary needs, special equipment, diapers, infant feeding, responsible adult), pets (species, quantity, weight, medication), dwelling (type, floors, gas, electric stove, fireplace, generator, well, …), effective risks (family selection or district defaults), communication channels. HOME KIT settings: target days (1–60), optional adult water override, hygiene water on/off, hot climate.

Health data (`member_health`) is **not** an engine input, so results are identical for every role and no item reveals who takes medication. Medication appears as universal "if applicable" items.

## Water (`water.ts`)

| Category | Drinking | Cooking | Hygiene | Total L/day |
|---|---|---|---|---|
| Adult / senior | 2.5 | 1.0 | 1.5 | 5.0 |
| Child | 1.5 | 0.75 | 1.0 | 3.25 |
| Baby | 0.8 (formula prep) | 0.25 | 1.0 | 2.05 |

- Hot climate: drinking × 1.5.
- Adult override scales every person proportionally.
- Pets: dog 0.06 L/kg/day, cat 0.05, rabbit 0.1, others 0.25 L/day.
- Total = (Σ daily × days) × 1.10 reserve, rounded up; containers = ⌈total / 5 L⌉.
- Rationale: drinking within humanitarian survival ranges (≈2.5–3 L), plus minimal cooking and hygiene. The engine always warns that heat, effort, pregnancy, breastfeeding and illness increase needs.

## Food (`food.ts`)

Person-day equivalents: adult 1, senior 0.9, child <4 → 0.5, 4–8 → 0.7, 9–17 → 0.9 (unknown age 0.7), baby 0 (handled separately).

Per equivalent-day: rice 75 g, pasta 75 g, cereals 50 g, canned protein 1 tin, legumes 0.5 jar, snacks 80 g. UHT milk 0.25 L/adult, 0.5 L/child. Babies: formula or baby food expressed **in days** (quantities depend on product and paediatric guidance). Declared dietary needs add a "special diet" reserve in days. Pet food: dog 20 g/kg/day, cat 15 g/kg/day, rabbit 30 g/kg/day (manufacturer guidance prevails).

**Food autonomy** = ⌊min over essential groups⌋, where carbs and protein groups are Σ have / Σ daily need (items substitute each other) and infant lines are the scarcest single line.

## HOME KIT (`home-kit.ts`)

17 categories. Notable rules:
- Camping stove + cartridges (1 per 2 days) only without gas.
- CO detector is P0 with fireplace, gas or generator.
- Smoke detectors: 1 per floor (max 4); apartments 1.
- Flood barriers only for non-apartments in flood-risk areas; furniture straps with seismic risk.
- FFP2 P1 with wildfire or seismic risk; blankets P1 with cold-wave risk.
- PMR446 P1 when the communication plan uses it, otherwise P3.
- Diapers: 6/day per baby (<2 y or flagged), 5/day per flagged child.
- Hygiene: toilet paper 0.35 roll/person/day; wipes 1 pack/6 person-days (+1/3 baby-days); soap 0.25/person/week; sanitiser ⅓ bottle/person/week; trash bags 0.5/person/day (rolls of 20); emergency toilet bags 3/person/day.
- First aid kit: 1 per household (2 if >6 people). Medicines: never quantified; rationale always points to a doctor/pharmacist/paediatrician/vet (asserted in tests).

## GO BAGS (`go-bag.ts`)

- Duration 72 h. Adult bag ≈ 2 L water + purification; 6 energy bars; full category set (13 categories).
- Shared items (radio) only in the primary (first adult) bag.
- Babies and children without their own bag: items in the responsible adult's bag (fallback: first adult bag).
- Child bags are offered (never forced) from age 6, lightweight template.
- Pets: own kit if created, otherwise in the primary bag.
- Weight = Σ quantity × unit weight. Planning limits: child <6: 2 kg, 6–11: 4 kg, 12–17: 7 kg, senior/reduced mobility: 8 kg, adult: 12 kg.

## Energy (`energy.ts`)

```
device Wh/day   = W × h × qty
battery Wh/day  = Σ device Wh / (AC ? inverter_eff (0.85) : DC_eff (0.90))
recommended Wh  = battery Wh/day × autonomy_days / usable_fraction (0.85)
AC output W     = Σ AC W × 1.25
surge W         = Σ AC W + max(surge − W)
solar W (1 day) = battery Wh/day / (peak_sun_hours × derate)
station autonomy= capacity × 0.85 / battery Wh/day
solar harvest   = min(array W, station max input) × PSH × derate
recharge days   = capacity / harvest
```

Tier = smallest band that covers the need (powerbanks ≤150 Wh with no AC loads; economic ≤500; balanced ≤1000; advanced ≤2000; above → "beyond portable", user told to reduce loads or consult an installer).

Station picking: *recommended* = cheapest station meeting capacity **and** power; *economic* = a smaller/cheaper station meeting power (less autonomy, shown); *larger* = next capacity up. Unknown prices → capacity used as cost proxy. Never escalates beyond the need (tested).

## Budget (`budget.ts`)

Greedy by priority, then cheapest first. If a line of priority P does not fit, the remaining budget is reserved for it and lower priorities are not allocated. Nothing is removed from the list; unpriced lines are reported separately.

## Readiness (`readiness.ts`)

Sub-scores 0–100: water (have/required), food (autonomy/target), GO BAGS (priority-weighted packed coverage × adult bags present/adults), first aid, safety (fire+protection+tools), energy (basic lighting/powerbanks; 50 % from station if a station tier was chosen), plan (meeting points near/out 30 % each, contacts 20 %, location 20 %), communication (primary 20, out-of-region 25, ≥2 channels 15, no-internet plan 20, calls-fail plan 20).

Global weights: water 15, food 15, GO BAGS 15, first aid 10, safety 10, energy 10, plan 15, communication 10.

Priority weights for coverage: P0 4, P1 3, P2 2, P3 1. A bag is "ready" when all P0 and P1 items are packed. Top 5 actions are ranked (water gap first, then bags, food, meeting points, out-of-region contact, essentials, expiries, reviews, …).

## Alerts (`alerts.ts`)

Expired; expiring ≤30 days (medication/water/first aid = high); `needs_recharge`/`needs_maintenance`/`damaged`; maintenance interval due within 7 days; bags not checked for 90 days; reviews due within 7 days or overdue.

## Regional risks (`locations/portugal.ts`)

Universal: power, water, telecom outages, storm, strong wind, heat wave. "High" overlays (indicative, not official): earthquake — Lisboa, Setúbal, Faro, Santarém, Açores; wildfire — most mainland districts and Madeira; flood — Santarém, Coimbra, Lisboa, Porto, Madeira; cold wave — Bragança, Guarda, Vila Real, Viseu. The family can override; the UI points to municipal civil protection and ANEPC.
