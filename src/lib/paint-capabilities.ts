import type { Product } from "@/types";

/**
 * Paint configuration is an explicit product capability.  Existing catalog
 * rows opt into it through the already persisted supports_shades signal;
 * generic plumbing and home-improvement products remain on the variant flow.
 */
export function isPaintProduct(product: Pick<Product, "supportsShades" | "departmentSlug" | "categorySlug"> | null | undefined) {
  return product?.supportsShades === true || product?.departmentSlug === "paints" || product?.categorySlug === "paint";
}

export function supportsPaintConfiguration(product: Pick<Product, "supportsShades"> | null | undefined) {
  return isPaintProduct(product);
}
