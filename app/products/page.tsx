import type { Metadata } from "next";
import { ProductListingPage } from "@/components/product/product-listing-page";
import { getLiveProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Products | UniqueShopee",
  description: "Browse premium Paint, Plumbing, Hardware and Home Improvement products.",
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
  const products = await getLiveProducts();
  const initialDepartment = department === "plumbing" ? "plumbing" : "paints";

  return (
    <main>
      <ProductListingPage
        products={products}
        initialDepartment={initialDepartment}
        initialCategory={typeof category === "string" ? category : ""}
        initialQuery={typeof q === "string" ? q : ""}
      />
    </main>
  );
}
