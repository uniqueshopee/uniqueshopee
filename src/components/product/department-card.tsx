"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Paintbrush, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import type { Department } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEPARTMENT_VISUALS: Record<
  Department["id"],
  {
    surface: string;
    glow: string;
    accent: string;
    icon: typeof Paintbrush;
    chips: [string, string, string];
    summary: string;
  }
> = {
  paints: {
    surface: "from-amber-50 via-white to-orange-50",
    glow: "bg-amber-300/30",
    accent: "bg-amber-500",
    icon: Paintbrush,
    chips: ["Interior", "Exterior", "Finishes"],
    summary: "Color systems, coatings, and finish essentials.",
  },
  plumbing: {
    surface: "from-sky-50 via-white to-cyan-50",
    glow: "bg-sky-300/30",
    accent: "bg-sky-500",
    icon: Wrench,
    chips: ["Pipes", "Fittings", "Fixtures"],
    summary: "Water movement, fittings, and installation gear.",
  },
};

function getDepartmentVisual(departmentId: Department["id"]) {
  return departmentId === "plumbing" ? DEPARTMENT_VISUALS.plumbing : DEPARTMENT_VISUALS.paints;
}

function DepartmentCard({ department }: { department: Department }) {
  const visual = getDepartmentVisual(department.id);
  const Icon = visual.icon;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Card className="group h-full overflow-hidden rounded-[1.5rem] border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:border-accent/20 hover:shadow-[var(--shadow-lg)]">
        <div className={`relative overflow-hidden bg-gradient-to-br ${visual.surface} p-4`}>
          <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${visual.glow} blur-3xl`} />
          <div className={`absolute -bottom-14 -left-14 h-32 w-32 rounded-full ${visual.glow} blur-3xl`} />

          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-white/90 text-text shadow-[var(--shadow-sm)]">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Department
                </span>
                <BadgeCheck className={cn("h-4 w-4", department.id === "paints" ? "text-amber-500" : "text-sky-500")} aria-hidden="true" />
              </div>
              <h3 className="mt-2 text-[1.35rem] font-bold text-text">{department.title}</h3>
              <p className="mt-1 text-sm font-medium leading-6 text-muted">{visual.summary}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-2">
            {visual.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border/70 bg-background-secondary/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
              >
                {chip}
              </span>
            ))}
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={`${department.title} product categories`}>
            {department.items.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-[1rem] border border-border/70 bg-white/80 px-3 py-2 text-sm font-medium text-text">
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${visual.accent}`} />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>

          <Button variant="accent" size="lg" asChild className="mt-auto w-full">
            <Link href={department.href} aria-label={department.ctaLabel}>
              {department.ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export { DepartmentCard };
