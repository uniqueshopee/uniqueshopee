import type { Metadata } from "next";
import { ProductListingPage } from "@/components/product/product-listing-page";
import { getLiveProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Products | UniqueShopee",
  description: "Browse premium Paint, Plumbing, Hardware and Home Improvement products.",
};

export default async function ProductsPage() {
  const products = await getLiveProducts();

  return (
    <main>
      <ProductListingPage products={products} />
    </main>
  );
}
