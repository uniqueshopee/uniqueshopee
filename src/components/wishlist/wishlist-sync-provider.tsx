"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useWishlistStore } from "@/store/wishlist-store";
import {
  clearGuestWishlist,
  readGuestWishlist,
  writeGuestWishlist,
} from "@/lib/wishlist-storage";
import {
  loadRemoteWishlistProductIds,
  replaceRemoteWishlistItems,
} from "@/lib/wishlist-service";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

type WishlistMode = "guest" | "authenticated";

type WishlistSyncContextValue = {
  mode: WishlistMode;
  loaded: boolean;
  syncError: string | null;
  retrySync: () => void;
};

const WishlistSyncContext = createContext<WishlistSyncContextValue | null>(null);

function WishlistSyncProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const productIds = useWishlistStore((state) => state.productIds);
  const setProductIds = useWishlistStore((state) => state.setProductIds);

  const [mode, setMode] = useState<WishlistMode>("guest");
  const [loaded, setLoaded] = useState(false);
  const [resolvedProfileId, setResolvedProfileId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hydratingRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    hydratingRef.current = true;

    const hydrate = async () => {
      const client = getSupabaseBrowserClient();
      const guest = readGuestWishlist();
      const currentIds = Array.from(useWishlistStore.getState().productIds);
      setSyncError(null);

      if (!user) {
        if (previousUserIdRef.current && currentIds.length > 0) {
          writeGuestWishlist({ productIds: currentIds });
        } else {
          setProductIds(guest.productIds);
        }

        setMode("guest");
        setResolvedProfileId(null);
        setLoaded(true);
        previousUserIdRef.current = null;
        hydratingRef.current = false;
        return;
      }

      const resolvedProfile = profile ?? (client ? await ensureCurrentUserProfile(client) : null);
      if (!resolvedProfile) {
        setProductIds(guest.productIds);
        setMode("guest");
        setResolvedProfileId(null);
        setSyncError("Your account is still syncing. Tap retry in a moment.");
        setLoaded(true);
        previousUserIdRef.current = null;
        hydratingRef.current = false;
        return;
      }

      const remoteIds = await loadRemoteWishlistProductIds(resolvedProfile.id, client);
      const mergedIds = Array.from(new Set([...remoteIds, ...guest.productIds]));

      setProductIds(mergedIds);
      setMode("authenticated");
      setResolvedProfileId(resolvedProfile.id);
      setLoaded(true);
      previousUserIdRef.current = resolvedProfile.id;

      if (guest.productIds.length > 0) {
        const result = await replaceRemoteWishlistItems(resolvedProfile.id, mergedIds, client);

        if (result.error) {
          toast({
            title: "Wishlist sync failed",
            description: result.error,
            variant: "danger",
          });
        } else {
          clearGuestWishlist();
          toast({
            title: "Wishlist merged",
            description: "Your guest wishlist was merged into your account.",
            variant: "success",
          });
        }
      }

      hydratingRef.current = false;
    };

    void hydrate();
  }, [loading, profile, refreshToken, setProductIds, user]);

  useEffect(() => {
    if (!loaded || hydratingRef.current) {
      return;
    }

    const ids = Array.from(productIds);

    if (mode === "guest") {
      writeGuestWishlist({ productIds: ids });
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
        const result = await replaceRemoteWishlistItems(resolvedProfileId, ids);
        if (result.error) {
          setSyncError(result.error);
          toast({
            title: "Wishlist sync failed",
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
  }, [loaded, mode, productIds, resolvedProfileId, user]);

  const value = useMemo<WishlistSyncContextValue>(
    () => ({
      mode,
      loaded,
      syncError,
      retrySync: () => setRefreshToken((current) => current + 1),
    }),
    [loaded, mode, syncError],
  );

  return <WishlistSyncContext.Provider value={value}>{children}</WishlistSyncContext.Provider>;
}

function useWishlistSync() {
  const context = useContext(WishlistSyncContext);

  if (!context) {
    throw new Error("useWishlistSync must be used within WishlistSyncProvider");
  }

  return context;
}

export { WishlistSyncProvider, useWishlistSync };
