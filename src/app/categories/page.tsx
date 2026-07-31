import type { Metadata } from "next";
import { CategoriesPage } from "@/components/categories/categories-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Categories | UniqueShopee",
  description: "Browse paint and plumbing categories, brands, and featured products in a compact shopping hub.",
  pathname: "/categories",
});

export default function CategoriesRoute() {
  return (
    <main>
      <CategoriesPage />
    </main>
  );
}
