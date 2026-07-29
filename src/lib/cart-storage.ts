"use client";

import type { CartItem } from "@/types";
import type { CouponCode } from "@/lib/checkout-pricing";

const GUEST_CART_KEY = "uniqueshopee_guest_cart_v1";

type GuestCartState = {
  items: CartItem[];
  couponCode: CouponCode | null;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readGuestCart(): GuestCartState {
  if (!canUseStorage()) {
    return { items: [], couponCode: null };
  }

  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) {
      return { items: [], couponCode: null };
    }

    const parsed = JSON.parse(raw) as Partial<GuestCartState> | null;
    return {
      items: Array.isArray(parsed?.items) ? (parsed?.items as CartItem[]) : [],
      couponCode: parsed?.couponCode ?? null,
    };
  } catch {
    return { items: [], couponCode: null };
  }
}

export function writeGuestCart(state: GuestCartState) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

export function clearGuestCart() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

export function hasGuestCartItems() {
  return readGuestCart().items.length > 0;
}
