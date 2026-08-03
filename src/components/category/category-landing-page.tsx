"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3X3,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/product/product-card";
import { ProductShowcase } from "@/components/product/product-showcase";
import { CategoryIllustration, type CategoryScene } from "@/components/product/category-illustration";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { CategoryBrand, CategoryContent, RelatedCategory } from "@/lib/category-data";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Modal } from "@/components/ui/modal";
import { cn, formatPrice } from "@/lib/utils";

type CatalogProduct = Product & {
  brand: string;
  isFeatured: boolean;
  isNew: boolean;
};

type AvailabilityFilter = "all" | "in-stock" | "out-of-stock";
type SortMode = "featured" | "price-asc" | "price-desc" | "rating-desc" | "newest";
type ViewMode = "grid" | "list";
type BadgeVariant = "accent" | "neutral" | "success" | "warning" | "danger";

const PAGE_SIZE = 4;

const SORT_LABELS: Record<SortMode, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "rating-desc": "Top Rated",
  newest: "Newest",
};

const FILTER_BUTTONS = {
  active:
    "border-accent/20 bg-accent/10 text-accent shadow-[0_8px_18px_-16px_rgba(249,115,22,0.55)]",
  inactive: "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
};

const ANIM_CONTAINER = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const ANIM_ITEM = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

function getBrandColor(category: CategoryBrand["category"]): {
  badge: BadgeVariant;
  border: string;
  accent: string;
} {
  switch (category) {
    case "Paint":
      return {
        badge: "accent",
        border: "border-orange-200/70",
        accent: "from-amber-400 via-orange-500 to-red-500",
      };
    case "Plumbing":
      return {
        badge: "neutral",
        border: "border-cyan-200/70",
        accent: "from-sky-500 via-cyan-400 to-emerald-400",
      };
    default:
      return {
        badge: "neutral",
        border: "border-border/70",
        accent: "from-slate-400 via-slate-300 to-slate-200",
      };
  }
}

function getSceneTone(scene: CategoryScene) {
  if (scene === "pipes" || scene === "pipes-cold" || scene === "fittings" || scene === "faucet" || scene === "valve" || scene === "pump" || scene === "tank" || scene === "bathroom") {
    return {
      fill: "from-cyan-50 via-white to-sky-50",
      ring: "ring-cyan-200",
      accentRgb: "rgb(6 182 212)",
      wash: "rgba(6, 182, 212, 0.16)",
    };
  }

  if (scene === "tools" || scene === "metal") {
    return {
      fill: "from-indigo-50 via-white to-blue-50",
      ring: "ring-indigo-200",
      accentRgb: "rgb(59 130 246)",
      wash: "rgba(59, 130, 246, 0.16)",
    };
  }

  return {
    fill: "from-amber-50 via-white to-orange-50",
    ring: "ring-amber-200",
    accentRgb: "rgb(245 158 11)",
    wash: "rgba(245, 158, 11, 0.16)",
  };
}

