import type { Metadata } from "next";
import { FaqPage } from "@/components/support/support-kit";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "FAQ | UniqueShopee",
  description: "Browse frequently asked questions with categories, search, and expandable answers.",
  pathname: "/faq",
});

export default function FaqRoute() {
  return (
    <main>
      <FaqPage />
    </main>
  );
}
