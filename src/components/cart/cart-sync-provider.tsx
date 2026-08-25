"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useCartStore } from "@/store/cart-store";
import { clearGuestCart, readGuestCart, writeGuestCart } from "@/lib/cart-storage";
import { loadRemoteCartItems, replaceRemoteCartItems } from "@/lib/cart-service";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getQaCartItems, isQaBypassEnabled } from "@/lib/qa-mode";
import type { CartItem } from "@/types";
import { toast } from "@/hooks/use-toast";
import { UI_MESSAGES, getFriendlyErrorMessage } from "@/lib/messages";
import { buildCartItemKey } from "@/lib/variant-pricing";

type CartMode = "guest" | "authenticated";

type CartSyncContextValue = {
  mode: CartMode;
  loaded: boolean;
  mergeAvailable: boolean;
  guestItemCount: number;
  mergeGuestCart: () => Promise<void>;
  dismissGuestMerge: () => void;
  syncError: string | null;
  retrySync: () => void;
  flushSync: () => Promise<boolean>;
};

const CartSyncContext = createContext<CartSyncContextValue | null>(null);

function mergeItems(base: CartItem[], addition: CartItem[]) {
  const merged = [...base.map((item) => ({ ...item }))];

  for (const item of addition) {
    const existing = merged.find((entry) => buildCartItemKey(entry) === buildCartItemKey(item));
    if (existing) {
      Object.assign(existing, item, { quantity: existing.quantity + item.quantity });
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}

function CartSyncProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const setItems = useCartStore((state) => state.setItems);
  const setCouponCode = useCartStore((state) => state.setCouponCode);

  const [mode, setMode] = useState<CartMode>("guest");
  const [loaded, setLoaded] = useState(false);
  const [mergeAvailable, setMergeAvailable] = useState(false);
  const [guestItemCount, setGuestItemCount] = useState(0);
  const [resolvedProfileId, setResolvedProfileId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hydratingRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const guestItemsRef = useRef<CartItem[]>([]);
  const lastSyncedSignatureRef = useRef<string>("");

  const flushSync = useCallback(async () => {
    if (!loaded || hydratingRef.current) {
      return false;
    }

    if (mode === "guest") {
      const currentItems = useCartStore.getState().items;
      writeGuestCart({ items: currentItems, couponCode });
      lastSyncedSignatureRef.current = JSON.stringify({
        mode: "guest",
        items: currentItems.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
        couponCode: couponCode ?? "",
      });
      return true;
    }

    if (isQaBypassEnabled()) {
      return true;
    }

    if (!user || !resolvedProfileId) {
      return false;
    }

    const currentItems = useCartStore.getState().items;
    const result = await replaceRemoteCartItems(resolvedProfileId, currentItems);
    if (result.error) {
      setSyncError(result.error);
      return false;
    }

    setSyncError(null);
    lastSyncedSignatureRef.current = JSON.stringify({
      mode: "authenticated",
      items: currentItems.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
    });
    return true;
  }, [couponCode, loaded, mode, resolvedProfileId, user]);

  useEffect(() => {
    if (loading) {
      return;
    }

    hydratingRef.current = true;

    const hydrate = async () => {
      const client = getSupabaseBrowserClient();
      const guest = readGuestCart();
      guestItemsRef.current = guest.items;
      setCouponCode(guest.couponCode);
      setSyncError(null);

      if (isQaBypassEnabled()) {
        // DEV ONLY
        // REMOVE OR DISABLE BEFORE PRODUCTION
        const qaItems = getQaCartItems();
        setMode("authenticated");
        setResolvedProfileId("qa-profile");
        setItems(qaItems);
        setMergeAvailable(false);
        setGuestItemCount(0);
        setLoaded(true);
        lastSyncedSignatureRef.current = JSON.stringify({
          mode: "qa",
          items: qaItems.map((item) => [item.productId, item.quantity]).sort(),
        });
        hydratingRef.current = false;
        return;
      }

      if (!user) {
        setMode("guest");
        setResolvedProfileId(null);
        setItems(guest.items);
        setMergeAvailable(false);
        setGuestItemCount(guest.items.length);
        setLoaded(true);
        lastSyncedSignatureRef.current = JSON.stringify({
          mode: "guest",
          items: guest.items.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
          couponCode: guest.couponCode ?? "",
        });
        hydratingRef.current = false;
        return;
      }

      const resolvedProfile =
        profile ?? (client ? await ensureCurrentUserProfile(client) : null);
      if (!resolvedProfile) {
        setMode("guest");
        setResolvedProfileId(null);
        setItems(guest.items);
        setMergeAvailable(false);
        setGuestItemCount(guest.items.length);
        setSyncError("Your account is still syncing. Tap retry in a moment.");
        setLoaded(true);
        lastSyncedSignatureRef.current = JSON.stringify({
          mode: "guest",
          items: guest.items.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
          couponCode: guest.couponCode ?? "",
        });
        hydratingRef.current = false;
        return;
      }

      const remoteItems = await loadRemoteCartItems(resolvedProfile.id, client, {
        profileId: resolvedProfile.id,
      });
      if (!hydratingRef.current) {
        return;
      }

      setMode("authenticated");
      setResolvedProfileId(resolvedProfile.id);
      setMergeAvailable(guest.items.length > 0);
      setGuestItemCount(guest.items.length);
      setItems(remoteItems);
      setLoaded(true);
      lastSyncedSignatureRef.current = JSON.stringify({
        mode: "authenticated",
        items: remoteItems.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
      });
      hydratingRef.current = false;
    };

    void hydrate();
  }, [loading, profile, refreshToken, setCouponCode, setItems, user]);

  useEffect(() => {
    if (!loaded || hydratingRef.current) {
      return;
    }

    if (mode === "guest") {
      const signature = JSON.stringify({
        mode: "guest",
        items: items.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
        couponCode: couponCode ?? "",
      });

      if (signature === lastSyncedSignatureRef.current) {
        return;
      }

      writeGuestCart({ items, couponCode });
      lastSyncedSignatureRef.current = signature;
      return;
    }

    if (isQaBypassEnabled()) {
      return;
    }

    if (!user || !resolvedProfileId) {
      return;
    }

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    const signature = JSON.stringify({
      mode: "authenticated",
      items: items.map((item) => [buildCartItemKey(item), item.quantity, item.shadeName, item.shadeCode, item.shadeFamily, item.shadeHexColor]).sort(),
    });

    if (signature === lastSyncedSignatureRef.current) {
      return;
    }

    syncTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const synced = await flushSync();
        if (!synced) {
          toast({
            title: "Cart sync failed",
            description: "Your cart could not be saved. Please retry before checkout.",
            variant: "danger",
          });
        } else {
          setSyncError(null);
        }
      })();
    }, 250);

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [couponCode, flushSync, items, loaded, mode, resolvedProfileId, user]);

  const mergeGuestCart = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    const resolvedProfile =
      profile ??
      (resolvedProfileId
        ? { id: resolvedProfileId }
        : client
          ? await ensureCurrentUserProfile(client)
          : null);
    if (!user || !resolvedProfile) {
      return;
    }

    const guest =
      guestItemsRef.current.length > 0 ? guestItemsRef.current : readGuestCart().items;
    if (guest.length === 0) {
      setMergeAvailable(false);
      return;
    }

    const merged = mergeItems(items, guest);
    setItems(merged);
    setMergeAvailable(false);
    setGuestItemCount(guest.length);
    clearGuestCart();

    const result = await replaceRemoteCartItems(resolvedProfile.id, merged, client);
    if (result.error) {
      setSyncError(result.error);
      toast({
        title: "Merge failed",
        description: getFriendlyErrorMessage(result.error, UI_MESSAGES.generic.server),
        variant: "danger",
      });
      return;
    }

    toast({
      title: "Cart merged",
      description: "Your saved guest cart has been merged into your account.",
      variant: "success",
    });
  }, [items, profile, resolvedProfileId, setItems, user]);

  const dismissGuestMerge = useCallback(() => {
    setMergeAvailable(false);
  }, []);

  const retrySync = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const value = useMemo<CartSyncContextValue>(
    () => ({
      mode,
      loaded,
      mergeAvailable,
      guestItemCount,
      mergeGuestCart,
      dismissGuestMerge,
      syncError,
      retrySync,
      flushSync,
    }),
    [
      dismissGuestMerge,
      flushSync,
      guestItemCount,
      loaded,
      mergeGuestCart,
      mergeAvailable,
      mode,
      retrySync,
      syncError,
    ],
  );

  return <CartSyncContext.Provider value={value}>{children}</CartSyncContext.Provider>;
}

function useCartSync() {
  const context = useContext(CartSyncContext);

  if (!context) {
    throw new Error("useCartSync must be used within CartSyncProvider");
  }

  return context;
}

export { CartSyncProvider, useCartSync };
