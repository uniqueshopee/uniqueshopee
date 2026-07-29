"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Award,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import type {
  BrandCertification,
  BrandCollectionItem,
  BrandContent,
  BrandFaq,
  BrandPillar,
} from "@/lib/brand-data";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ProductShowcase } from "@/components/product/product-showcase";
import { CategoryIllustration, type CategoryScene } from "@/components/product/category-illustration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BrandLandingPageProps = {
  brand: BrandContent;
  featuredProducts: Product[];
  recentProducts: Product[];
  relatedBrands: BrandContent[];
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

function getBrandTone(theme: BrandContent["theme"]) {
  if (theme === "paint") {
    return {
      wash: "from-orange-50 via-white to-amber-50",
      ring: "ring-orange-200",
      accent: "from-amber-400 via-orange-500 to-red-500",
      badge: "accent" as const,
      glow: "bg-orange-300/10",
      shadow: "shadow-[0_24px_60px_-30px_rgba(249,115,22,0.35)]",
    };
  }

  return {
    wash: "from-cyan-50 via-white to-sky-50",
    ring: "ring-cyan-200",
    accent: "from-sky-500 via-cyan-400 to-emerald-400",
    badge: "neutral" as const,
    glow: "bg-cyan-300/10",
    shadow: "shadow-[0_24px_60px_-30px_rgba(6,182,212,0.35)]",
  };
}

