import type { Metadata } from "next";
import { PaintCalculatorPage } from "@/components/tools/paint-calculator-kit";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Paint Calculator | UniqueShopee",
  description: "Estimate paint coverage, required litres, and recommended packs before placing your order.",
  pathname: "/tools/paint-calculator",
});

export default function PaintCalculatorRoute() {
  return (
    <main>
      <PaintCalculatorPage />
    </main>
  );
}
