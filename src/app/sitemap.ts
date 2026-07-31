import type { MetadataRoute } from "next";
import { getCatalogSnapshot } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";

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

  const brandRoutes: MetadataRoute.Sitemap = snapshot.brands.map((brand) => ({
    url: absoluteUrl(`/brand/${brand.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = snapshot.products.map((product) => ({
    url: absoluteUrl(`/product/${product.slug}`),
    lastModified: new Date(product.updatedAt ?? product.createdAt),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticRoutes, ...departmentRoutes, ...categoryRoutes, ...brandRoutes, ...productRoutes];
}
