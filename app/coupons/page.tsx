import type { Metadata } from "next";
import { CouponsPage } from "@/components/coupons/coupons-rewards-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Coupons | UniqueShopee",
    description: "Explore available, applied, used, and expired coupons with a premium UniqueShopee experience.",
  };
}

export default function CouponsRoute() {
  return (
    <main>
      <CouponsPage />
    </main>
  );
}