function BrandHeroArtwork({
  brand,
  tone,
}: {
  brand: BrandContent;
  tone: ReturnType<typeof getBrandTone>;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-white/92 p-4 shadow-[var(--shadow-lg)]">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br p-5 ring-1 ring-inset",
          tone.wash,
          tone.ring,
          tone.shadow,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),transparent_58%)]" />
        <div className="absolute -left-4 top-8 h-32 w-32 rounded-full bg-white/40 blur-2xl" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/35 blur-2xl" />

        <div className="relative grid gap-5 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-text shadow-[var(--shadow-sm)]">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Hero image placeholder
            </div>
            <div className="space-y-3">
              <BrandLogo name={brand.name} className="h-16 max-w-[12rem] rounded-[1.15rem]" />
              <h2 className="text-2xl font-bold text-text sm:text-3xl">{brand.tagline}</h2>
              <p className="max-w-xl text-sm font-medium leading-7 text-muted">{brand.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/75 bg-white/85 px-4 py-3 shadow-[var(--shadow-sm)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Founded</p>
                <p className="mt-1 text-lg font-bold text-text">{brand.founded}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/75 bg-white/85 px-4 py-3 shadow-[var(--shadow-sm)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Trust</p>
                <p className="mt-1 text-lg font-bold text-text">{new Date().getFullYear() - brand.founded} yrs</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/75 bg-white/85 px-4 py-3 shadow-[var(--shadow-sm)] sm:col-span-1 col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">HQ</p>
                <p className="mt-1 text-sm font-bold text-text">{brand.headquarters}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {brand.categories.slice(0, 4).map((category) => (
                <Badge key={category.name} variant={tone.badge} className="bg-white/80">
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto aspect-[4/3.4] max-w-[28rem] overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/85 shadow-[var(--shadow-lg)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_60%)]" />
              <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-white/55 blur-2xl" />
              <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-white/45 blur-2xl" />
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="neutral" className="eyebrow-font">
                    {brand.theme === "paint" ? "Colour systems" : "Flow systems"}
                  </Badge>
                  <span className={cn("h-1.5 w-16 rounded-full bg-gradient-to-r", tone.accent)} aria-hidden="true" />
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-[18rem]">
                    <CategoryIllustration
                      label={brand.name}
                      scene={brand.heroScene as CategoryScene}
                      tone={{
                        fill: tone.wash,
                        ring: tone.ring,
                        accentRgb: brand.theme === "paint" ? "rgb(249 115 22)" : "rgb(6 182 212)",
                        wash: brand.theme === "paint" ? "rgba(249, 115, 22, 0.16)" : "rgba(6, 182, 212, 0.16)",
                      }}
                    />
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-white/70 bg-white/85 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {brand.heroImagePlaceholder}
                  </p>
                  <p className="mt-1 text-sm font-bold text-text">{brand.name} signature experience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  theme,
}: {
  category: BrandContent["categories"][number];
  theme: BrandContent["theme"];
}) {
  const tone = getBrandTone(theme);

  return (
    <Card className="group h-full">
      <Link
        href={category.href}
        aria-label={`Explore ${category.name}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div
            className={cn(
              "overflow-hidden rounded-[1.25rem] border border-border/70 bg-gradient-to-br p-3",
              theme === "paint" ? "from-amber-50 via-white to-orange-50" : "from-cyan-50 via-white to-sky-50",
            )}
          >
            <div className="relative aspect-[4/2.15] w-full">
              <CategoryIllustration
                label={category.name}
                scene={category.scene}
                tone={{
                  fill: tone.wash,
                  ring: tone.ring,
                  accentRgb: theme === "paint" ? "rgb(249 115 22)" : "rgb(6 182 212)",
                  wash: theme === "paint" ? "rgba(249, 115, 22, 0.16)" : "rgba(6, 182, 212, 0.16)",
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-text">{category.name}</h3>
            <p className="text-sm font-medium leading-6 text-muted">{category.description}</p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="h-1 w-10 rounded-full bg-border transition-colors group-hover:bg-accent" />
            <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
          </div>
        </div>
      </Link>
    </Card>
  );
}

function CollectionCard({ collection, theme }: { collection: BrandCollectionItem; theme: BrandContent["theme"] }) {
  const tone = getBrandTone(theme);

  return (
    <Card className="group h-full">
      <Link
        href={collection.href}
        aria-label={`Explore ${collection.name}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-gradient-to-br from-white via-background-secondary to-white p-3">
            <div className="relative aspect-[4/2.1] w-full">
              <CategoryIllustration
                label={collection.name}
                scene={collection.scene}
                tone={{
                  fill: tone.wash,
                  ring: tone.ring,
                  accentRgb: theme === "paint" ? "rgb(249 115 22)" : "rgb(6 182 212)",
                  wash: theme === "paint" ? "rgba(249, 115, 22, 0.16)" : "rgba(6, 182, 212, 0.16)",
                }}
              />
            </div>
          </div>
          <h3 className="text-sm font-bold text-text">{collection.name}</h3>
          <p className="text-sm font-medium leading-6 text-muted">{collection.description}</p>
        </div>
      </Link>
    </Card>
  );
}

function BrandCard({ brand }: { brand: BrandContent }) {
  const tone = getBrandTone(brand.theme);

  return (
    <Card className="group h-full">
      <Link
        href={`/brand/${brand.slug}`}
        aria-label={`Explore ${brand.name}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={brand.theme === "paint" ? "accent" : "neutral"} className="shrink-0">
              {brand.theme === "paint" ? "Paint" : "Plumbing"}
            </Badge>
            <span className={cn("h-1.5 w-16 rounded-full bg-gradient-to-r", tone.accent)} aria-hidden="true" />
          </div>
          <div className="flex min-h-24 items-center justify-center rounded-[1.25rem] border border-border/70 bg-white/90 p-3">
            <BrandLogo name={brand.name} className="h-16 rounded-[1.1rem]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text">{brand.name}</h3>
            <p className="text-sm font-medium leading-6 text-muted">{brand.tagline}</p>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function PillarCard({ pillar, index }: { pillar: BrandPillar; index: number }) {
  const icons = [ShieldCheck, BadgeCheck, Truck, Users, Award];
  const Icon = icons[index % icons.length]!;

  return (
    <Card className="h-full">
      <div className="space-y-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-bold text-text">{pillar.title}</h3>
          <p className="text-sm font-medium leading-7 text-muted">{pillar.description}</p>
        </div>
      </div>
    </Card>
  );
}

function CertificationChip({ certification }: { certification: BrandCertification }) {
  return (
    <div className="rounded-[1.15rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-bold text-text">{certification.label}</p>
      <p className="mt-1 text-xs font-medium text-muted">{certification.note}</p>
    </div>
  );
}

function FAQItem({ faq }: { faq: BrandFaq }) {
  return (
    <details className="group rounded-[1.1rem] border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-sm)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span>{faq.question}</span>
        <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="mt-3 text-sm font-medium leading-7 text-muted">{faq.answer}</p>
    </details>
  );
}

function BrandLandingPage({ brand, featuredProducts, recentProducts, relatedBrands }: BrandLandingPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const tone = getBrandTone(brand.theme);

  return (
    <main className="bg-background">
      <motion.section
        aria-labelledby="brand-title"
        className="relative isolate overflow-hidden border-b border-border surface-warm"
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.15 }}
        variants={SECTION_VARIANTS}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-orange-300/5 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-300/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
              <li>
                <Link href="/" className="transition-colors hover:text-text focus-visible:text-text">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span aria-current="page" className="text-muted">
                  Brands
                </span>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-text">{brand.name}</li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-3xl">
              <Badge variant={tone.badge} className="mb-4 eyebrow-font">
                {brand.theme === "paint" ? "Paint brand" : "Plumbing brand"}
              </Badge>
              <h1 id="brand-title" className="text-text">
                {brand.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-muted sm:text-lg">
                {brand.description}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Years of trust</p>
                  <p className="mt-1 text-lg font-bold text-text">{new Date().getFullYear() - brand.founded}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Founded</p>
                  <p className="mt-1 text-lg font-bold text-text">{brand.founded}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Headquarters</p>
                  <p className="mt-1 text-sm font-bold text-text">{brand.headquarters}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {brand.categories.slice(0, 4).map((category) => (
                  <Badge key={category.name} variant="neutral">
                    {category.name}
                  </Badge>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="primary" size="md" asChild>
                  <Link href="/products">
                    Shop Products
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="md" asChild>
                  <Link href="/products">
                    View featured
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <BrandHeroArtwork brand={brand} tone={tone} />
          </div>
        </div>
      </motion.section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">About brand</p>
              <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">About Brand</h2>
              <p className="mt-3 text-base font-medium text-muted">
                A concise history of how the brand grew, what it stands for, and why customers keep coming back.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <div className="space-y-4 p-6">
                <h3 className="text-lg font-bold text-text">Timeline</h3>
                <div className="space-y-4">
                  {brand.history.map((item, index) => (
                    <div key={`${item.year}-${item.title}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                          {index + 1}
                        </span>
                        {index !== brand.history.length - 1 && <span className="mt-2 h-full w-px bg-border" aria-hidden="true" />}
                      </div>
                      <div className="pb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{item.year}</p>
                        <h4 className="mt-1 text-base font-bold text-text">{item.title}</h4>
                        <p className="mt-2 text-sm font-medium leading-7 text-muted">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="space-y-4 p-6">
                  <h3 className="text-lg font-bold text-text">Strengths</h3>
                  <div className="grid gap-3">
                    {brand.strengths.map((strength) => (
                      <div key={strength} className="flex items-start gap-3 rounded-[1rem] border border-border/70 bg-white/85 p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        <p className="text-sm font-medium leading-7 text-muted">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="space-y-4 p-6">
                  <h3 className="text-lg font-bold text-text">Popular collections</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {brand.popularCollections.map((collection) => (
                      <CollectionCard key={collection.name} collection={collection} theme={brand.theme} />
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-splash">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Popular categories</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Popular Categories</h2>
          </div>
          <motion.div
            className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6"
            variants={SECTION_VARIANTS}
            initial={false}
            animate="visible"
          >
            {brand.categories.map((category) => (
              <motion.div key={category.name} variants={SECTION_VARIANTS} className="h-full">
                <CategoryCard category={category} theme={brand.theme} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <ProductShowcase
        title="Featured Products"
        subtitle={`Carefully selected products associated with ${brand.name} and trusted by professionals and homeowners.`}
        products={featuredProducts}
        viewAllHref="/products"
        badge="Featured"
        viewAllLabel="Shop Products"
      />

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Why customers trust</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Why Choose This Brand</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {brand.trustPillars.map((pillar, index) => (
              <PillarCard key={pillar.title} pillar={pillar} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-warm">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Certifications</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Certifications</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {brand.certifications.map((certification) => (
              <CertificationChip key={certification.label} certification={certification} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Buying guide</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Buying Guide</h2>
          </div>
          <Card>
            <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="space-y-4">
                <p className="text-sm font-medium leading-7 text-muted">
                  When choosing products from {brand.name}, start with the application, then narrow down the finish,
                  compatibility, and after-sales support. That keeps the result premium without overspending.
                </p>
                <div className="space-y-3">
                  {brand.buyingGuide.map((step, index) => (
                    <div key={step} className="flex items-start gap-3 rounded-[1rem] border border-border/70 bg-white/85 p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium leading-7 text-muted">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background-secondary via-white to-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Quick advice</p>
                <div className="mt-3 space-y-3 text-sm font-medium leading-7 text-muted">
                  <p>{brand.theme === "paint" ? "Pair primers and finish coats for better durability." : "Keep pipe, valve, and fitting systems compatible."}</p>
                  <p>{brand.theme === "paint" ? "Choose collections by room usage and exposure." : "Match fixtures to the bathroom layout and water pressure."}</p>
                  <p>{brand.theme === "paint" ? "Use dealer support to verify shade and surface prep." : "Confirm material and pressure ratings before purchase."}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-splash">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Frequently asked questions</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">FAQ</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {brand.faqs.map((faq) => (
              <FAQItem key={faq.question} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Related brands</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Related Brands</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedBrands.map((relatedBrand) => (
              <BrandCard key={relatedBrand.slug} brand={relatedBrand} />
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase
        title="Recently Viewed"
        subtitle="Return to products you recently explored and continue browsing with confidence."
        products={recentProducts}
        viewAllHref="/products"
        badge="Recently Viewed"
        viewAllLabel="Shop Products"
      />
    </main>
  );
}

export { BrandLandingPage };
