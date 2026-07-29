import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { DepartmentBrandItem } from "@/lib/department-data";

function DepartmentBrandCard({ brand }: { brand: DepartmentBrandItem }) {
  return (
    <article aria-label={`${brand.name} brand card`} className="group h-full">
      <Card className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-1 hover:border-accent/20 hover:shadow-[var(--shadow-lg)]">
        <div
          className={`relative flex items-center justify-center overflow-hidden border-b border-border/70 bg-gradient-to-br ${brand.tone.fill} px-3.5 py-4 ring-1 ring-inset ${brand.tone.ring}`}
        >
          <div className="absolute inset-x-4 top-4 h-1.5 rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.86),transparent_60%)]" />
          <div className="relative h-16 w-full max-w-[10.5rem]">
            <BrandLogo name={brand.name} className="h-16 rounded-[1.1rem]" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold text-text">{brand.name}</h3>
            <Badge variant={brand.category === "Paint" ? "accent" : "neutral"} className="shrink-0">
              {brand.category}
            </Badge>
          </div>

          <p className="text-sm font-medium leading-6 text-muted">{brand.description}</p>

          <Button variant="outline" size="md" asChild className="mt-auto w-full">
            <Link href={brand.href} aria-label={`Explore ${brand.name}`}>
              Explore
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>
    </article>
  );
}

export { DepartmentBrandCard };
