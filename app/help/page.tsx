import type { Metadata } from "next";
import { HelpCenterPage } from "@/components/support/support-kit";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Help Center | UniqueShopee",
  description: "Search help topics, browse FAQs, and access premium customer support shortcuts.",
  pathname: "/help",
});

export default function HelpRoute() {
  return (
    <main>
      <HelpCenterPage />
    </main>
  );
}
