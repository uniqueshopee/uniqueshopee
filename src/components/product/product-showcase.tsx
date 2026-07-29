"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ProductShowcaseProps = {
  title: string;
  subtitle: string;
  products: Product[];
  viewAllHref: string;
  badge?: string;
  viewAllLabel?: string;
};

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

function makeSectionId(title: string) {
  return `product-showcase-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function ProductShowcase({
  title,
  subtitle,
  products,
  viewAllHref,
  badge,
  viewAllLabel = "View All",
}: ProductShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const sectionId = makeSectionId(title);

  return (
    <motion.section
      aria-labelledby={sectionId}
      className="border-b border-border bg-background"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.18 }}
      variants={containerVariants}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <motion.header
          className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-6"
          variants={itemVariants}
        >
          <div className="max-w-2xl">
            {badge && (
              <Badge variant="accent" className="mb-3 eyebrow-font">
                {badge}
              </Badge>
            )}
            <h2 id={sectionId} className="text-xl font-bold text-text sm:text-2xl">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">
              {subtitle}
            </p>
          </div>

          <Button variant="outline" size="md" asChild className="w-full sm:w-auto">
            <Link href={viewAllHref} aria-label={`View all ${title.toLowerCase()}`}>
              {viewAllLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.header>

        {products.length === 0 ? (
          <motion.div variants={itemVariants}>
            <EmptyState
              title="No products available"
              description="Check back soon for new arrivals, featured picks, and curated collections."
            />
          </motion.div>
        ) : (
          <motion.ul
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            variants={containerVariants}
          >
            {products.map((product) => (
              <motion.li
                key={product.id}
                variants={itemVariants}
                className="list-none"
              >
                <ProductCard product={product} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.section>
  );
}

export { ProductShowcase };
export type { ProductShowcaseProps };
