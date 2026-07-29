import type { Metadata } from "next";
import { SupportTicketPage } from "@/components/support/support-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Support Ticket | UniqueShopee",
    description: "Track an existing support ticket, view timeline updates, and send responses from one screen.",
  };
}

export default function SupportTicketRoute() {
  return (
    <main>
      <SupportTicketPage />
    </main>
  );
}
