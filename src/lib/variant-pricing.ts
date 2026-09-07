import type { CartItem } from "@/types";
import { calculatePricingLine } from "@/lib/pricing-engine";

export type VariantAdjustmentType = "none" | "fixed" | "percentage";

export type VariantPriceInput = {
  basePrice?: number | string | null;
  shadeExtraPrice?: number | string | null;
  adjustmentType?: VariantAdjustmentType | null;
};

export type VariantPriceResult = {
  basePrice: number;
  shadeExtraPrice: number;
  finalPrice: number;
};

export type VariantCombinationOption = {
  value: string;
  isDefault?: boolean;
  optionValues?: Record<string, string>;
};

function normalizeCombinationKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeCombinationValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveVariantCombination<T extends VariantCombinationOption>(
  variants: T[],
  selectedOptions: Record<string, string>,
) {
  const selectedPairs = Object.entries(selectedOptions).filter(([, value]) => value.trim());
  const exactMatch = variants.find((variant) =>
    selectedPairs.every(([group, selectedValue]) => {
      const matchingOption = Object.entries(variant.optionValues ?? {}).find(
        ([key]) => normalizeCombinationKey(key) === normalizeCombinationKey(group),
      );
      return matchingOption
        ? normalizeCombinationValue(matchingOption[1]) === normalizeCombinationValue(selectedValue)
        : selectedPairs.length === 1 && variant.value === selectedValue;
    }),
  );

  return exactMatch ?? variants.find((variant) => variant.isDefault) ?? variants[0] ?? null;
}

export function calculateVariantPrice(input: VariantPriceInput): VariantPriceResult {
  const line = calculatePricingLine({
    sellingPrice: input.basePrice,
    shadeExtraPrice: input.shadeExtraPrice,
    adjustmentType: input.adjustmentType ?? "none",
    quantity: 1,
    gstRate: 0,
  });

  return {
    basePrice: line.sellingPrice,
    shadeExtraPrice: line.shadeExtra,
    finalPrice: line.sellingPrice + line.shadeExtra,
  };
}

export function buildCartItemKey(
  item: Pick<CartItem, "productId"> &
    Partial<Pick<CartItem, "variantId" | "shadeId" | "packSize" | "finish">>,
) {
  return [
    item.productId,
    item.variantId ?? "",
    item.shadeId ?? "",
    item.packSize ?? "",
    item.finish ?? "",
  ].join("::");
}

export function formatVariantDescriptor(
  item: Pick<CartItem, "shadeName" | "shadeCode" | "packSize" | "finish" | "variant">,
) {
  const parts = [
    item.shadeName,
    item.shadeCode ? `#${item.shadeCode}` : "",
    item.packSize,
    item.finish,
    item.variant,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return parts.join(" • ");
}
