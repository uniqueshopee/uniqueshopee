import type { Metadata } from "next";
import { HomeMarketplacePage } from "@/components/product/home-marketplace-page";
import { getLiveHomeData } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "UniqueShopee",
  description: "Shop premium Paints, Plumbing Products, and Home Improvement essentials from trusted brands.",
  pathname: "/",
});

export default async function HomePage() {
  const homeData = await getLiveHomeData();

  return (
    <HomeMarketplacePage
      products={homeData.products}
      featuredProducts={homeData.featuredProducts}
    />
  );
}
