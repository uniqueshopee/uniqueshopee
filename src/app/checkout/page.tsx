import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Checkout | UniqueShopee",
    description:
      "Complete your UniqueShopee purchase with a premium multi-step checkout for address, delivery, payment, and review.",
  };
}

export default function CheckoutRoute() {
  return (
    <main>
      <CheckoutPage />
    </main>
  );
}
