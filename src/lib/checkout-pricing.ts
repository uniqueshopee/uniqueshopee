import {
  calculateCanonicalCart,
  type CanonicalPricingLineInput,
} from "@/lib/pricing-engine";

export type CouponCode = string;
export type ShippingResolver = (taxableAmount: number) => number;
export const defaultShippingResolver: ShippingResolver = () => 99;

export type CheckoutPricingItem = CanonicalPricingLineInput & {
  price?: number;
  basePrice?: number;
  compareAtPrice?: number | null;
};

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
  items: CheckoutPricingItem[],
  coupon: CouponCode | null,
  shippingResolver: ShippingResolver = defaultShippingResolver,
  comparePriceResolver: (item: CheckoutPricingItem) => number | undefined = (item) =>
    item.compareAtPrice ?? item.price ?? 0,
): CartPricing {
  const lines = items.map((item) => ({
    ...item,
    sellingPrice: item.sellingPrice ?? item.basePrice ?? item.price ?? 0,
    mrp: item.mrp ?? comparePriceResolver(item) ?? item.price ?? 0,
    shadeExtraPrice: item.shadeExtraPrice ?? 0,
    adjustmentType: item.adjustmentType ?? "none",
    gstRate: item.gstRate ?? 18,
  }));
  const beforeCoupon = calculateCanonicalCart(lines, { deliveryAmount: 0 });
  // Coupon validation and discount calculation are authoritative on the server.
  // This helper remains for non-checkout client summaries and must not invent
  // a discount for an unvalidated coupon code.
  const couponDiscount = 0;
  const shipping = shippingResolver(beforeCoupon.taxableAmount);
  const result = calculateCanonicalCart(lines, {
    deliveryAmount: shipping,
    couponDiscount,
  });
  return {
    subtotal: result.productTotal,
    compareSubtotal: result.mrp,
    discount: result.displayedSaving,
    couponDiscount: result.couponDiscount,
    taxableAmount: result.taxableAmount,
    gst: result.gstAmount,
    shipping: result.deliveryAmount,
    grandTotal: result.finalPayable,
  };
}
