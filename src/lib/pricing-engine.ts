export type PricingAdjustmentType = "none" | "fixed" | "percentage";

export type CanonicalPricingLineInput = {
  mrp?: number | string | null;
  sellingPrice?: number | string | null;
  shadeExtraPrice?: number | string | null;
  adjustmentType?: PricingAdjustmentType | null;
  quantity?: number | string | null;
  gstRate?: number | string | null;
};

export type CanonicalPricingLine = {
  mrp: number;
  sellingPrice: number;
  shadeExtra: number;
  quantity: number;
  taxableLineValue: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  displayedSaving: number;
};

export type CanonicalCartPricing = {
  lines: CanonicalPricingLine[];
  mrp: number;
  sellingPrice: number;
  shadeExtra: number;
  quantity: number;
  taxableAmount: number;
  gstAmount: number;
  productTotal: number;
  deliveryAmount: number;
  couponDiscount: number;
  finalPayable: number;
  displayedSaving: number;
};

export function money(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : fallback;
}

function nonNegative(value: unknown) {
  return Math.max(0, money(value));
}

export function calculatePricingLine(
  input: CanonicalPricingLineInput,
): CanonicalPricingLine {
  const mrp = nonNegative(input.mrp);
  const sellingPrice = nonNegative(input.sellingPrice);
  const rawAdjustment = nonNegative(input.shadeExtraPrice);
  const adjustmentType = input.adjustmentType ?? "none";
  const shadeExtra =
    adjustmentType === "none"
      ? 0
      : adjustmentType === "percentage"
        ? money((sellingPrice * rawAdjustment) / 100)
        : rawAdjustment;
  const quantity = Math.max(1, Math.floor(nonNegative(input.quantity ?? 1)));
  const taxableLineValue = money((sellingPrice + shadeExtra) * quantity);
  const gstRate = nonNegative(input.gstRate);
  const gstAmount = money((taxableLineValue * gstRate) / 100);

  return {
    mrp,
    sellingPrice,
    shadeExtra,
    quantity,
    taxableLineValue,
    gstRate,
    gstAmount,
    lineTotal: money(taxableLineValue + gstAmount),
    displayedSaving: money(Math.max(0, mrp - sellingPrice) * quantity),
  };
}

export function calculateCanonicalCart(
  lines: CanonicalPricingLineInput[],
  options?: { deliveryAmount?: number; couponDiscount?: number },
): CanonicalCartPricing {
  const calculatedLines = lines.map(calculatePricingLine);
  const productTotal = money(
    calculatedLines.reduce((sum, line) => sum + line.lineTotal, 0),
  );
  const taxableAmount = money(
    calculatedLines.reduce((sum, line) => sum + line.taxableLineValue, 0),
  );
  const gstAmount = money(calculatedLines.reduce((sum, line) => sum + line.gstAmount, 0));
  const deliveryAmount = nonNegative(options?.deliveryAmount ?? 0);
  const couponDiscount = money(
    Math.min(nonNegative(options?.couponDiscount), productTotal + deliveryAmount),
  );

  return {
    lines: calculatedLines,
    mrp: money(calculatedLines.reduce((sum, line) => sum + line.mrp * line.quantity, 0)),
    sellingPrice: money(
      calculatedLines.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0),
    ),
    shadeExtra: money(
      calculatedLines.reduce((sum, line) => sum + line.shadeExtra * line.quantity, 0),
    ),
    quantity: calculatedLines.reduce((sum, line) => sum + line.quantity, 0),
    taxableAmount,
    gstAmount,
    productTotal,
    deliveryAmount,
    couponDiscount,
    finalPayable: money(Math.max(0, productTotal + deliveryAmount - couponDiscount)),
    displayedSaving: money(
      calculatedLines.reduce((sum, line) => sum + line.displayedSaving, 0),
    ),
  };
}
