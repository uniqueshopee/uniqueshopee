import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryIllustration, type CategoryScene } from "@/components/product/category-illustration";
import type { DepartmentCategoryItem } from "@/lib/department-data";

function getSceneFromCategoryName(name: string): CategoryScene {
  if (name.includes("Interior")) return "living-room";
  if (name.includes("Exterior")) return "house";
  if (name.includes("Primer")) return "bucket";
  if (name.includes("Wall Putty")) return "wall";
  if (name.includes("Waterproofing")) return "roof";
  if (name.includes("Wood")) return "wood";
  if (name.includes("Metal")) return "metal";
  if (name.includes("Accessories")) return "tools";
  if (name.includes("PVC")) return "pipes";
  if (name.includes("CPVC")) return "pipes-cold";
  if (name.includes("Fittings")) return "fittings";
  if (name.includes("Faucets")) return "faucet";
  if (name.includes("Valves")) return "valve";
  if (name.includes("Pumps")) return "pump";
  if (name.includes("Tank")) return "tank";
  return "bathroom";
}

function DepartmentCategoryCard({ category }: { category: DepartmentCategoryItem }) {
  const scene = getSceneFromCategoryName(category.name);

  return (
    <article aria-label={`${category.name} category card`} className="group h-full">
      <Link
        href={category.href}
        aria-label={`Explore ${category.name}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Card className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-1 hover:border-accent/20 hover:shadow-[var(--shadow-lg)]">
          <div
            className={`relative overflow-hidden bg-gradient-to-br ${category.tone.fill} px-3.5 py-3.5 ring-1 ring-inset ${category.tone.ring}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.86),transparent_60%)]" />
            <div className="relative aspect-[4/2.1] w-full">
              <CategoryIllustration label={category.name} scene={scene} tone={category.tone} />
            </div>
          </div>

          <div className="flex h-full flex-col gap-2.5 p-3.5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text sm:text-base">{category.name}</h3>
              <p className="text-sm font-medium leading-5 text-muted">{category.description}</p>
            </div>

            <div className="mt-auto flex items-center justify-between pt-1.5">
              <span className="h-1 w-10 rounded-full bg-border transition-colors duration-[var(--duration-base)] group-hover:bg-accent" />
              <ArrowRight
                className="h-4 w-4 text-muted transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-accent"
                aria-hidden="true"
              />
            </div>
          </div>
        </Card>
      </Link>
    </article>
  );
}

export { DepartmentCategoryCard };
