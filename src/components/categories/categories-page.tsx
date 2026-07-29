"use client";

import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  LayoutGrid,
  Paintbrush,
  Search,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DepartmentGrid } from "@/components/product/department-grid";
import { CategoryGrid } from "@/components/product/category-grid";
import { TrustedBrandsSection } from "@/components/product/trusted-brands-section";
import { ShopByBrandSection } from "@/components/product/shop-by-brand-section";
import { ProductShowcase } from "@/components/product/product-showcase";
import { cn } from "@/lib/utils";

const FEATURED_PRODUCTS: never[] = [];

const QUICK_PILLS = [
  { label: "Paints", href: "/category/paints", icon: Paintbrush, tone: "bg-amber-500/12 text-amber-600" },
  { label: "Plumbing", href: "/category/plumbing", icon: Wrench, tone: "bg-sky-500/12 text-sky-600" },
  { label: "Search", href: "/search", icon: Search, tone: "bg-violet-500/12 text-violet-600" },
  { label: "Offers", href: "/products", icon: BadgeCheck, tone: "bg-emerald-500/12 text-emerald-600" },
];

const HERO_STATS = [
  { label: "Departments", value: "2", icon: LayoutGrid },
  { label: "Categories", value: "12+", icon: Sparkles },
  { label: "Fast dispatch", value: "24-48h", icon: Truck },
];

const SECTION_JUMP_LINKS = [
  { label: "Departments", href: "#departments" },
  { label: "Categories", href: "#categories" },
  { label: "Brands", href: "#brands" },
  { label: "Featured", href: "#featured" },
];

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

function CategoriesPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-6 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <motion.div variants={itemVariants} className="space-y-4">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge variant="accent" className="eyebrow-font">
                  Browse by section
                </Badge>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
                  Categories
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base sm:leading-7">
                  Jump into paint and plumbing aisles, then refine by brand, category, or the
                  products customers buy most often.
                </p>
              </div>
              <div className="hidden h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-primary via-[#16335c] to-[#214b82] text-white shadow-[var(--shadow-md)] sm:flex">
                <LayoutGrid className="h-7 w-7" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {HERO_STATS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[1.35rem] border border-border/70 bg-background-secondary/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-accent shadow-[var(--shadow-sm)]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                        <p className="text-lg font-bold text-text">{item.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {SECTION_JUMP_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="whitespace-nowrap rounded-full border border-border/70 bg-white/80 px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-accent/20 hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_PILLS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group rounded-[1.35rem] border border-border/70 bg-background-secondary/40 p-3 text-center transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem]", item.tone)}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="mt-2 block text-sm font-bold text-text">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <div id="departments" className="pt-2">
          <DepartmentGrid />
        </div>
        <div id="categories">
          <CategoryGrid />
        </div>
        <div id="brands">
          <TrustedBrandsSection />
          <ShopByBrandSection />
        </div>

        <div id="featured">
          <ProductShowcase
            title="Featured Products"
            subtitle="Curated picks for quick browsing while you explore the marketplace."
            products={FEATURED_PRODUCTS}
            viewAllHref="/products"
            badge="Featured"
            viewAllLabel="View All Products"
          />
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <Link
            href="/products"
            className="flex items-center justify-between gap-3 text-sm font-bold text-text transition-colors hover:text-accent"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              Explore the full catalog
            </span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

export { CategoriesPage };
