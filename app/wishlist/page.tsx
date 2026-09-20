import type { Metadata } from "next";
import { WishlistPage } from "@/components/wishlist/wishlist-page";
import { getLiveProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Wishlist | UniqueShopee",
  description: "Track your favorite products across every UniqueShopee department.",
};

export default async function WishlistRoute() {
  const liveProducts = await getLiveProducts();
  return (
    <main>
      <WishlistPage products={liveProducts} />
    </main>
  );
}
