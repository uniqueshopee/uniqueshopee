import { HomeMarketplacePage } from "@/components/product/home-marketplace-page";
import { getLiveHomeData } from "@/lib/catalog";

export default async function HomePage() {
  const homeData = await getLiveHomeData();

  return (
    <HomeMarketplacePage
      products={homeData.products}
      featuredProducts={homeData.featuredProducts}
    />
  );
}
