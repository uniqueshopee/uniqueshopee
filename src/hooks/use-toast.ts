import { create } from "zustand";

export type ToastVariant = "default" | "success" | "warning" | "danger";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

let toastIdCounter = 0;

function createToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  toastIdCounter += 1;
  return `toast-${Date.now()}-${toastIdCounter}`;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = createToastId();
    set((state) => ({ toasts: [...state.toasts, { id, duration: 4000, ...toast }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Fire-and-forget toast trigger, usable from any client component:
 *   toast({ title: "Added to cart", variant: "success" })
 */
export function toast(toast: Omit<Toast, "id">) {
  return useToastStore.getState().push(toast);
}

export function useToasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return { toasts, dismiss };
}
