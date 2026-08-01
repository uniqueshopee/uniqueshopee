"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryIllustration, type CategoryScene, type CategoryTone } from "./category-illustration";
import { cn } from "@/lib/utils";

type CategoryItem = {
  name: string;
  description: string;
  href: string;
  scene: CategoryScene;
};

type CategoryGroup = {
  title: string;
  key: string;
  items: CategoryItem[];
  toneLabel: string;
};

const PAINT_TONES: CategoryTone[] = [
  { ring: "ring-amber-200", fill: "from-amber-50 via-white to-orange-50", accentRgb: "rgb(245 158 11)", wash: "rgba(245, 158, 11, 0.16)" },
  { ring: "ring-orange-200", fill: "from-orange-50 via-white to-amber-50", accentRgb: "rgb(249 115 22)", wash: "rgba(249, 115, 22, 0.16)" },
  { ring: "ring-sky-200", fill: "from-sky-50 via-white to-cyan-50", accentRgb: "rgb(14 165 233)", wash: "rgba(14, 165, 233, 0.16)" },
  { ring: "ring-rose-200", fill: "from-rose-50 via-white to-pink-50", accentRgb: "rgb(244 63 94)", wash: "rgba(244, 63, 94, 0.16)" },
];

const PLUMBING_TONES: CategoryTone[] = [
  { ring: "ring-cyan-200", fill: "from-cyan-50 via-white to-sky-50", accentRgb: "rgb(6 182 212)", wash: "rgba(6, 182, 212, 0.16)" },
  { ring: "ring-indigo-200", fill: "from-indigo-50 via-white to-blue-50", accentRgb: "rgb(99 102 241)", wash: "rgba(99, 102, 241, 0.16)" },
  { ring: "ring-blue-200", fill: "from-blue-50 via-white to-sky-50", accentRgb: "rgb(59 130 246)", wash: "rgba(59, 130, 246, 0.16)" },
  { ring: "ring-teal-200", fill: "from-teal-50 via-white to-emerald-50", accentRgb: "rgb(20 184 166)", wash: "rgba(20, 184, 166, 0.16)" },
];

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: "Paint Categories",
    key: "paint-categories",
    toneLabel: "Paint rail",
      items: [
      { name: "Interior Paint", description: "Beautiful living spaces with a smooth finish.", href: "/products?department=paints&category=Interior%20Paint", scene: "living-room" },
      { name: "Exterior Paint", description: "Weather-safe protection for modern homes.", href: "/products?department=paints&category=Exterior%20Paint", scene: "house" },
      { name: "Primer", description: "Strong base coat essentials.", href: "/products?department=paints&category=Primer", scene: "bucket" },
      { name: "Wall Putty", description: "Create a clean, polished surface.", href: "/products?department=paints&category=Wall%20Putty", scene: "wall" },
      { name: "Waterproofing", description: "Protect roofs and walls from moisture.", href: "/products?department=paints&category=Waterproofing", scene: "roof" },
      { name: "Paint Accessories", description: "Tools for cleaner, faster jobs.", href: "/products?department=paints&category=Paint%20Accessories", scene: "tools" },
    ],
  },
  {
    title: "Plumbing Categories",
    key: "plumbing-categories",
    toneLabel: "Plumbing rail",
      items: [
      { name: "PVC Pipes", description: "Reliable pipes for everyday supply.", href: "/products?department=plumbing&category=PVC%20Pipes", scene: "pipes" },
      { name: "CPVC Pipes", description: "Heat-ready piping for installations.", href: "/products?department=plumbing&category=CPVC%20Pipes", scene: "pipes-cold" },
      { name: "Fittings", description: "Secure joints and clean connectors.", href: "/products?department=plumbing&category=Fittings", scene: "fittings" },
      { name: "Faucets", description: "Premium fixtures for daily touchpoints.", href: "/products?department=plumbing&category=Faucets", scene: "faucet" },
      { name: "Valves", description: "Flow control with an industrial look.", href: "/products?department=plumbing&category=Valves", scene: "valve" },
      { name: "Water Tanks", description: "Storage for steady supply.", href: "/products?department=plumbing&category=Water%20Tanks", scene: "tank" },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
  },
};

function CategoryCard({ item, tone }: { item: CategoryItem; tone: CategoryTone }) {
  return (
    <motion.li variants={itemVariants} className="min-w-[11.5rem] snap-start list-none sm:min-w-[12.5rem] lg:min-w-0">
      <Link
        href={item.href}
        aria-label={`${item.name} category`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Card className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-1 hover:border-accent/20 hover:shadow-[var(--shadow-lg)]">
          <div className={`relative overflow-hidden bg-gradient-to-br ${tone.fill} px-3 py-3 ring-1 ring-inset ${tone.ring}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.86),transparent_60%)]" />
            <div className="relative aspect-[4/2.1] w-full">
              <CategoryIllustration label={item.name} scene={item.scene} tone={tone} />
            </div>
          </div>

          <div className="flex h-full flex-col gap-2.5 p-3.5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text sm:text-[15px]">{item.name}</h3>
              <p className="line-clamp-2 text-sm font-medium leading-5 text-muted">{item.description}</p>
            </div>

            <div className="mt-auto flex items-center justify-between pt-1">
              <Badge variant="neutral" className="rounded-full">
                Explore
              </Badge>
              <ArrowRight
                className="h-4 w-4 text-muted transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-accent"
                aria-hidden="true"
              />
            </div>
          </div>
        </Card>
      </Link>
    </motion.li>
  );
}

function CategoryGroupSection({ group }: { group: CategoryGroup }) {
  const tones = group.key === "paint-categories" ? PAINT_TONES : PLUMBING_TONES;

  return (
    <section aria-labelledby={group.key} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent shadow-[var(--shadow-sm)] eyebrow-font">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {group.toneLabel}
        </div>
        <h3 id={group.key} className="text-lg font-bold text-text sm:text-xl">
          {group.title}
        </h3>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <motion.ul
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
        variants={containerVariants}
      >
        {group.items.map((item, index) => (
          <CategoryCard key={item.name} item={item} tone={tones[index % tones.length]!} />
        ))}
      </motion.ul>
    </section>
  );
}

function CategoryGrid() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="shop-by-category"
      className="relative isolate overflow-hidden border-b border-border surface-gray"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-300/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-sky-300/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <motion.header className="mb-5 max-w-2xl lg:mb-6" variants={itemVariants}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent shadow-[var(--shadow-sm)] backdrop-blur-sm eyebrow-font">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Compact categories
          </div>
          <h2 id="shop-by-category" className="text-xl font-bold text-text sm:text-2xl">
            Shop by Category
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">
            Browse the aisle-style rails to jump directly into what you need.
          </p>
        </motion.header>

        <div className="space-y-6">
          {CATEGORY_GROUPS.map((group) => (
            <CategoryGroupSection key={group.key} group={group} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export { CategoryGrid };
