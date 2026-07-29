"use client";

const GUEST_WISHLIST_KEY = "uniqueshopee_guest_wishlist_v1";

type GuestWishlistState = {
  productIds: string[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readGuestWishlist(): GuestWishlistState {
  if (!canUseStorage()) {
    return { productIds: [] };
  }

  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) {
      return { productIds: [] };
    }

    const parsed = JSON.parse(raw) as Partial<GuestWishlistState> | null;
    return {
      productIds: Array.isArray(parsed?.productIds)
        ? Array.from(new Set(parsed.productIds.filter((value) => typeof value === "string" && value.trim().length > 0)))
        : [],
    };
  } catch {
    return { productIds: [] };
  }
}

export function writeGuestWishlist(state: GuestWishlistState) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const normalized = Array.from(new Set(state.productIds.filter((value) => typeof value === "string" && value.trim().length > 0)));
    window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify({ productIds: normalized }));
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

export function clearGuestWishlist() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_WISHLIST_KEY);
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

export function hasGuestWishlistItems() {
  return readGuestWishlist().productIds.length > 0;
}
