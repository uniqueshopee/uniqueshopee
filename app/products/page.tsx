import type { Metadata } from "next";
import { ProductListingPage } from "@/components/product/product-listing-page";
import { getCatalogSnapshot } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Products | UniqueShopee",
  description: "Browse premium paint, hardware, electrical, and home improvement products.",
  pathname: "/products",
});

type ProductsPageProps = {
  searchParams: Promise<{
    department?: string;
    category?: string;
    q?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { department, category, q } = await searchParams;
  const snapshot = await getCatalogSnapshot();
  const requestedDepartment = snapshot.byDepartmentSlug.get(department ?? "");
  const initialDepartment = requestedDepartment?.slug ?? snapshot.departments[0]?.slug ?? "";
  const requestedCategory = snapshot.byCategorySlug.get(category ?? "");
  const initialCategory = requestedCategory?.slug ?? "";

  return (
    <main>
      <ProductListingPage
        products={snapshot.products}
        initialDepartment={initialDepartment}
        initialCategory={initialCategory}
        initialQuery={typeof q === "string" ? q : ""}
      />
    </main>
  );
}
