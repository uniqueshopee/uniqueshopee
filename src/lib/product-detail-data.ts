import { getLiveProductBySlug, getCatalogSnapshot } from "@/lib/catalog";

export type { ProductDetail, ProductDownload, ProductFaq, ProductReview, ProductSpecification, ProductVariant } from "@/lib/catalog";

export function getProductDetailBySlug(slug: string) {
  return getLiveProductBySlug(slug);
}

export function getProductDetailStaticParams() {
  return getCatalogSnapshot().then((snapshot) => snapshot.products.map((product) => ({ slug: product.slug })));
}
