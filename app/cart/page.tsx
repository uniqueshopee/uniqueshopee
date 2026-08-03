import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";

export const metadata: Metadata = {
  title: "Shopping Cart | UniqueShopee",
  description: "Review your saved products, adjust quantities, and proceed to checkout.",
};

export default function CartRoute() {
  return (
    <main>
      <CartPage />
    </main>
  );
}
