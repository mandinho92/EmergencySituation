# Scenario content

Location: `src/content/scenarios/pt-PT.ts` (18 scenarios), types in `types.ts`.

## Status: validation pending — launch blocker

The procedures were written from widely published public guidance of Portuguese authorities (ANEPC, DGS, INEM, IPMA) and general civil-protection practice (e.g. "baixar, proteger, aguardar" for earthquakes; no generators indoors; do not cross flooded roads; 112 / SNS 24 808 24 24 24 / CIAV 800 250 250). They have **not** been reviewed line by line against the official documents. `CONTENT_STATUS.validated = false` and the UI shows this on every scenario.

Before public launch:
1. A qualified reviewer compares each scenario with the current official ANEPC/DGS/INEM/IPMA publications and records the exact source document and date in `sources`.
2. Corrections are made in a pull request; set `CONTENT_STATUS.validated = true` and bump `version`.
3. Re-review at least annually and whenever authorities publish new guidance.

## Structure per scenario

`immediate`, `dont`, `stayHome`, `evacuate`, `equipment`, `kitStrategy`, `meetingPoint` (kind), `communication`, `checklist` (items may target `children`, `pets`, `mobility`, `seniors`), `after`, `adaptations`, `sources`.

The private scenario page adapts the checklist and adaptations to the household and shows the family's meeting point (scenario-specific choice → point tagged with the scenario → point of the recommended kind), the kit to use and the communication contacts.

## Adding a locale

Add `src/content/scenarios/<locale>.ts` with the same keys and register it in `index.ts`. Scenario and checklist ids must stay identical across locales because `emergency_plans.completed_steps` stores them.
