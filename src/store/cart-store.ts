import { create } from "zustand";
import type { CartItem } from "@/types";
import type { CouponCode } from "@/lib/checkout-pricing";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: CouponCode | null;
  setItems: (items: CartItem[]) => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity }] };
    }),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    })),

  clear: () => set({ items: [] }),
  setOpen: (open) => set({ isOpen: open }),
  setCouponCode: (couponCode) => set({ couponCode }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
