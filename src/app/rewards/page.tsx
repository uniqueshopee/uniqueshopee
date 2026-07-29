import type { Metadata } from "next";
import { RewardsPage } from "@/components/coupons/coupons-rewards-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rewards | UniqueShopee",
    description: "Track reward points, tier progress, earn history, and redemption options in one premium screen.",
  };
}

export default function RewardsRoute() {
  return (
    <main>
      <RewardsPage />
    </main>
  );
}
