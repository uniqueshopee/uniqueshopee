"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Heart,
  Paintbrush,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { buildLoginRedirectPath } from "@/lib/auth";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Paints", href: "/products?department=paints", icon: Paintbrush, tone: "bg-amber-500/12 text-amber-600" },
  { label: "Plumbing", href: "/products?department=plumbing", icon: Wrench, tone: "bg-sky-500/12 text-sky-600" },
  { label: "Search", href: "/search", icon: Search, tone: "bg-violet-500/12 text-violet-600" },
  { label: "Deals", href: "/products", icon: BadgeCheck, tone: "bg-emerald-500/12 text-emerald-600" },
  { label: "Wishlist", href: "/wishlist", icon: Heart, tone: "bg-rose-500/12 text-rose-600" },
  { label: "Cart", href: "/cart", icon: ShoppingCart, tone: "bg-orange-500/12 text-orange-600" },
];

const HIGHLIGHTS = [
  { label: "Verified brands", value: "40+", icon: BadgeCheck },
  { label: "Fast dispatch", value: "24-48h", icon: Truck },
  { label: "Support", value: "Expert help", icon: ShieldCheck },
];

const MINI_CARDS = [
  {
    title: "Paint refresh",
    subtitle: "Interior and exterior picks",
    accent: "from-amber-100 via-orange-50 to-white",
    icon: Paintbrush,
  },
  {
    title: "Water systems",
    subtitle: "Pipes, fittings, fixtures",
    accent: "from-sky-100 via-cyan-50 to-white",
    icon: Wrench,
  },
];

const panelVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();

  const getProtectedHref = (href: string) => {
    if (isAuthenticated) {
      return href;
    }

    if (href === "/cart" || href === "/wishlist") {
      return buildLoginRedirectPath(href);
    }

    return href;
  };

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={panelVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
          <div className="space-y-4">
            <motion.div
              variants={cardVariants}
              className="flex items-center gap-3 rounded-[1.5rem] border border-white/80 bg-white/92 px-4 py-3 shadow-[var(--shadow-sm)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary via-[#214b82] to-[#10213a] text-sm font-bold text-white shadow-[var(--shadow-md)]">
                US
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-text">Good morning, builder</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-muted">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                  </span>
                  Bengaluru delivery-ready today
                </p>
              </div>

              <Button asChild variant="outline" size="icon" className="hidden sm:inline-flex">
                <Link href="/search" aria-label="Search products">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              variants={cardVariants}
              className="overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-[#10213a] via-[#16335c] to-[#214b82] p-5 text-white shadow-[var(--shadow-lg)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 eyebrow-font">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Premium marketplace
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                  App-style shopping
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <h1 className="max-w-xl text-white">
                  Paints and plumbing, organized for fast, confident shopping.
                </h1>
                <p className="max-w-xl text-sm font-medium leading-6 text-white/78 sm:text-base sm:leading-7">
                  Discover trusted brands, compact category rails, and reliable essentials for
                  every repair, refresh, and renovation.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button variant="accent" size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/products?department=paints">
                    Shop Paints
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="w-full border-white/15 bg-white/10 text-white hover:bg-white/15 sm:w-auto">
                  <Link href="/products?department=plumbing">Shop Plumbing</Link>
                </Button>
                <Button variant="ghost" size="lg" asChild className="w-full justify-start text-white hover:bg-white/10 sm:w-auto">
                  <Link href="/products">Browse all</Link>
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {HIGHLIGHTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-[1.2rem] border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-sm"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                          {item.label}
                        </p>
                        <p className="text-sm font-bold text-white">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={cardVariants} className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                const href = getProtectedHref(action.href);
                return (
                  <Link
                    key={action.label}
                    href={href}
                    className="group rounded-[1.4rem] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-[1.1rem]", action.tone)}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-bold text-text">{action.label}</span>
                    </div>
                  </Link>
                );
              })}
            </motion.div>
          </div>

          <motion.div variants={cardVariants} className="grid gap-4">
            <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted eyebrow-font">
                    Quick shopping
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-text">Your shortcuts</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Live
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {MINI_CARDS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={`rounded-[1.35rem] bg-gradient-to-br ${item.accent} border border-border/70 p-3`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-text">{item.title}</p>
                          <p className="mt-1 text-sm font-medium text-muted">{item.subtitle}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-accent shadow-[var(--shadow-sm)]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted eyebrow-font">
                    Marketplace snapshot
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-text">Built for quick decisions</h2>
                </div>
                <div className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                  2026 ready
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Brands", value: "40+", icon: BadgeCheck },
                  { label: "Categories", value: "12", icon: Sparkles },
                  { label: "Dispatch", value: "24h", icon: Truck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-background-secondary/60 p-3 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent shadow-[var(--shadow-sm)]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-lg font-bold text-text">{item.value}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-accent/15 bg-accent/10 px-4 py-3 text-sm font-medium text-text">
                Search, compare, and add to cart with a compact app-like layout across every device.
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

export { Hero };
