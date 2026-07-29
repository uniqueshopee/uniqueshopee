import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";

type WishlistRow = {
  product_id: string;
  deleted_at: string | null;
};

async function getClient(client?: SupabaseClient | null) {
  return client ?? getSupabaseBrowserClient();
}

export async function loadRemoteWishlistProductIds(userId: string, client?: SupabaseClient | null) {
  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return [] as string[];
  }

  const profile = await ensureCurrentUserProfile(resolvedClient);
  if (!profile || profile.id !== userId) {
    return [] as string[];
  }

  const { data, error } = await resolvedClient
    .from("wishlist_items")
    .select("product_id, deleted_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return [] as string[];
  }

  return Array.from(new Set(((data ?? []) as WishlistRow[]).map((row) => row.product_id).filter(Boolean)));
}

export async function replaceRemoteWishlistItems(
  userId: string,
  productIds: string[],
  client?: SupabaseClient | null,
) {
  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return { error: "Supabase is not configured." };
  }

  const profile = await ensureCurrentUserProfile(resolvedClient);
  if (!profile || profile.id !== userId) {
    return { error: "Your account is still being prepared. Please try again." };
  }

  const normalized = Array.from(new Set(productIds.filter((value) => typeof value === "string" && value.trim().length > 0)));

  const deleteResult = await resolvedClient.from("wishlist_items").delete().eq("user_id", userId);
  if (deleteResult.error) {
    return { error: deleteResult.error.message };
  }

  if (normalized.length === 0) {
    return { error: null };
  }

  const rows = normalized.map((productId) => ({
    user_id: userId,
    product_id: productId,
    product_variant_id: null,
  }));

  const { error } = await resolvedClient.from("wishlist_items").insert(rows);
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function mergeWishlistItemSets(base: string[], addition: string[]) {
  return Array.from(new Set([...base, ...addition]));
}
