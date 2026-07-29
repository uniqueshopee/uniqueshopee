import type { Metadata } from "next";
import { CategoriesPage } from "@/components/categories/categories-page";

export const metadata: Metadata = {
  title: "Categories | UniqueShopee",
  description: "Browse paint and plumbing categories, brands, and featured products in a compact shopping hub.",
};

export default function CategoriesRoute() {
  return (
    <main>
      <CategoriesPage />
    </main>
  );
}
