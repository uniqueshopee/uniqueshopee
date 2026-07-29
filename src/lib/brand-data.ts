import { getLiveBrandBySlug } from "@/lib/catalog";

export type { BrandCertification, BrandCollectionItem, BrandContent, BrandFaq, BrandHistoryItem, BrandPillar } from "@/lib/catalog";

export function getBrandBySlug(slug: string) {
  return getLiveBrandBySlug(slug);
}

export function getBrandStaticParams() {
  return Promise.resolve([] as Array<{ slug: string }>);
}

export function getBrandProducts() {
  return [];
}

export function getBrandRecentProducts() {
  return [];
}
