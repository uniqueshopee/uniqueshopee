import type { Metadata } from "next";
import { ReturnsRefundsPage } from "@/components/account/returns-refunds-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Returns & Refunds | UniqueShopee",
    description: "View return orders, check return summaries, and contact support by WhatsApp or phone.",
  };
}

export default function SupportTicketRoute() {
  return (
    <main>
      <ReturnsRefundsPage />
    </main>
  );
}
