
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"changed_fields": (string)[] | null,"created_at": string,"family_id": string,"id": number,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"changed_fields"?: (string)[] | null,"created_at"?: string,"family_id": string,"id"?: never,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"changed_fields"?: (string)[] | null,"created_at"?: string,"family_id"?: string,"id"?: never,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"communication_plans": {
                  Row: {
                    "call_order": string | null,"calls_fail_plan": string | null,"channels": (string)[],"family_id": string,"no_internet_plan": string | null,"out_of_region_contact_id": string | null,"phones_down_meeting_point_id": string | null,"pmr446_channel": string | null,"primary_contact_id": string | null,"secondary_contact_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "call_order"?: string | null,"calls_fail_plan"?: string | null,"channels"?: (string)[],"family_id": string,"no_internet_plan"?: string | null,"out_of_region_contact_id"?: string | null,"phones_down_meeting_point_id"?: string | null,"pmr446_channel"?: string | null,"primary_contact_id"?: string | null,"secondary_contact_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "call_order"?: string | null,"calls_fail_plan"?: string | null,"channels"?: (string)[],"family_id"?: string,"no_internet_plan"?: string | null,"out_of_region_contact_id"?: string | null,"phones_down_meeting_point_id"?: string | null,"pmr446_channel"?: string | null,"primary_contact_id"?: string | null,"secondary_contact_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "communication_plans_family_id_fkey"
      columns: ["family_id"]
isOneToOne: true
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_plans_family_id_out_of_region_contact_id_fkey"
      columns: ["family_id","out_of_region_contact_id"]
isOneToOne: false
      referencedRelation: "emergency_contacts"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "communication_plans_family_id_phones_down_meeting_point_id_fkey"
      columns: ["family_id","phones_down_meeting_point_id"]
isOneToOne: false
      referencedRelation: "meeting_points"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "communication_plans_family_id_primary_contact_id_fkey"
      columns: ["family_id","primary_contact_id"]
isOneToOne: false
      referencedRelation: "emergency_contacts"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "communication_plans_family_id_secondary_contact_id_fkey"
      columns: ["family_id","secondary_contact_id"]
isOneToOne: false
      referencedRelation: "emergency_contacts"
      referencedColumns: ["family_id","id"]
    }
                  ]
                },"emergency_contacts": {
                  Row: {
                    "created_at": string,"email": string | null,"family_id": string,"id": string,"is_out_of_region": boolean,"name": string,"notes": string | null,"phone": string | null,"phone_alt": string | null,"region": string | null,"relationship": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"family_id": string,"id"?: string,"is_out_of_region"?: boolean,"name": string,"notes"?: string | null,"phone"?: string | null,"phone_alt"?: string | null,"region"?: string | null,"relationship"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"family_id"?: string,"id"?: string,"is_out_of_region"?: boolean,"name"?: string,"notes"?: string | null,"phone"?: string | null,"phone_alt"?: string | null,"region"?: string | null,"relationship"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emergency_contacts_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"emergency_plans": {
                  Row: {
                    "bag_strategy": string | null,"completed_steps": (string)[],"family_id": string,"id": string,"meeting_point_id": string | null,"notes": string | null,"scenario_key": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bag_strategy"?: string | null,"completed_steps"?: (string)[],"family_id": string,"id"?: string,"meeting_point_id"?: string | null,"notes"?: string | null,"scenario_key": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "bag_strategy"?: string | null,"completed_steps"?: (string)[],"family_id"?: string,"id"?: string,"meeting_point_id"?: string | null,"notes"?: string | null,"scenario_key"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "emergency_plans_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "emergency_plans_family_id_meeting_point_id_fkey"
      columns: ["family_id","meeting_point_id"]
isOneToOne: false
      referencedRelation: "meeting_points"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "emergency_plans_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"energy_devices": {
                  Row: {
                    "created_at": string,"family_id": string,"hours_per_day": number,"id": string,"is_ac": boolean,"is_essential": boolean,"name": string,"preset_key": string | null,"quantity": number,"surge_watts": number | null,"watts": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"family_id": string,"hours_per_day": number,"id"?: string,"is_ac"?: boolean,"is_essential"?: boolean,"name": string,"preset_key"?: string | null,"quantity"?: number,"surge_watts"?: number | null,"watts": number
                  }
                  Update: {
                    "created_at"?: string,"family_id"?: string,"hours_per_day"?: number,"id"?: string,"is_ac"?: boolean,"is_essential"?: boolean,"name"?: string,"preset_key"?: string | null,"quantity"?: number,"surge_watts"?: number | null,"watts"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "energy_devices_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "energy_profiles"
      referencedColumns: ["family_id"]
    }
                  ]
                },"energy_profiles": {
                  Row: {
                    "autonomy_days": number,"family_id": string,"inverter_efficiency": number,"panel_count": number | null,"panels_acquired": boolean,"peak_sun_hours": number,"selected_panel_product_id": string | null,"selected_station_product_id": string | null,"solar_derate": number,"station_acquired": boolean,"tier": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autonomy_days"?: number,"family_id": string,"inverter_efficiency"?: number,"panel_count"?: number | null,"panels_acquired"?: boolean,"peak_sun_hours"?: number,"selected_panel_product_id"?: string | null,"selected_station_product_id"?: string | null,"solar_derate"?: number,"station_acquired"?: boolean,"tier"?: string,"updated_at"?: string
                  }
                  Update: {
                    "autonomy_days"?: number,"family_id"?: string,"inverter_efficiency"?: number,"panel_count"?: number | null,"panels_acquired"?: boolean,"peak_sun_hours"?: number,"selected_panel_product_id"?: string | null,"selected_station_product_id"?: string | null,"solar_derate"?: number,"station_acquired"?: boolean,"tier"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "energy_profiles_family_id_fkey"
      columns: ["family_id"]
isOneToOne: true
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "energy_profiles_selected_panel_product_id_fkey"
      columns: ["selected_panel_product_id"]
isOneToOne: false
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "energy_profiles_selected_station_product_id_fkey"
      columns: ["selected_station_product_id"]
isOneToOne: false
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    }
                  ]
                },"evacuation_bag_items": {
                  Row: {
                    "acquired_via": string | null,"bag_id": string,"category": string,"created_at": string,"expires_on": string | null,"family_id": string,"id": string,"is_excluded": boolean,"is_packed": boolean,"item_key": string | null,"name": string,"notes": string | null,"packed_at": string | null,"priority": number,"product_id": string | null,"purchased_at": string | null,"purchased_by": string | null,"quantity_have": number,"quantity_required": number | null,"unit": string,"unit_weight_g": number | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_via"?: string | null,"bag_id": string,"category": string,"created_at"?: string,"expires_on"?: string | null,"family_id": string,"id"?: string,"is_excluded"?: boolean,"is_packed"?: boolean,"item_key"?: string | null,"name": string,"notes"?: string | null,"packed_at"?: string | null,"priority"?: number,"product_id"?: string | null,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity_have"?: number,"quantity_required"?: number | null,"unit"?: string,"unit_weight_g"?: number | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "acquired_via"?: string | null,"bag_id"?: string,"category"?: string,"created_at"?: string,"expires_on"?: string | null,"family_id"?: string,"id"?: string,"is_excluded"?: boolean,"is_packed"?: boolean,"item_key"?: string | null,"name"?: string,"notes"?: string | null,"packed_at"?: string | null,"priority"?: number,"product_id"?: string | null,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity_have"?: number,"quantity_required"?: number | null,"unit"?: string,"unit_weight_g"?: number | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "evacuation_bag_items_family_id_bag_id_fkey"
      columns: ["family_id","bag_id"]
isOneToOne: false
      referencedRelation: "evacuation_bags"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "evacuation_bag_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evacuation_bag_items_purchased_by_fkey"
      columns: ["purchased_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evacuation_bag_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"evacuation_bags": {
                  Row: {
                    "capacity_liters": number | null,"created_at": string,"family_id": string,"id": string,"kind": string,"last_checked_at": string | null,"name": string,"notes": string | null,"owner_member_id": string | null,"pet_id": string | null,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity_liters"?: number | null,"created_at"?: string,"family_id": string,"id"?: string,"kind": string,"last_checked_at"?: string | null,"name": string,"notes"?: string | null,"owner_member_id"?: string | null,"pet_id"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "capacity_liters"?: number | null,"created_at"?: string,"family_id"?: string,"id"?: string,"kind"?: string,"last_checked_at"?: string | null,"name"?: string,"notes"?: string | null,"owner_member_id"?: string | null,"pet_id"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evacuation_bags_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evacuation_bags_family_id_owner_member_id_fkey"
      columns: ["family_id","owner_member_id"]
isOneToOne: false
      referencedRelation: "member_profiles"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "evacuation_bags_family_id_pet_id_fkey"
      columns: ["family_id","pet_id"]
isOneToOne: false
      referencedRelation: "pets"
      referencedColumns: ["family_id","id"]
    }
                  ]
                },"families": {
                  Row: {
                    "budget_cents": number | null,"country": string,"created_at": string,"created_by": string | null,"currency": string,"id": string,"name": string,"onboarding_completed_at": string | null,"onboarding_step": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_cents"?: number | null,"country"?: string,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"id"?: string,"name": string,"onboarding_completed_at"?: string | null,"onboarding_step"?: string,"updated_at"?: string
                  }
                  Update: {
                    "budget_cents"?: number | null,"country"?: string,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"id"?: string,"name"?: string,"onboarding_completed_at"?: string | null,"onboarding_step"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "families_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"family_invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"family_id": string,"id": string,"invited_by": string | null,"revoked_at": string | null,"role": Database["public"]['Enums']["family_role"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at": string,"family_id": string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["family_role"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"family_id"?: string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["family_role"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "family_invitations_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "family_invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"family_members": {
                  Row: {
                    "family_id": string,"invited_by": string | null,"joined_at": string,"role": Database["public"]['Enums']["family_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"invited_by"?: string | null,"joined_at"?: string,"role"?: Database["public"]['Enums']["family_role"],"user_id": string
                  }
                  Update: {
                    "family_id"?: string,"invited_by"?: string | null,"joined_at"?: string,"role"?: Database["public"]['Enums']["family_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "family_members_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "family_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"home_kit_items": {
                  Row: {
                    "acquired_via": string | null,"category": string,"created_at": string,"expires_on": string | null,"family_id": string,"id": string,"is_excluded": boolean,"item_key": string | null,"name": string,"notes": string | null,"priority": number,"product_id": string | null,"purchased_at": string | null,"purchased_by": string | null,"quantity_have": number,"quantity_required": number | null,"storage_location": string | null,"unit": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_via"?: string | null,"category": string,"created_at"?: string,"expires_on"?: string | null,"family_id": string,"id"?: string,"is_excluded"?: boolean,"item_key"?: string | null,"name": string,"notes"?: string | null,"priority"?: number,"product_id"?: string | null,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity_have"?: number,"quantity_required"?: number | null,"storage_location"?: string | null,"unit"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "acquired_via"?: string | null,"category"?: string,"created_at"?: string,"expires_on"?: string | null,"family_id"?: string,"id"?: string,"is_excluded"?: boolean,"item_key"?: string | null,"name"?: string,"notes"?: string | null,"priority"?: number,"product_id"?: string | null,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity_have"?: number,"quantity_required"?: number | null,"storage_location"?: string | null,"unit"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_kit_items_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "home_kits"
      referencedColumns: ["family_id"]
    },{
      foreignKeyName: "home_kit_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_kit_items_purchased_by_fkey"
      columns: ["purchased_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_kit_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"home_kits": {
                  Row: {
                    "family_id": string,"hot_climate": boolean,"include_hygiene_water": boolean,"last_reviewed_at": string | null,"target_days": number,"updated_at": string,"water_adult_l_per_day": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"hot_climate"?: boolean,"include_hygiene_water"?: boolean,"last_reviewed_at"?: string | null,"target_days"?: number,"updated_at"?: string,"water_adult_l_per_day"?: number | null
                  }
                  Update: {
                    "family_id"?: string,"hot_climate"?: boolean,"include_hygiene_water"?: boolean,"last_reviewed_at"?: string | null,"target_days"?: number,"updated_at"?: string,"water_adult_l_per_day"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_kits_family_id_fkey"
      columns: ["family_id"]
isOneToOne: true
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"household_profiles": {
                  Row: {
                    "address_line": string | null,"country": string,"district": string | null,"dwelling_type": Database["public"]['Enums']["dwelling_type"] | null,"family_id": string,"floors": number | null,"has_electric_stove": boolean,"has_fireplace": boolean,"has_garage": boolean,"has_garden": boolean,"has_gas": boolean,"has_generator": boolean,"has_home_battery": boolean,"has_solar_panels": boolean,"has_storage_room": boolean,"has_well": boolean,"municipality": string | null,"parish": string | null,"selected_risks": (string)[] | null,"storage_space": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"country"?: string,"district"?: string | null,"dwelling_type"?: Database["public"]['Enums']["dwelling_type"] | null,"family_id": string,"floors"?: number | null,"has_electric_stove"?: boolean,"has_fireplace"?: boolean,"has_garage"?: boolean,"has_garden"?: boolean,"has_gas"?: boolean,"has_generator"?: boolean,"has_home_battery"?: boolean,"has_solar_panels"?: boolean,"has_storage_room"?: boolean,"has_well"?: boolean,"municipality"?: string | null,"parish"?: string | null,"selected_risks"?: (string)[] | null,"storage_space"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string | null,"country"?: string,"district"?: string | null,"dwelling_type"?: Database["public"]['Enums']["dwelling_type"] | null,"family_id"?: string,"floors"?: number | null,"has_electric_stove"?: boolean,"has_fireplace"?: boolean,"has_garage"?: boolean,"has_garden"?: boolean,"has_gas"?: boolean,"has_generator"?: boolean,"has_home_battery"?: boolean,"has_solar_panels"?: boolean,"has_storage_room"?: boolean,"has_well"?: boolean,"municipality"?: string | null,"parish"?: string | null,"selected_risks"?: (string)[] | null,"storage_space"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_profiles_family_id_fkey"
      columns: ["family_id"]
isOneToOne: true
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_items": {
                  Row: {
                    "acquired_on": string | null,"category": string,"condition": string,"created_at": string,"expires_on": string | null,"family_id": string,"id": string,"last_maintained_on": string | null,"maintenance_interval_days": number | null,"name": string,"notes": string | null,"quantity": number,"storage_location": string | null,"unit": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_on"?: string | null,"category"?: string,"condition"?: string,"created_at"?: string,"expires_on"?: string | null,"family_id": string,"id"?: string,"last_maintained_on"?: string | null,"maintenance_interval_days"?: number | null,"name": string,"notes"?: string | null,"quantity"?: number,"storage_location"?: string | null,"unit"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "acquired_on"?: string | null,"category"?: string,"condition"?: string,"created_at"?: string,"expires_on"?: string | null,"family_id"?: string,"id"?: string,"last_maintained_on"?: string | null,"maintenance_interval_days"?: number | null,"name"?: string,"notes"?: string | null,"quantity"?: number,"storage_location"?: string | null,"unit"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_items_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_point_responsibles": {
                  Row: {
                    "family_id": string,"meeting_point_id": string,"member_profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"meeting_point_id": string,"member_profile_id": string
                  }
                  Update: {
                    "family_id"?: string,"meeting_point_id"?: string,"member_profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_point_responsibles_family_id_meeting_point_id_fkey"
      columns: ["family_id","meeting_point_id"]
isOneToOne: false
      referencedRelation: "meeting_points"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "meeting_point_responsibles_family_id_member_profile_id_fkey"
      columns: ["family_id","member_profile_id"]
isOneToOne: false
      referencedRelation: "member_profiles"
      referencedColumns: ["family_id","id"]
    }
                  ]
                },"meeting_points": {
                  Row: {
                    "access_instructions": string | null,"address": string | null,"created_at": string,"description": string | null,"family_id": string,"id": string,"kind": string,"latitude": number | null,"longitude": number | null,"name": string,"scenario_keys": (string)[],"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_instructions"?: string | null,"address"?: string | null,"created_at"?: string,"description"?: string | null,"family_id": string,"id"?: string,"kind": string,"latitude"?: number | null,"longitude"?: number | null,"name": string,"scenario_keys"?: (string)[],"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "access_instructions"?: string | null,"address"?: string | null,"created_at"?: string,"description"?: string | null,"family_id"?: string,"id"?: string,"kind"?: string,"latitude"?: number | null,"longitude"?: number | null,"name"?: string,"scenario_keys"?: (string)[],"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_points_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"member_health": {
                  Row: {
                    "allergies": string | null,"consent_at": string,"consent_by": string | null,"family_id": string,"health_needs": string | null,"include_on_card": boolean,"medication": string | null,"member_profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergies"?: string | null,"consent_at": string,"consent_by"?: string | null,"family_id": string,"health_needs"?: string | null,"include_on_card"?: boolean,"medication"?: string | null,"member_profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "allergies"?: string | null,"consent_at"?: string,"consent_by"?: string | null,"family_id"?: string,"health_needs"?: string | null,"include_on_card"?: boolean,"medication"?: string | null,"member_profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_health_consent_by_fkey"
      columns: ["consent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_health_family_id_member_profile_id_fkey"
      columns: ["family_id","member_profile_id"]
isOneToOne: false
      referencedRelation: "member_profiles"
      referencedColumns: ["family_id","id"]
    }
                  ]
                },"member_profiles": {
                  Row: {
                    "age_years": number | null,"category": Database["public"]['Enums']["member_category"],"clothing_notes": string | null,"comfort_items": string | null,"created_at": string,"dietary_needs": string | null,"display_name": string,"family_id": string,"id": string,"infant_feeding": string | null,"linked_user_id": string | null,"reduced_mobility": boolean,"responsible_member_id": string | null,"sort_order": number,"special_equipment": string | null,"transport_equipment": string | null,"updated_at": string,"uses_diapers": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "age_years"?: number | null,"category": Database["public"]['Enums']["member_category"],"clothing_notes"?: string | null,"comfort_items"?: string | null,"created_at"?: string,"dietary_needs"?: string | null,"display_name": string,"family_id": string,"id"?: string,"infant_feeding"?: string | null,"linked_user_id"?: string | null,"reduced_mobility"?: boolean,"responsible_member_id"?: string | null,"sort_order"?: number,"special_equipment"?: string | null,"transport_equipment"?: string | null,"updated_at"?: string,"uses_diapers"?: boolean
                  }
                  Update: {
                    "age_years"?: number | null,"category"?: Database["public"]['Enums']["member_category"],"clothing_notes"?: string | null,"comfort_items"?: string | null,"created_at"?: string,"dietary_needs"?: string | null,"display_name"?: string,"family_id"?: string,"id"?: string,"infant_feeding"?: string | null,"linked_user_id"?: string | null,"reduced_mobility"?: boolean,"responsible_member_id"?: string | null,"sort_order"?: number,"special_equipment"?: string | null,"transport_equipment"?: string | null,"updated_at"?: string,"uses_diapers"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_profiles_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_profiles_family_id_responsible_member_id_fkey"
      columns: ["family_id","responsible_member_id"]
isOneToOne: false
      referencedRelation: "member_profiles"
      referencedColumns: ["family_id","id"]
    },{
      foreignKeyName: "member_profiles_linked_user_id_fkey"
      columns: ["linked_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pets": {
                  Row: {
                    "approx_weight_kg": number | null,"created_at": string,"documents_notes": string | null,"family_id": string,"food_notes": string | null,"has_carrier": boolean,"has_microchip": boolean,"id": string,"medication": string | null,"name": string,"quantity": number,"species": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approx_weight_kg"?: number | null,"created_at"?: string,"documents_notes"?: string | null,"family_id": string,"food_notes"?: string | null,"has_carrier"?: boolean,"has_microchip"?: boolean,"id"?: string,"medication"?: string | null,"name": string,"quantity"?: number,"species": string,"updated_at"?: string
                  }
                  Update: {
                    "approx_weight_kg"?: number | null,"created_at"?: string,"documents_notes"?: string | null,"family_id"?: string,"food_notes"?: string | null,"has_carrier"?: boolean,"has_microchip"?: boolean,"id"?: string,"medication"?: string | null,"name"?: string,"quantity"?: number,"species"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pets_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"product_catalog": {
                  Row: {
                    "brand": string | null,"category": string,"created_at": string,"data_status": string,"description": string | null,"estimate_date": string | null,"estimated_price_cents": number | null,"id": string,"image_url": string | null,"is_active": boolean,"item_key": string | null,"model": string | null,"name": string,"slug": string,"specs_checked_on": string | null,"specs_source_url": string | null,"unit_label": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"category": string,"created_at"?: string,"data_status"?: string,"description"?: string | null,"estimate_date"?: string | null,"estimated_price_cents"?: number | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"item_key"?: string | null,"model"?: string | null,"name": string,"slug": string,"specs_checked_on"?: string | null,"specs_source_url"?: string | null,"unit_label"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "brand"?: string | null,"category"?: string,"created_at"?: string,"data_status"?: string,"description"?: string | null,"estimate_date"?: string | null,"estimated_price_cents"?: number | null,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"item_key"?: string | null,"model"?: string | null,"name"?: string,"slug"?: string,"specs_checked_on"?: string | null,"specs_source_url"?: string | null,"unit_label"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"product_energy_specs": {
                  Row: {
                    "ac_output_w": number | null,"capacity_wh": number | null,"chemistry": string | null,"expandable": boolean | null,"kind": string,"max_expanded_wh": number | null,"panel_w": number | null,"product_id": string,"solar_input_max_w": number | null,"surge_w": number | null,"warranty_years": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ac_output_w"?: number | null,"capacity_wh"?: number | null,"chemistry"?: string | null,"expandable"?: boolean | null,"kind": string,"max_expanded_wh"?: number | null,"panel_w"?: number | null,"product_id": string,"solar_input_max_w"?: number | null,"surge_w"?: number | null,"warranty_years"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "ac_output_w"?: number | null,"capacity_wh"?: number | null,"chemistry"?: string | null,"expandable"?: boolean | null,"kind"?: string,"max_expanded_wh"?: number | null,"panel_w"?: number | null,"product_id"?: string,"solar_input_max_w"?: number | null,"surge_w"?: number | null,"warranty_years"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_energy_specs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: true
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    }
                  ]
                },"product_prices": {
                  Row: {
                    "checked_at": string,"id": string,"price_cents": number,"product_id": string,"source": string,"store": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_at": string,"id"?: string,"price_cents": number,"product_id": string,"source"?: string,"store": string,"url"?: string | null
                  }
                  Update: {
                    "checked_at"?: string,"id"?: string,"price_cents"?: number,"product_id"?: string,"source"?: string,"store"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_prices_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"locale": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminders": {
                  Row: {
                    "completed_at": string | null,"completed_by": string | null,"completed_items": (string)[],"created_at": string,"due_on": string,"family_id": string,"id": string,"kind": string,"notes": string | null,"recurrence_months": number | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"completed_items"?: (string)[],"created_at"?: string,"due_on": string,"family_id": string,"id"?: string,"kind": string,"notes"?: string | null,"recurrence_months"?: number | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"completed_items"?: (string)[],"created_at"?: string,"due_on"?: string,"family_id"?: string,"id"?: string,"kind"?: string,"notes"?: string | null,"recurrence_months"?: number | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_list_items": {
                  Row: {
                    "category": string,"created_at": string,"created_by": string | null,"estimated_unit_price_cents": number | null,"family_id": string,"id": string,"name": string,"notes": string | null,"priority": number,"product_id": string | null,"purchased_at": string | null,"purchased_by": string | null,"quantity": number,"status": string,"store": string | null,"unit": string,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"created_by"?: string | null,"estimated_unit_price_cents"?: number | null,"family_id": string,"id"?: string,"name": string,"notes"?: string | null,"priority"?: number,"product_id"?: string | null,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity"?: number,"status"?: string,"store"?: string | null,"unit"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"created_by"?: string | null,"estimated_unit_price_cents"?: number | null,"family_id"?: string,"id"?: string,"name"?: string,"notes"?: string | null,"priority"?: number,"product_id"?: string | null,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity"?: number,"status"?: string,"store"?: string | null,"unit"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_list_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_purchased_by_fkey"
      columns: ["purchased_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "action_key": string | null,"assignee_user_id": string | null,"completed_at": string | null,"completed_by": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_on": string | null,"family_id": string,"id": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_key"?: string | null,"assignee_user_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_on"?: string | null,"family_id": string,"id"?: string,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "action_key"?: string | null,"assignee_user_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_on"?: string | null,"family_id"?: string,"id"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_family_id_assignee_user_id_fkey"
      columns: ["family_id","assignee_user_id"]
isOneToOne: false
      referencedRelation: "family_members"
      referencedColumns: ["family_id","user_id"]
    },{
      foreignKeyName: "tasks_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"complete_reminder":
{ Args: { "p_completed_items"?: (string)[],"p_reminder_id": string }; Returns: string
                           },
"consume_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"create_family":
{ Args: { "p_name": string }; Returns: string
                           },
"invitation_preview":
{ Args: { "p_token": string }; Returns: {
              "email": string,"expires_at": string,"family_name": string,"inviter_name": string,"role": Database["public"]['Enums']["family_role"],"status": string
            }[]
                           }
          }
          Enums: {
            "dwelling_type": "apartment"|"house"|"farm"|"other","family_role": "viewer"|"member"|"editor"|"admin","member_category": "adult"|"child"|"baby"|"senior"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "dwelling_type": ["apartment", "house", "farm", "other"],"family_role": ["viewer", "member", "editor", "admin"],"member_category": ["adult", "child", "baby", "senior"]
          }
        }
} as const
