import {
  calculateCanonicalCart,
  calculatePricingLine,
} from "../src/lib/pricing-engine.ts";

function assertEqual(actual: number, expected: number, label: string) {
  if (actual !== expected)
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

const base = {
  mrp: 100,
  sellingPrice: 80,
  gstRate: 18,
  quantity: 1,
  adjustmentType: "fixed" as const,
};
const noShade = calculatePricingLine({ ...base, shadeExtraPrice: 0 });
assertEqual(noShade.taxableLineValue, 80, "A taxable");
assertEqual(noShade.gstAmount, 14.4, "A GST");
assertEqual(noShade.lineTotal, 94.4, "A total");

const shaded = calculatePricingLine({ ...base, shadeExtraPrice: 10 });
assertEqual(shaded.taxableLineValue, 90, "B taxable");
assertEqual(shaded.gstAmount, 16.2, "B GST");
assertEqual(shaded.lineTotal, 106.2, "B total");

const quantity = calculateCanonicalCart([{ ...base, shadeExtraPrice: 10, quantity: 3 }], {
  deliveryAmount: 99,
  couponDiscount: 0,
});
assertEqual(quantity.taxableAmount, 270, "C taxable");
assertEqual(quantity.gstAmount, 48.6, "C GST");
assertEqual(quantity.finalPayable, 417.6, "C final");

const coupon = calculateCanonicalCart([{ ...base, shadeExtraPrice: 10, quantity: 3 }], {
  deliveryAmount: 99,
  couponDiscount: 20,
});
assertEqual(coupon.finalPayable, 397.6, "D final");

const mixed = calculateCanonicalCart([
  {
    sellingPrice: 80,
    shadeExtraPrice: 10,
    adjustmentType: "fixed",
    quantity: 3,
    gstRate: 18,
  },
  {
    sellingPrice: 500,
    shadeExtraPrice: 0,
    adjustmentType: "none",
    quantity: 1,
    gstRate: 12,
  },
]);
assertEqual(mixed.gstAmount, 108.6, "E GST per line");

console.log("Pricing verification passed: A, B, C, D, and E");
