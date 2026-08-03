import type { MetadataRoute } from "next";
import { getCatalogSnapshot } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";

const SEO_NOISE_RE = /(test|demo|placeholder|sample|dummy|qa)/i;

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNoise(value: string | null | undefined) {
  return typeof value === "string" && SEO_NOISE_RE.test(value);
}

function isEligibleProduct(product: {
  name: string;
  description: string;
  status: string;
  deletedAt: string | null;
  primaryImageUrl: string;
  price: number;
  slug: string;
}) {
  return (
    product.status === "active" &&
    product.deletedAt === null &&
    hasText(product.name) &&
    hasText(product.description) &&
    hasText(product.primaryImageUrl) &&
    !product.primaryImageUrl.startsWith("data:") &&
    product.price > 0 &&
    !isNoise(product.name) &&
    !isNoise(product.slug) &&
    !isNoise(product.description)
  );
}

function isEligibleBrand(brand: {
  name: string;
  slug: string;
  isActive: boolean;
  logoUrl: string | null;
  description: string;
}) {
  return (
    brand.isActive &&
    hasText(brand.name) &&
    !isNoise(brand.name) &&
    !isNoise(brand.slug) &&
    !isNoise(brand.description) &&
    !isNoise(brand.logoUrl)
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const snapshot = await getCatalogSnapshot();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/products",
    "/categories",
    "/faq",
    "/contact",
    "/help",
    "/terms",
    "/privacy-policy",
    "/tools/paint-calculator",
    "/tools/room-visualizer",
  ].map((pathname) => ({
    url: absoluteUrl(pathname),
    lastModified: now,
    changeFrequency: pathname === "/" ? "daily" : "weekly",
    priority: pathname === "/" ? 1 : 0.7,
  }));

  const departmentRoutes: MetadataRoute.Sitemap = snapshot.departments.map((department) => ({
    url: absoluteUrl(`/department/${department.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = snapshot.categories.map((category) => ({
    url: absoluteUrl(`/category/${category.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const brandRoutes: MetadataRoute.Sitemap = snapshot.brands
    .filter((brand) => isEligibleBrand(brand))
    .map((brand) => ({
      url: absoluteUrl(`/brand/${brand.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const productRoutes: MetadataRoute.Sitemap = snapshot.products
    .filter((product) =>
      isEligibleProduct({
        name: product.name,
        description: product.description,
        status: product.status,
        deletedAt: product.deletedAt,
        primaryImageUrl: product.primaryImageUrl,
        price: product.price,
        slug: product.slug,
      }),
    )
    .map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: new Date(product.updatedAt ?? product.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  return [...staticRoutes, ...departmentRoutes, ...categoryRoutes, ...brandRoutes, ...productRoutes];
}
