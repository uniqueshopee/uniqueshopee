import type { Metadata } from "next";
import { FaqPage } from "@/components/support/support-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "FAQ | UniqueShopee",
    description: "Browse frequently asked questions with categories, search, and expandable answers.",
  };
}

export default function FaqRoute() {
  return (
    <main>
      <FaqPage />
    </main>
  );
}
