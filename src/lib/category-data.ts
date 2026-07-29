import { getLiveCategoryBySlug } from "@/lib/catalog";

export type CategoryTone = {
  fill: string;
  ring: string;
  accentRgb: string;
  wash: string;
};

export type { CategoryBrand, CategoryContent, RelatedCategory } from "@/lib/catalog";

export function getCategoryBySlug(slug: string) {
  return getLiveCategoryBySlug(slug);
}

export function getCategoryStaticParams() {
  return Promise.resolve([] as Array<{ slug: string }>);
}

export function getCategoryProducts() {
  return [];
}

export function getCategoryCatalog() {
  return [];
}