function FilterGroup({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[1.35rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-text">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CategoryBrandCard({ brand }: { brand: CategoryBrand }) {
  const colors = getBrandColor(brand.category);
  const initials = brand.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <Card className="group h-full">
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={colors.badge} className="shrink-0">
            {brand.category}
          </Badge>
          <span className={cn("h-1.5 w-16 rounded-full bg-gradient-to-r", colors.accent)} aria-hidden="true" />
        </div>

        <div className="flex min-h-24 items-center justify-center rounded-[1.2rem] border border-border/70 bg-white/90 p-3">
          {brand.logo ? (
            <div className={cn("h-16 w-full rounded-[1rem] border", colors.border)}>
              <BrandLogo name={brand.name} className="h-16 rounded-[1rem]" />
            </div>
          ) : (
            <div className="flex h-16 w-full items-center justify-center rounded-[1rem] border border-border/70 bg-gradient-to-br from-background-secondary to-white text-lg font-bold text-text">
              {initials || brand.name.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-text">{brand.name}</h3>
          <p className="text-sm font-medium leading-6 text-muted">{brand.description}</p>
        </div>

        <Button variant="outline" size="sm" asChild className="mt-auto w-full">
          <Link href={brand.href} aria-label={`Explore ${brand.name}`}>
            Explore
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function RelatedCategoryCard({ category }: { category: RelatedCategory }) {
  const tone = getSceneTone(category.scene);

  return (
    <Card className="group h-full">
      <Link
        href={category.href}
        aria-label={`Explore ${category.name}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-gradient-to-br from-background-secondary via-white to-white p-3">
            <div className="relative aspect-[4/2.15] w-full">
              <CategoryIllustration label={category.name} scene={category.scene} tone={tone} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text">{category.name}</h3>
              <p className="text-sm font-medium text-muted">Explore the catalog</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
          </div>
        </div>
      </Link>
    </Card>
  );
}

function CategoryLandingPage({
  category,
  products,
  recentProducts,
}: {
  category: CategoryContent;
  products: CatalogProduct[];
  recentProducts: Product[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const minPrice = useMemo(() => (products.length ? Math.min(...products.map((product) => product.price)) : 0), [products]);
  const maxPrice = useMemo(() => (products.length ? Math.max(...products.map((product) => product.price)) : 0), [products]);
  const [priceCap, setPriceCap] = useState(maxPrice);

  useEffect(() => {
    setPriceCap(maxPrice);
  }, [maxPrice]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, selectedBrands, priceCap, availability, discountOnly, sort, viewMode]);

  const filteredProducts = useMemo(() => {
    const loweredQuery = deferredQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesQuery =
        loweredQuery.length === 0 ||
        product.name.toLowerCase().includes(loweredQuery) ||
        product.category.toLowerCase().includes(loweredQuery) ||
        product.brand.toLowerCase().includes(loweredQuery);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const matchesPrice = product.price <= priceCap;
      const matchesAvailability =
        availability === "all" ||
        (availability === "in-stock" ? product.inStock : !product.inStock);
      const matchesDiscount = !discountOnly || Boolean(product.compareAtPrice && product.compareAtPrice > product.price);

      return matchesQuery && matchesBrand && matchesPrice && matchesAvailability && matchesDiscount;
    });

    const sorters: Record<SortMode, (left: CatalogProduct, right: CatalogProduct) => number> = {
      featured: (left, right) => {
        const leftScore = (left.isFeatured ? 2 : 0) + (left.badge === "bestseller" ? 1 : 0);
        const rightScore = (right.isFeatured ? 2 : 0) + (right.badge === "bestseller" ? 1 : 0);
        return rightScore - leftScore;
      },
      "price-asc": (left, right) => left.price - right.price,
      "price-desc": (left, right) => right.price - left.price,
      "rating-desc": (left, right) => (right.rating ?? 0) - (left.rating ?? 0),
      newest: (left, right) => Number(right.isNew) - Number(left.isNew),
    };

    return filtered.sort(sorters[sort]);
  }, [products, deferredQuery, selectedBrands, priceCap, availability, discountOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const shownStart = filteredProducts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const shownEnd = Math.min(safePage * PAGE_SIZE, filteredProducts.length);

  const clearFilters = () => {
    setQuery("");
    setSelectedBrands([]);
    setAvailability("all");
    setDiscountOnly(false);
    setSort("featured");
    setViewMode("grid");
    setPriceCap(maxPrice);
    setPage(1);
  };

  const filterSummary = [
    selectedBrands.length > 0 ? `${selectedBrands.length} brand${selectedBrands.length > 1 ? "s" : ""}` : null,
    priceCap < maxPrice ? `Under ${formatPrice(priceCap)}` : null,
    availability !== "all" ? availability.replace("-", " ") : null,
    discountOnly ? "Discounted" : null,
  ].filter(Boolean) as string[];

  const tone = category.tone;

  return (
    <main className="bg-background pt-20 sm:pt-24 lg:pt-28">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-[color:var(--color-background)]/96 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-3 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${category.title.toLowerCase()}...`}
                className="h-12 rounded-full border-border/80 bg-white/90 pl-11 shadow-[var(--shadow-sm)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Sort by</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="Sort products"
                  className="h-12 w-full appearance-none rounded-full border border-border/80 bg-white/90 px-4 pr-10 text-sm font-semibold text-text shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              </div>
            </label>

            <div className="flex items-end justify-between gap-3">
              <Button variant="outline" size="md" type="button" className="md:hidden" onClick={() => setMobileFiltersOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <motion.section
        aria-labelledby="category-title"
        className="relative isolate overflow-hidden border-b border-border surface-warm"
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.15 }}
        variants={ANIM_CONTAINER}
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
                <span aria-current="page" className="text-text">
                  {category.title}
                </span>
              </li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-3xl">
              <Badge variant="accent" className="mb-4 eyebrow-font">
                {category.eyebrow}
              </Badge>
              <h1 id="category-title" className="text-text">
                {category.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-muted sm:text-lg">
                {category.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Products</p>
                  <p className="mt-1 text-lg font-bold text-text">{filteredProducts.length}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Popular brands</p>
                  <p className="mt-1 text-lg font-bold text-text">{category.brands.length}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Guide steps</p>
                  <p className="mt-1 text-lg font-bold text-text">{category.buyingGuide.length}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-white/92 p-4 shadow-[var(--shadow-lg)]">
              <div className={`relative overflow-hidden rounded-[1.7rem] border border-white/80 bg-gradient-to-br ${tone.fill} p-5 ring-1 ring-inset ${tone.ring}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_58%)]" />
                <div className="relative grid gap-4 sm:grid-cols-[1fr_0.9fr] sm:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Category illustration</p>
                    <h2 className="mt-2 text-xl font-bold text-text">{category.title}</h2>
                    <p className="mt-2 text-sm font-medium leading-7 text-muted">{category.subtitle}</p>
                  </div>
                  <div className="mx-auto aspect-[4/2.4] w-full max-w-sm">
                    <CategoryIllustration
                      label={category.title}
                      scene={category.scene as CategoryScene}
                      tone={tone}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-300/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Catalog</p>
              <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Browse products in this category</h2>
              <p className="mt-3 text-base font-medium text-muted">
                Filter, sort, and switch views to find the right products faster.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-border/80 bg-white/90 p-1 shadow-[var(--shadow-sm)]">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                  viewMode === "grid" ? "bg-accent/10 text-accent" : "text-muted hover:text-text",
                )}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                  viewMode === "list" ? "bg-accent/10 text-accent" : "text-muted hover:text-text",
                )}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {filterSummary.length > 0 && (
            <motion.div className="mb-5 flex flex-wrap gap-2" variants={ANIM_ITEM}>
              {filterSummary.map((item) => (
                <Badge key={item} variant="neutral" className="eyebrow-font">
                  {item}
                </Badge>
              ))}
            </motion.div>
          )}

          <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text">Filters</h2>
                  <button type="button" onClick={clearFilters} className="text-sm font-semibold text-accent hover:underline">
                    Clear all
                  </button>
                </div>
                <FilterContent
                  brands={category.brands.map((brand) => brand.name)}
                  selectedBrands={selectedBrands}
                  setSelectedBrands={setSelectedBrands}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  priceCap={priceCap}
                  setPriceCap={setPriceCap}
                  availability={availability}
                  setAvailability={setAvailability}
                  discountOnly={discountOnly}
                  setDiscountOnly={setDiscountOnly}
                  onClear={clearFilters}
                  query={query}
                  setQuery={setQuery}
                />
              </div>
            </aside>

            <div className="space-y-5">
              <details className="lg:hidden rounded-[1.35rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)] md:block">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text">
                  <span className="inline-flex items-center gap-2">
                    <Filter className="h-4 w-4 text-accent" aria-hidden="true" />
                    Filter products
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Collapsible</span>
                </summary>
                <div className="mt-4">
                  <FilterContent
                    brands={category.brands.map((brand) => brand.name)}
                    selectedBrands={selectedBrands}
                    setSelectedBrands={setSelectedBrands}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    priceCap={priceCap}
                    setPriceCap={setPriceCap}
                    availability={availability}
                    setAvailability={setAvailability}
                    discountOnly={discountOnly}
                    setDiscountOnly={setDiscountOnly}
                    onClear={clearFilters}
                    query={query}
                    setQuery={setQuery}
                  />
                </div>
              </details>

              <div className="lg:hidden">
                <div className="flex items-center justify-between rounded-[1.35rem] border border-border/70 bg-white/85 px-4 py-3 shadow-[var(--shadow-sm)] md:hidden">
                  <p className="text-sm font-semibold text-text">Need advanced filters?</p>
                  <Button variant="outline" size="sm" type="button" onClick={() => setMobileFiltersOpen(true)}>
                    Open
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-[1.35rem] border border-border/70 bg-white/85 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <div>
                    <p className="text-sm font-semibold text-text">{filteredProducts.length} products found</p>
                    <p className="text-xs font-medium text-muted">
                      Showing {shownStart}-{shownEnd} of {filteredProducts.length}
                    </p>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <EmptyState
                    title="No products matched your filters"
                    description="Try a different search, relax one of the filters, or clear everything to browse the full category."
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                    secondaryActionLabel="Browse all products"
                    onSecondaryAction={() => router.push("/products")}
                  />
                ) : (
                  <motion.ul
                    className={cn(
                      "grid gap-4",
                      viewMode === "grid"
                        ? "grid-cols-2 sm:grid-cols-2 xl:grid-cols-4"
                        : "grid-cols-1",
                    )}
                    variants={ANIM_CONTAINER}
                    initial={false}
                    animate="visible"
                  >
                    {paginatedProducts.map((product) => (
                      <motion.li key={product.id} variants={ANIM_ITEM} className="h-full list-none">
                        <ProductCard product={product} />
                      </motion.li>
                    ))}
                  </motion.ul>
                )}

                {filteredProducts.length > 0 && totalPages > 1 && (
                  <div className="flex flex-col gap-3 rounded-[1.35rem] border border-border/70 bg-white/85 px-4 py-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-muted">
                      Page {safePage} of {totalPages}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={safePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Prev
                      </Button>
                      {Array.from({ length: totalPages }).map((_, index) => {
                        const value = index + 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPage(value)}
                            aria-current={value === safePage ? "page" : undefined}
                            className={cn(
                              "flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-all",
                              value === safePage
                                ? "border-accent/20 bg-accent/10 text-accent"
                                : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                            )}
                          >
                            {value}
                          </button>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        disabled={safePage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-splash">
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <Card className="overflow-hidden">
            <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-3">
                <Badge variant="accent" className="eyebrow-font">
                  Seasonal promotion
                </Badge>
                <h2 className="text-xl font-bold text-text sm:text-2xl">Promotional Banner</h2>
                <p className="max-w-2xl text-base font-medium leading-7 text-muted">{category.promotionalBanner}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="primary" size="md" asChild>
                  <Link href="/products">
                    View All Products
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="md" asChild>
                  <Link href={`/${category.slug}`}>
                    Explore Category
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Popular brands</p>
              <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Popular Brands</h2>
            </div>
          </div>
          <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" variants={ANIM_CONTAINER}>
            {category.brands.map((brand) => (
              <motion.div key={brand.name} variants={ANIM_ITEM}>
                <CategoryBrandCard brand={brand} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-warm">
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Related categories</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Related Categories</h2>
          </div>
          <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={ANIM_CONTAINER}>
            {category.relatedCategories.map((item) => (
              <motion.div key={item.slug} variants={ANIM_ITEM}>
                <RelatedCategoryCard category={item} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Buying guide</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Buying Guide</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {category.buyingGuide.map((item, index) => (
              <Card key={item}>
                <div className="space-y-3 p-5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium leading-7 text-muted">{item}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-splash">
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Frequently asked questions</p>
            <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">FAQ</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {category.faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-[1.1rem] border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-sm)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span>{item.question}</span>
                  <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm font-medium leading-7 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase
        title="Recently Viewed"
        subtitle="Return to products you explored recently and keep browsing with context."
        products={recentProducts}
        viewAllHref="/products"
        badge="Recently Viewed"
        viewAllLabel="View All Products"
      />

      <Modal
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        title="Filters"
        description="Refine the category catalog on mobile."
        className="left-auto top-auto right-0 bottom-0 h-[88vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[1.5rem] border-t border-border p-4 md:hidden"
      >
        <div className="h-full overflow-y-auto pr-1">
          <FilterContent
            brands={category.brands.map((brand) => brand.name)}
            selectedBrands={selectedBrands}
            setSelectedBrands={setSelectedBrands}
            minPrice={minPrice}
            maxPrice={maxPrice}
            priceCap={priceCap}
            setPriceCap={setPriceCap}
            availability={availability}
            setAvailability={setAvailability}
            discountOnly={discountOnly}
            setDiscountOnly={setDiscountOnly}
            onClear={() => {
              clearFilters();
              setMobileFiltersOpen(false);
            }}
            query={query}
            setQuery={setQuery}
          />
        </div>
      </Modal>
    </main>
  );
}

function FilterContent({
  brands,
  selectedBrands,
  setSelectedBrands,
  minPrice,
  maxPrice,
  priceCap,
  setPriceCap,
  availability,
  setAvailability,
  discountOnly,
  setDiscountOnly,
  query,
  setQuery,
  onClear,
}: {
  brands: string[];
  selectedBrands: string[];
  setSelectedBrands: (value: string[]) => void;
  minPrice: number;
  maxPrice: number;
  priceCap: number;
  setPriceCap: (value: number) => void;
  availability: AvailabilityFilter;
  setAvailability: (value: AvailabilityFilter) => void;
  discountOnly: boolean;
  setDiscountOnly: (value: boolean) => void;
  query: string;
  setQuery: (value: string) => void;
  onClear: () => void;
}) {
  const toggleBrand = (brand: string) => {
    setSelectedBrands(
      selectedBrands.includes(brand)
        ? selectedBrands.filter((item) => item !== brand)
        : [...selectedBrands, brand],
    );
  };

  return (
    <div className="space-y-4">
      <FilterGroup
        title="Search"
        action={
          <Badge variant="neutral" className="px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
            Live
          </Badge>
        }
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="h-12 rounded-full border-border/80 bg-white/90 pl-10"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Brand">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedBrands([])}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
              selectedBrands.length === 0 ? FILTER_BUTTONS.active : FILTER_BUTTONS.inactive,
            )}
          >
            All Brands
          </button>
          {brands.map((brand) => {
            const active = selectedBrands.includes(brand);
            return (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                  active ? FILTER_BUTTONS.active : FILTER_BUTTONS.inactive,
                )}
              >
                {brand}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Price range"
        action={<span className="text-xs font-semibold text-muted">{formatPrice(priceCap)}</span>}
      >
        <div className="space-y-3">
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={priceCap}
            onChange={(event) => setPriceCap(Number(event.target.value))}
            aria-label="Maximum price"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-background-secondary accent-[color:var(--color-accent)]"
          />
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>{formatPrice(minPrice)}</span>
            <span>{formatPrice(priceCap)}</span>
          </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="grid gap-2">
          {[
            { value: "all", label: "All items" },
            { value: "in-stock", label: "In stock" },
            { value: "out-of-stock", label: "Out of stock" },
          ].map((item) => (
            <label
              key={item.value}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-[1rem] border px-3 py-3 text-sm font-semibold transition-all",
                availability === item.value ? FILTER_BUTTONS.active : FILTER_BUTTONS.inactive,
              )}
            >
              <span>{item.label}</span>
              <input
                type="radio"
                name="availability"
                checked={availability === item.value}
                onChange={() => setAvailability(item.value as AvailabilityFilter)}
                className="h-4 w-4 accent-[color:var(--color-accent)]"
                aria-label={item.label}
              />
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Discounts">
        <label className="flex cursor-pointer items-center justify-between rounded-[1rem] border border-border/70 bg-white/80 px-3 py-3 text-sm font-semibold text-text">
          <span>Discounted items only</span>
          <input
            type="checkbox"
            checked={discountOnly}
            onChange={(event) => setDiscountOnly(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-[color:var(--color-accent)]"
            aria-label="Discounted items only"
          />
        </label>
      </FilterGroup>

      <Button variant="outline" size="md" type="button" onClick={onClear} className="w-full">
        <X className="h-4 w-4" aria-hidden="true" />
        Clear filters
      </Button>
    </div>
  );
}

export { CategoryLandingPage };
