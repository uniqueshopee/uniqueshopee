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
import type { CartItem } from "@/types";
import { toast } from "@/hooks/use-toast";

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
};

const CartSyncContext = createContext<CartSyncContextValue | null>(null);

function mergeItems(base: CartItem[], addition: CartItem[]) {
  const merged = [...base.map((item) => ({ ...item }))];

  for (const item of addition) {
    const existing = merged.find((entry) => entry.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.price = item.price || existing.price;
      existing.image = item.image || existing.image;
      existing.slug = item.slug ?? existing.slug;
      existing.category = item.category ?? existing.category;
      existing.compareAtPrice = item.compareAtPrice ?? existing.compareAtPrice;
      existing.inStock = item.inStock ?? existing.inStock;
      existing.stockCount = item.stockCount ?? existing.stockCount;
      existing.reservedCount = item.reservedCount ?? existing.reservedCount;
      existing.lowStockThreshold = item.lowStockThreshold ?? existing.lowStockThreshold;
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

      if (!user) {
        setMode("guest");
        setResolvedProfileId(null);
        setItems(guest.items);
        setMergeAvailable(false);
        setGuestItemCount(guest.items.length);
        setLoaded(true);
        hydratingRef.current = false;
        return;
      }

      const resolvedProfile = profile ?? (client ? await ensureCurrentUserProfile(client) : null);
      if (!resolvedProfile) {
        setMode("guest");
        setResolvedProfileId(null);
        setItems(guest.items);
        setMergeAvailable(false);
        setGuestItemCount(guest.items.length);
        setSyncError("Your account is still syncing. Tap retry in a moment.");
        setLoaded(true);
        hydratingRef.current = false;
        return;
      }

      setMode("authenticated");
      setResolvedProfileId(resolvedProfile.id);
      const remoteItems = await loadRemoteCartItems(resolvedProfile.id, client);
      setItems(remoteItems);
      setMergeAvailable(guest.items.length > 0);
      setGuestItemCount(guest.items.length);
      setLoaded(true);
      hydratingRef.current = false;
    };

    void hydrate();
  }, [loading, profile, refreshToken, setCouponCode, setItems, user]);

  useEffect(() => {
    if (!loaded || hydratingRef.current) {
      return;
    }

    if (mode === "guest") {
      writeGuestCart({ items, couponCode });
      return;
    }

    if (!user || !resolvedProfileId) {
      return;
    }

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const result = await replaceRemoteCartItems(resolvedProfileId, items);
        if (result.error) {
          setSyncError(result.error);
          toast({
            title: "Cart sync failed",
            description: result.error,
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
  }, [couponCode, items, loaded, mode, resolvedProfileId, user]);

  const mergeGuestCart = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    const resolvedProfile = profile ?? (resolvedProfileId ? { id: resolvedProfileId } : client ? await ensureCurrentUserProfile(client) : null);
    if (!user || !resolvedProfile) {
      return;
    }

    const guest = guestItemsRef.current.length > 0 ? guestItemsRef.current : readGuestCart().items;
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
        description: result.error,
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
    }),
    [dismissGuestMerge, guestItemCount, loaded, mergeGuestCart, mergeAvailable, mode, retrySync, syncError],
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
