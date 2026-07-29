import type { CartItem } from "@/types";

export type CouponCode = string;

export const COUPONS: Record<CouponCode, { label: string; percent: number; maxDiscount: number }> =
  {
    WELCOME10: { label: "WELCOME10", percent: 10, maxDiscount: 500 },
    PAINT20: { label: "PAINT20", percent: 20, maxDiscount: 1000 },
  };

export type ShippingResolver = (taxableAmount: number) => number;

export const defaultShippingResolver: ShippingResolver = (taxableAmount) =>
  taxableAmount >= 5000 ? 0 : 99;

export interface CartPricing {
  subtotal: number;
  compareSubtotal: number;
  discount: number;
  couponDiscount: number;
  taxableAmount: number;
  gst: number;
  shipping: number;
  grandTotal: number;
}

export function resolveCouponCode(value: string): CouponCode | null {
  const code = value.trim().toUpperCase();
  return code.length > 0 ? code : null;
}

export function calculateCartPricing(
  items: CartItem[],
  coupon: CouponCode | null,
  shippingResolver: ShippingResolver = defaultShippingResolver,
  comparePriceResolver: (item: CartItem) => number = (item) => item.price,
): CartPricing {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const compareSubtotal = items.reduce(
    (sum, item) => sum + comparePriceResolver(item) * item.quantity,
    0,
  );

  const discount = Math.max(0, compareSubtotal - subtotal);
  const couponConfig = coupon ? COUPONS[coupon] : null;
  const couponDiscount = couponConfig
    ? Math.min(Math.round((subtotal * couponConfig.percent) / 100), couponConfig.maxDiscount)
    : 0;
  const taxableAmount = Math.max(0, subtotal - couponDiscount - discount);
  const gst = Math.round((taxableAmount * 18) / 100);
  const shipping = shippingResolver(taxableAmount);
  const grandTotal = Math.max(0, taxableAmount + gst + shipping);

  return {
    subtotal,
    compareSubtotal,
    discount,
    couponDiscount,
    taxableAmount,
    gst,
    shipping,
    grandTotal,
  };
}
