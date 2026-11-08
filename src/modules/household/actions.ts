"use server";

import { z } from "zod";
import { check, familyAction } from "@/lib/actions";
import { DISTRICTS, RISKS } from "@/domain/locations/portugal";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalNumber, optionalText, stringArray } from "@/lib/zod-helpers";

const RISK_KEYS = RISKS.map((r) => r.key) as [string, ...string[]];
const DISTRICT_SLUGS = DISTRICTS.map((d) => d.slug) as [string, ...string[]];

const householdSchema = z.object({
  dwelling_type: z.preprocess((v) => (v === "" ? null : v), z.enum(["apartment", "house", "farm", "other"]).nullable()),
  floors: optionalNumber(0, 200),
  has_garage: checkbox,
  has_garden: checkbox,
  has_storage_room: checkbox,
  has_fireplace: checkbox,
  has_gas: checkbox,
  has_electric_stove: checkbox,
  has_solar_panels: checkbox,
  has_home_battery: checkbox,
  has_generator: checkbox,
  has_well: checkbox,
  storage_space: z.preprocess((v) => (v === "" ? null : v), z.enum(["small", "medium", "large"]).nullable()),
  district: z.preprocess((v) => (v === "" ? null : v), z.enum(DISTRICT_SLUGS).nullable()),
  municipality: optionalText(80),
  parish: optionalText(120),
  address_line: optionalText(200),
  risks_mode: z.enum(["default", "custom"]).default("default"),
  risks: stringArray.pipe(z.array(z.enum(RISK_KEYS))),
});

export const saveHousehold = familyAction("editor", householdSchema, async ({ risks_mode, risks, floors, ...fields }, ctx) => {
  const supabase = await createClient();
  check(
    await supabase
      .from("household_profiles")
      .update({ ...fields, floors: floors == null ? null : Math.round(floors), selected_risks: risks_mode === "custom" ? risks : null })
      .eq("family_id", ctx.family.id),
  );
  return { ok: true, message: "Habitação e localização guardadas." };
});
