import type { Metadata } from "next";
import { CategoriesPage } from "@/components/categories/categories-page";
import { getCatalogSnapshot } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Categories | UniqueShopee",
  description: "Browse live departments, categories, brands, and featured products in a compact shopping hub.",
  pathname: "/categories",
});

export default async function CategoriesRoute() {
  const snapshot = await getCatalogSnapshot();
  return (
    <main>
      <CategoriesPage departments={snapshot.departments} categories={snapshot.categories} />
    </main>
  );
}
