import { create } from "zustand";

interface WishlistState {
  productIds: Set<string>;
  setProductIds: (productIds: Iterable<string>) => void;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  count: () => number;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: new Set(),

  setProductIds: (productIds) =>
    set({
      productIds: new Set(productIds),
    }),

  add: (productId) =>
    set((state) => {
      if (state.productIds.has(productId)) {
        return state;
      }

      const next = new Set(state.productIds);
      next.add(productId);
      return { productIds: next };
    }),

  remove: (productId) =>
    set((state) => {
      if (!state.productIds.has(productId)) {
        return state;
      }

      const next = new Set(state.productIds);
      next.delete(productId);
      return { productIds: next };
    }),

  clear: () => set({ productIds: new Set() }),

  toggle: (productId) =>
    set((state) => {
      const next = new Set(state.productIds);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return { productIds: next };
    }),

  has: (productId) => get().productIds.has(productId),
  count: () => get().productIds.size,
}));
