import type { Metadata } from "next";
import { PaintCalculatorPage } from "@/components/tools/paint-calculator-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Paint Calculator | UniqueShopee",
    description: "Estimate paint coverage, required litres, and recommended packs before placing your order.",
  };
}

export default function PaintCalculatorRoute() {
  return (
    <main>
      <PaintCalculatorPage />
    </main>
  );
}
