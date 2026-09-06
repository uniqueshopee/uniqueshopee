import type { Metadata } from "next";
import { ReturnsRefundsPage } from "@/components/account/returns-refunds-page";

export const metadata: Metadata = {
  title: "Returns & Refunds | UniqueShopee",
  description: "View your normalized return requests and their current status.",
};

export default function ReturnsRoute() {
  return (
    <main>
      <ReturnsRefundsPage />
    </main>
  );
}
