"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, ShoppingCart, LayoutGrid, Search, Gift } from "lucide-react";
import { DEPARTMENTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DepartmentCard } from "./department-card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { buildLoginRedirectPath } from "@/lib/auth";

const QUICK_SHOP_ACTIONS = [
  { label: "All Products", href: "/products", icon: LayoutGrid, tone: "bg-primary/8 text-primary" },
  { label: "Search Items", href: "/search", icon: Search, tone: "bg-violet-500/12 text-violet-600" },
  { label: "Offers", href: "/products", icon: Gift, tone: "bg-emerald-500/12 text-emerald-600" },
  { label: "Cart", href: "/cart", icon: ShoppingCart, tone: "bg-orange-500/12 text-orange-600" },
];

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
};

function DepartmentGrid() {
  const shouldReduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();

  const getProtectedHref = (href: string) => {
    if (isAuthenticated) {
      return href;
    }

    if (href === "/cart") {
      return buildLoginRedirectPath(href);
    }

    return href;
  };

  return (
    <motion.section
      aria-labelledby="shop-by-department"
      className="relative isolate overflow-hidden border-b border-border surface-warm"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.22 }}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-orange-400/5 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-sky-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <motion.header className="mb-5 max-w-2xl lg:mb-6" variants={itemVariants}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent shadow-[var(--shadow-sm)] backdrop-blur-sm eyebrow-font">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Quick access
          </div>
          <h2 id="shop-by-department" className="text-xl font-bold text-text sm:text-2xl">
            Shop by Department
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">
            Jump straight into the sections and shopping shortcuts you use most.
          </p>
        </motion.header>

        <motion.div className="space-y-6" variants={containerVariants}>
          <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted eyebrow-font">
                  Quick shopping
                </p>
                <h3 className="mt-1 text-base font-bold text-text">Common actions</h3>
              </div>
              <Button asChild variant="ghost" size="sm" className="rounded-full px-2 text-accent">
                <Link href="/products">
                  View all
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_SHOP_ACTIONS.map((action) => {
                const Icon = action.icon;
                const href = getProtectedHref(action.href);
                return (
                  <Link
                    key={action.label}
                    href={href}
                    className="group rounded-[1.35rem] border border-border/70 bg-background-secondary/40 p-3 text-center transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem]", action.tone)}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="mt-2 block text-sm font-bold text-text">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {DEPARTMENTS.map((department) => (
              <motion.div key={department.id} variants={itemVariants} className="h-full">
                <DepartmentCard department={department} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

export { DepartmentGrid };
