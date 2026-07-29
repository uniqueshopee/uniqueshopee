import type { Metadata } from "next";
import { HelpCenterPage } from "@/components/support/support-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Help Center | UniqueShopee",
    description: "Search help topics, browse FAQs, and access premium customer support shortcuts.",
  };
}

export default function HelpRoute() {
  return (
    <main>
      <HelpCenterPage />
    </main>
  );
}
