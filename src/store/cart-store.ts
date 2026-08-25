import { create } from "zustand";
import type { CartItem } from "@/types";
import type { CouponCode } from "@/lib/checkout-pricing";
import { buildCartItemKey } from "@/lib/variant-pricing";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: CouponCode | null;
  setItems: (items: CartItem[]) => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (
    productId: string,
    variantId?: string,
    shadeId?: string,
    packSize?: string,
    finish?: string,
  ) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
    shadeId?: string,
    packSize?: string,
    finish?: string,
  ) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  setCouponCode: (couponCode: CouponCode | null) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  couponCode: null,

  setItems: (items) => set({ items }),

  addItem: (item, quantity = 1) =>
    set((state) => {
      const key = buildCartItemKey(item);
      const existing = state.items.find((i) => buildCartItemKey(i) === key);
      if (existing) {
        return {
          items: state.items.map((i) =>
            buildCartItemKey(i) === key
              ? { ...i, quantity: i.quantity + quantity, ...item }
              : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity }] };
    }),

  removeItem: (productId, variantId, shadeId, packSize, finish) =>
    set((state) => ({
      items: state.items.filter(
        (i) =>
          buildCartItemKey(i) !==
          buildCartItemKey({ productId, variantId, shadeId, packSize, finish }),
      ),
    })),

  updateQuantity: (productId, quantity, variantId, shadeId, packSize, finish) =>
    set((state) => ({
      items: state.items
        .map((i) =>
          buildCartItemKey(i) ===
          buildCartItemKey({ productId, variantId, shadeId, packSize, finish })
            ? { ...i, quantity }
            : i,
        )
        .filter((i) => i.quantity > 0),
    })),

  clear: () => set({ items: [] }),
  setOpen: (open) => set({ isOpen: open }),
  setCouponCode: (couponCode) => set({ couponCode }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
