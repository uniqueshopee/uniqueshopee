"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

type BrandItem = {
  name: string;
  category: "Paint" | "Plumbing";
  description: string;
  href: string;
};

const BRAND_ITEMS: BrandItem[] = [
  { name: "Asian Paints", category: "Paint", description: "Reliable coatings for interiors and exteriors.", href: "/category/paints" },
  { name: "Berger", category: "Paint", description: "Finish-first systems for modern spaces.", href: "/category/paints" },
  { name: "Nerolac", category: "Paint", description: "Everyday colour with trusted performance.", href: "/category/paints" },
  { name: "Indigo Paints", category: "Paint", description: "Fresh color-led home improvement picks.", href: "/category/paints" },
  { name: "Astral", category: "Plumbing", description: "Durable water systems built for installations.", href: "/category/plumbing" },
  { name: "Supreme", category: "Plumbing", description: "Strong pipe and fitting essentials.", href: "/category/plumbing" },
  { name: "Finolex", category: "Plumbing", description: "Utility-focused plumbing solutions.", href: "/category/plumbing" },
  { name: "Jaquar", category: "Plumbing", description: "Premium fixtures with refined styling.", href: "/category/plumbing" },
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

function BrandCard({ brand }: { brand: BrandItem }) {
  const isPaint = brand.category === "Paint";
  const topStripe = isPaint
    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
    : "bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400";
  const badgeVariant = isPaint ? "accent" : "neutral";

  return (
    <motion.li variants={itemVariants} className="min-w-[12rem] snap-start list-none sm:min-w-[13rem] lg:min-w-0">
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
            <p className="text-sm font-medium leading-5 text-muted">{brand.description}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Verified
              </span>
              <ArrowRight className="h-4 w-4 text-muted transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
            </div>
          </div>
        </Card>
      </motion.article>
    </motion.li>
  );
}

function ShopByBrandSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="shop-by-brand"
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-orange-400/5 blur-3xl" />
        <div className="absolute right-8 top-16 h-56 w-56 rounded-full bg-sky-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <motion.header className="mb-5 max-w-2xl lg:mb-6" variants={itemVariants}>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent shadow-[var(--shadow-sm)] backdrop-blur-sm eyebrow-font">
            Brand discovery
          </p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="shop-by-brand" className="text-xl font-bold text-text sm:text-2xl">
                Shop by Brand
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">
                Swipe through the brands customers come back to for dependable results.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full px-2 text-accent sm:inline-flex">
              <Link href="/products">
                See all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.header>

        <motion.ul
          className={cn(
            "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
          variants={containerVariants}
        >
          {BRAND_ITEMS.map((brand) => (
            <BrandCard key={brand.name} brand={brand} />
          ))}
        </motion.ul>
      </div>
    </motion.section>
  );
}

export { ShopByBrandSection };
