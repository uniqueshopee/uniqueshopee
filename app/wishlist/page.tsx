import type { Metadata } from "next";
import { WishlistPage } from "@/components/wishlist/wishlist-page";
import { getLiveProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Wishlist | UniqueShopee",
  description: "Track your favorite Paint and Plumbing products in one premium wishlist.",
};

export default async function WishlistRoute() {
  const liveProducts = await getLiveProducts();
  return (
    <main>
      <WishlistPage products={liveProducts} />
    </main>
  );
}
