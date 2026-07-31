import type { Metadata } from "next";
import { ProductListingPage } from "@/components/product/product-listing-page";
import { getLiveProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Products | UniqueShopee",
  description: "Browse premium Paint, Plumbing, Hardware and Home Improvement products.",
  pathname: "/products",
});

export default async function ProductsPage() {
  const products = await getLiveProducts();

  return (
    <main>
      <ProductListingPage products={products} />
    </main>
  );
}
