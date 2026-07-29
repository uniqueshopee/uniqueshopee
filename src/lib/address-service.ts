"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CheckoutAddress = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  type: "Home" | "Office" | "Other";
  isDefault?: boolean;
  landmark?: string;
  area?: string;
};

type AddressRow = {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  area: string | null;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  address_type: "home" | "office" | "other";
  is_default: boolean;
  deleted_at: string | null;
};

async function getClient(client?: SupabaseClient | null) {
  return client ?? getSupabaseBrowserClient();
}

export function mapAddressRow(row: AddressRow): CheckoutAddress {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone,
    line1: row.line1,
    line2: [row.line2, row.landmark, row.area].filter(Boolean).join(", "),
    city: row.city,
    state: row.state,
    pin: row.pin_code,
    type: row.address_type === "office" ? "Office" : row.address_type === "other" ? "Other" : "Home",
    isDefault: row.is_default,
    landmark: row.landmark ?? undefined,
    area: row.area ?? undefined,
  };
}

export async function loadUserAddresses(userId: string, client?: SupabaseClient | null) {
  const resolvedClient = await getClient(client);
  if (!resolvedClient) {
    return [] as CheckoutAddress[];
  }

  const { data, error } = await resolvedClient
    .from("addresses")
    .select("id, full_name, phone, alternate_phone, line1, line2, landmark, area, city, state, country, pin_code, address_type, is_default, deleted_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return [] as CheckoutAddress[];
  }

  return ((data ?? []) as AddressRow[]).map(mapAddressRow);
}
