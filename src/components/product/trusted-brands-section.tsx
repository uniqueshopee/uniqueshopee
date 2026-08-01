"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

type Brand = {
  name: string;
  category: "Paint" | "Plumbing";
};

const BRAND_GROUPS: Array<{ title: string; key: string; brands: Brand[]; href: string }> = [
  {
    title: "Paint Brands",
    key: "paint-brands",
    href: "/products?department=paints",
    brands: [
      { name: "Asian Paints", category: "Paint" },
      { name: "Berger", category: "Paint" },
      { name: "Nerolac", category: "Paint" },
      { name: "Indigo Paints", category: "Paint" },
      { name: "Birla White", category: "Paint" },
      { name: "Dr. Fixit", category: "Paint" },
    ],
  },
  {
    title: "Plumbing Brands",
    key: "plumbing-brands",
    href: "/products?department=plumbing",
    brands: [
      { name: "Astral", category: "Plumbing" },
      { name: "Supreme", category: "Plumbing" },
      { name: "Finolex", category: "Plumbing" },
      { name: "Prince Pipes", category: "Plumbing" },
      { name: "Ashirvad", category: "Plumbing" },
      { name: "Jaquar", category: "Plumbing" },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

function BrandCard({ brand }: { brand: Brand }) {
  const isPaint = brand.category === "Paint";
  const topStripe = isPaint
    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
    : "bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400";
  const badgeVariant = isPaint ? "accent" : "neutral";

  return (
    <motion.li variants={itemVariants} className="min-w-[11.5rem] snap-start list-none sm:min-w-[12.5rem] lg:min-w-0">
      <motion.article
        whileHover={{ y: -2 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="group h-full"
        aria-label={`${brand.name} brand card`}
      >
        <Card className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[var(--shadow-lg)]">
          <div className="relative flex items-center justify-center border-b border-border/70 bg-gradient-to-br from-white via-background-secondary to-white px-4 py-3">
            <div className={`absolute inset-x-4 top-3 h-1.5 rounded-full ${topStripe}`} />
            <div className="relative h-14 w-full max-w-[10rem]">
              <BrandLogo name={brand.name} className="h-14 rounded-[1rem]" />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-text">{brand.name}</h3>
              <Badge variant={badgeVariant}>{brand.category}</Badge>
            </div>
            <p className="text-sm font-medium leading-5 text-muted">
              Trusted {brand.category.toLowerCase()} products for professionals and homeowners.
            </p>
          </div>
        </Card>
      </motion.article>
    </motion.li>
  );
}

function BrandGroupSection({ group }: { group: (typeof BRAND_GROUPS)[number] }) {
  return (
    <section aria-labelledby={group.key} className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 id={group.key} className="text-lg font-bold text-text sm:text-xl">
          {group.title}
        </h3>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <Button asChild variant="ghost" size="sm" className="rounded-full px-2 text-accent">
          <Link href={group.href}>
            See all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <motion.ul
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-6 lg:overflow-visible",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
        variants={containerVariants}
      >
        {group.brands.map((brand) => (
          <BrandCard key={brand.name} brand={brand} />
        ))}
      </motion.ul>
    </section>
  );
}

function TrustedBrandsSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="trusted-brands"
      className="relative isolate overflow-hidden border-b border-border surface-splash"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-orange-400/5 blur-3xl" />
        <div className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-sky-400/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-emerald-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <motion.header className="mb-5 max-w-2xl lg:mb-6" variants={itemVariants}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent shadow-[var(--shadow-sm)] backdrop-blur-sm eyebrow-font">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Trusted suppliers
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="trusted-brands" className="text-xl font-bold text-text sm:text-2xl">
                Trusted Brands
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">
                Verified manufacturers for paint and plumbing projects that need reliable results.
              </p>
            </div>
            <Badge variant="neutral" className="hidden sm:inline-flex">
              Official partners
            </Badge>
          </div>
        </motion.header>

        <div className="space-y-5">
          {BRAND_GROUPS.map((group) => (
            <BrandGroupSection key={group.key} group={group} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export { TrustedBrandsSection };
