import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const PINCODE_REGEX = /^\d{6}$/;
export const INVALID_PINCODE_MESSAGE = "Enter a valid 6-digit pincode";
export const UNAVAILABLE_PINCODE_MESSAGE = "Delivery is not available at this pincode";
export const ADDRESS_UNAVAILABLE_PINCODE_MESSAGE = "Pincode is not available for delivery";
export const FREE_DELIVERY_SETTING_KEY = "checkout_shipping_policy";
export const DEFAULT_FREE_DELIVERY_THRESHOLD = 5000;

export type FreeDeliveryConfig = {
  enabled: boolean;
  threshold: number;
  flatRate: number;
};

export function parseFreeDeliveryConfig(value: unknown): FreeDeliveryConfig {
  let parsedValue = value;
  if (typeof parsedValue === "string") {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      parsedValue = null;
    }
  }
  const policy = parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
    ? parsedValue as Record<string, unknown>
    : {};
  const threshold = Number(policy.free_over);
  const flatRate = Number(policy.flat_rate);
  return {
    enabled: policy.enabled !== false,
    threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_FREE_DELIVERY_THRESHOLD,
    flatRate: Number.isFinite(flatRate) && flatRate >= 0 ? flatRate : 99,
  };
}

export async function loadFreeDeliveryConfig(
  client: SupabaseClient<Database> | null,
): Promise<FreeDeliveryConfig | null> {
  if (!client) return null;

  const { data, error } = await client
    .from("settings")
    .select("value")
    .eq("key", FREE_DELIVERY_SETTING_KEY)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data?.value) return null;
  const config = parseFreeDeliveryConfig(data.value);
  let parsedValue = data.value;
  if (typeof parsedValue === "string") {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      return null;
    }
  }
  if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) return null;
  const policy = parsedValue as Record<string, unknown>;
  const threshold = Number(policy.free_over);
  const flatRate = Number(policy.flat_rate);
  if (!Number.isFinite(threshold) || threshold <= 0 || !Number.isFinite(flatRate) || flatRate < 0) return null;
  return config;
}

export function getResolvedCartTaxableAmount(
  items: Array<{ price: number; finalUnitPrice?: number; quantity: number }>,
) {
  return Math.round(
    items.reduce((sum, item) => sum + (item.finalUnitPrice ?? item.price) * item.quantity, 0) * 100,
  ) / 100;
}

export function getConfiguredShippingAmount(config: FreeDeliveryConfig, qualifyingAmount: number) {
  return qualifyingAmount >= config.threshold ? 0 : config.flatRate;
}

export type DeliveryCheckResult = {
  normalizedPincode: string;
  isValid: boolean;
  isServiceable: boolean;
  error: string | null;
};

export async function checkDeliveryPincode(
  client: SupabaseClient<Database> | null,
  value: string,
): Promise<DeliveryCheckResult> {
  const normalizedPincode = value.trim();
  if (!PINCODE_REGEX.test(normalizedPincode)) {
    return { normalizedPincode, isValid: false, isServiceable: false, error: INVALID_PINCODE_MESSAGE };
  }

  if (!client) {
    return { normalizedPincode, isValid: true, isServiceable: false, error: "Supabase is not configured." };
  }

  const { data, error } = await client.rpc("check_delivery_pincode", { p_pincode: normalizedPincode });
  if (error) {
    return { normalizedPincode, isValid: true, isServiceable: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const result = (row ?? {}) as { normalized_pincode?: string; is_valid?: boolean; is_serviceable?: boolean };
  return {
    normalizedPincode: result.normalized_pincode ?? normalizedPincode,
    isValid: Boolean(result.is_valid),
    isServiceable: Boolean(result.is_serviceable),
    error: null,
  };
}
