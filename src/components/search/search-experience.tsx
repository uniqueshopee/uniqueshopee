"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Grid3X3,
  History,
  List,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import { ProductCard } from "@/components/product/product-card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CategoryIllustration, type CategoryScene } from "@/components/product/category-illustration";
import { ProductShowcase } from "@/components/product/product-showcase";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn, formatPrice } from "@/lib/utils";
import {
  POPULAR_SEARCHES,
  RECENT_SEARCHES,
  type SearchBrand,
  type SearchCategory,
  type SearchProduct,
  type SearchSuggestion,
  type SearchTab,
} from "@/lib/search-data";

type ViewMode = "grid" | "list";
type ProductSortMode = "relevance" | "featured" | "price-asc" | "price-desc" | "rating-desc" | "newest";
type CatalogSortMode = "az" | "za";
type AvailabilityFilter = "all" | "in-stock" | "out-of-stock";

type SearchExperienceProps = {
  initialQuery: string;
  products: SearchProduct[];
  brands: SearchBrand[];
  categories: SearchCategory[];
};

const SEARCH_TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "products", label: "Products" },
  { id: "brands", label: "Brands" },
  { id: "categories", label: "Categories" },
];

const PRODUCT_SORT_OPTIONS: Array<{ value: ProductSortMode; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating-desc", label: "Top Rated" },
  { value: "newest", label: "Newest" },
];

const CATALOG_SORT_OPTIONS: Array<{ value: CatalogSortMode; label: string }> = [
  { value: "az", label: "A to Z" },
  { value: "za", label: "Z to A" },
];

const PAGE_SIZE: Record<SearchTab, number> = {
  products: 2,
  brands: 6,
  categories: 4,
};

const SECTION_VARIANTS = {
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

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreMatch(subjects: string[], query: string) {
  const term = normalize(query);

  if (!term) return 0;

  let score = 0;
  for (const subject of subjects) {
    const value = normalize(subject);
    if (!value) continue;
    if (value === term) score += 100;
    else if (value.startsWith(term)) score += 60;
    else if (value.includes(term)) score += 30;
  }
  return score;
}

function getSearchResultsFromCatalog(
  query: string,
  catalog: {
    products: SearchProduct[];
    brands: SearchBrand[];
    categories: SearchCategory[];
  },
) {
  const term = normalize(query);

  const products = catalog.products
    .filter((product) => {
      if (!term) return true;
      return scoreMatch([product.name, product.category, product.brand, ...product.keywords], term) > 0;
    })
    .map((product) => ({ product, score: scoreMatch([product.name, product.category, product.brand, ...product.keywords], term) }))
    .sort((left, right) => {
      if (!term) {
        return Number(right.product.isFeatured) - Number(left.product.isFeatured) || Number(right.product.isNew) - Number(left.product.isNew);
      }
      return right.score - left.score || (right.product.rating ?? 0) - (left.product.rating ?? 0);
    })
    .map((entry) => entry.product);

  const brands = catalog.brands
    .filter((brand) => {
      if (!term) return true;
      return scoreMatch([brand.name, brand.category, brand.tagline, ...brand.keywords], term) > 0;
    })
    .sort((left, right) => (term ? scoreMatch([right.name, right.category, right.tagline, ...right.keywords], term) - scoreMatch([left.name, left.category, left.tagline, ...left.keywords], term) : left.name.localeCompare(right.name)));

  const categories = catalog.categories
    .filter((category) => {
      if (!term) return true;
      return scoreMatch([category.name, category.description, ...category.keywords], term) > 0;
    })
    .sort((left, right) => (term ? scoreMatch([right.name, right.description, ...right.keywords], term) - scoreMatch([left.name, left.description, ...left.keywords], term) : left.name.localeCompare(right.name)));

  return { products, brands, categories };
}

function getSearchSuggestionItemsFromCatalog(
  query: string,
  catalog: {
    products: SearchProduct[];
    brands: SearchBrand[];
    categories: SearchCategory[];
  },
) {
  const term = normalize(query);
  const results = getSearchResultsFromCatalog(query, catalog);

  const productItems: SearchSuggestion[] = results.products.slice(0, 4).map((product) => ({
    id: `product-${product.id}`,
    kind: "product",
    label: product.name,
    description: product.category,
    href: product.href,
    meta: product.brand,
  }));

  const brandItems: SearchSuggestion[] = results.brands.slice(0, 4).map((brand) => ({
    id: `brand-${brand.slug}`,
    kind: "brand",
    label: brand.name,
    description: brand.tagline,
    href: brand.href,
    meta: brand.category,
  }));

  const categoryItems: SearchSuggestion[] = results.categories.slice(0, 4).map((category) => ({
    id: `category-${category.slug}`,
    kind: "category",
    label: category.name,
    description: category.description,
    href: category.href,
    meta: "Category",
  }));

  const queryItems: SearchSuggestion[] = term
    ? []
    : [
        ...RECENT_SEARCHES.slice(0, 4).map((item) => ({
          id: `recent-${normalize(item)}`,
          kind: "query" as const,
          label: item,
          description: "Recent search",
          href: `/search?q=${encodeURIComponent(item)}`,
          meta: "Recent",
        })),
        ...POPULAR_SEARCHES.slice(0, 4).map((item) => ({
          id: `popular-${normalize(item)}`,
          kind: "query" as const,
          label: item,
          description: "Popular search",
          href: `/search?q=${encodeURIComponent(item)}`,
          meta: "Popular",
        })),
      ];

  return [...productItems, ...brandItems, ...categoryItems, ...queryItems];
}

type CategoryTone = {
  ring: string;
  fill: string;
  accentRgb: string;
  wash: string;
};

const PAINT_TONE: CategoryTone = {
  ring: "rgba(249, 115, 22, 0.15)",
  fill: "rgba(249, 115, 22, 0.18)",
  accentRgb: "rgb(249, 115, 22)",
  wash: "rgba(249, 115, 22, 0.08)",
};

const BLUE_TONE: CategoryTone = {
  ring: "rgba(59, 130, 246, 0.15)",
  fill: "rgba(59, 130, 246, 0.18)",
  accentRgb: "rgb(59, 130, 246)",
  wash: "rgba(59, 130, 246, 0.08)",
};

const TEAL_TONE: CategoryTone = {
  ring: "rgba(20, 184, 166, 0.15)",
  fill: "rgba(20, 184, 166, 0.18)",
  accentRgb: "rgb(20, 184, 166)",
  wash: "rgba(20, 184, 166, 0.08)",
};

function getCategoryTone(scene: CategoryScene): CategoryTone {
  if (
    scene === "pipes" ||
    scene === "pipes-cold" ||
    scene === "fittings" ||
    scene === "faucet" ||
    scene === "valve" ||
    scene === "pump" ||
    scene === "tank" ||
    scene === "bathroom"
  ) {
    return BLUE_TONE;
  }

  if (scene === "wood" || scene === "metal" || scene === "tools") {
    return TEAL_TONE;
  }

  return PAINT_TONE;
}

function buildSearchHref(query: string) {
  const trimmed = query.trim();
  return trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
}

function getDefaultSortForTab(tab: SearchTab) {
  return tab === "products" ? "relevance" : "az";
}

function sortProducts(products: SearchProduct[], sortMode: ProductSortMode) {
  const sorted = [...products];

  switch (sortMode) {
    case "price-asc":
      return sorted.sort((left, right) => left.price - right.price);
    case "price-desc":
      return sorted.sort((left, right) => right.price - left.price);
    case "rating-desc":
      return sorted.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
    case "newest":
      return sorted.sort(
        (left, right) =>
          Number(right.isNew) - Number(left.isNew) ||
          Number(right.isFeatured) - Number(left.isFeatured) ||
          left.name.localeCompare(right.name),
      );
    case "featured":
      return sorted.sort(
        (left, right) =>
          Number(right.isFeatured) - Number(left.isFeatured) ||
          Number(right.isNew) - Number(left.isNew) ||
          left.name.localeCompare(right.name),
      );
    case "relevance":
    default:
      return sorted;
  }
}

function sortBrands(brands: SearchBrand[], sortMode: CatalogSortMode) {
  const sorted = [...brands];
  return sorted.sort((left, right) =>
    sortMode === "az" ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name),
  );
}

function sortCategories(categories: SearchCategory[], sortMode: CatalogSortMode) {
  const sorted = [...categories];
  return sorted.sort((left, right) =>
    sortMode === "az" ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name),
  );
}

function getProductCategories(products: SearchProduct[]) {
  return Array.from(new Set(products.map((product) => product.category)));
}

function getProductBrands(products: SearchProduct[]) {
  return Array.from(new Set(products.map((product) => product.brand)));
}

function SearchSuggestionOverlay({
  items,
  activeIndex,
  onSelect,
  onHoverIndex,
}: {
  items: SearchSuggestion[];
  activeIndex: number;
  onSelect: (item: SearchSuggestion) => void;
  onHoverIndex: (index: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-[1.35rem] border border-border/70 bg-white/96 p-4 text-sm font-medium text-muted shadow-[var(--shadow-lg)]">
        No suggestions matched your search.
      </div>
    );
  }

  return (
    <motion.div
      className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/96 shadow-[var(--shadow-lg)] backdrop-blur"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      role="listbox"
      aria-label="Search suggestions"
    >
      <div className="grid gap-0 divide-y divide-border/70">
        {items.map((item, index) => {
          const selected = index === activeIndex;
          const icon =
            item.kind === "product" ? (
              <PackageSearch className="h-4 w-4 text-accent" aria-hidden="true" />
            ) : item.kind === "brand" ? (
              <Sparkles className="h-4 w-4 text-sky-500" aria-hidden="true" />
            ) : item.kind === "category" ? (
              <Grid3X3 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            ) : (
              <History className="h-4 w-4 text-muted" aria-hidden="true" />
            );

          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                selected ? "bg-accent/8" : "hover:bg-background-secondary/70",
              )}
              onMouseEnter={() => onHoverIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background-secondary text-muted">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold text-text">{item.label}</p>
                  <Badge variant="neutral" className="shrink-0 text-[10px] uppercase tracking-[0.18em]">
                    {item.meta}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-xs font-medium text-muted">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function SearchHeader({
  inputRef,
  inputValue,
  setInputValue,
  onSubmit,
  onFocus,
  onKeyDown,
  onClear,
  onBlurClose,
  suggestionsOpen,
  activeIndex,
  suggestions,
  onSelectSuggestion,
  onHoverSuggestion,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onBlurClose: () => void;
  suggestionsOpen: boolean;
  activeIndex: number;
  suggestions: SearchSuggestion[];
  onSelectSuggestion: (item: SearchSuggestion) => void;
  onHoverSuggestion: (index: number) => void;
}) {
  const hasText = inputValue.trim().length > 0;

  return (
    <Card className="overflow-visible rounded-[1.75rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)] sm:p-5">
      <form
        role="search"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-2">
          <p className="eyebrow-font text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Search catalog
          </p>
          <label htmlFor="search-page-input" className="sr-only">
            Search products, brands, and categories
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              id="search-page-input"
              type="search"
              value={inputValue}
              autoComplete="off"
              placeholder="Search paints, plumbing, brands, categories..."
              aria-label="Search products, brands, and categories"
              aria-expanded={suggestionsOpen}
              aria-controls="search-suggestions"
              aria-activedescendant={activeIndex >= 0 ? suggestions[activeIndex]?.id : undefined}
              className={cn(
                "h-14 rounded-full border-border/80 bg-white/95 pl-11 pr-24 text-[15px] shadow-[var(--shadow-sm)]",
                "placeholder:text-muted/80 focus-visible:border-accent/25 focus-visible:bg-white",
              )}
              onChange={(event) => {
                setInputValue(event.target.value);
                onFocus();
              }}
              onFocus={onFocus}
              onBlur={(event) => {
                const nextFocus = event.relatedTarget;
                const overlay = document.getElementById("search-suggestions");

                if (nextFocus instanceof Node && overlay?.contains(nextFocus)) {
                  return;
                }

                onBlurClose();
              }}
              onKeyDown={onKeyDown}
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-2">
              {hasText && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={onClear}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-white text-muted transition-all hover:-translate-y-0.5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="h-9 rounded-full px-4 shadow-[0_14px_24px_-18px_rgba(16,33,58,0.6)]"
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </form>

      {suggestionsOpen && (
        <div id="search-suggestions" className="relative">
          <SearchSuggestionOverlay
            items={suggestions}
            activeIndex={activeIndex}
            onSelect={onSelectSuggestion}
            onHoverIndex={onHoverSuggestion}
          />
        </div>
      )}
    </Card>
  );
}

function LandingSearchChips({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof Clock3;
  items: string[];
}) {
  return (
    <Card className="h-full rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">{title}</h3>
          <p className="text-xs font-medium text-muted">Tap a chip to search instantly.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <Button
            key={item}
            asChild
            variant="outline"
            size="sm"
            className="rounded-full border-border/70 bg-white/80"
          >
            <Link href={buildSearchHref(item)}>{item}</Link>
          </Button>
        ))}
      </div>
    </Card>
  );
}

function BrandCard({ brand }: { brand: SearchBrand }) {
  return (
    <Link
      href={brand.href}
      className="group block overflow-hidden rounded-[1.5rem] border border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-1 hover:border-accent/20 hover:shadow-[var(--shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative border-b border-border/70 bg-gradient-to-br from-white via-white to-background-secondary p-4">
        <BrandLogo name={brand.name} className="h-20 rounded-[1rem]" />
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-text">{brand.name}</h3>
          <Badge variant={brand.category === "Paint" ? "accent" : "neutral"} className="shrink-0">
            {brand.category}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm font-medium text-muted">{brand.tagline}</p>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Explore
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function CategoryCard({ category }: { category: SearchCategory }) {
  const tone = getCategoryTone(category.scene);

  return (
    <Link
      href={category.href}
      className="group block overflow-hidden rounded-[1.5rem] border border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-1 hover:border-accent/20 hover:shadow-[var(--shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative border-b border-border/70 bg-gradient-to-br from-white via-white to-background-secondary p-4">
        <div className="overflow-hidden rounded-[1.1rem] border border-white/85 bg-white/88 p-2">
          <CategoryIllustration label={category.name} scene={category.scene} tone={tone} />
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        <h3 className="text-sm font-bold text-text">{category.name}</h3>
        <p className="line-clamp-2 text-sm font-medium text-muted">{category.description}</p>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Browse
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function SearchFilters({
  activeTab,
  brands,
  categories,
  counts,
  selectedBrands,
  setSelectedBrands,
  selectedCategory,
  setSelectedCategory,
  availability,
  setAvailability,
  discountOnly,
  setDiscountOnly,
  sortMode,
  setSortMode,
  priceCap,
  setPriceCap,
  minPrice,
  maxPrice,
  onClear,
}: {
  activeTab: SearchTab;
  brands: string[];
  categories: string[];
  counts: Record<SearchTab, number>;
  selectedBrands: string[];
  setSelectedBrands: (value: string[]) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  availability: AvailabilityFilter;
  setAvailability: (value: AvailabilityFilter) => void;
  discountOnly: boolean;
  setDiscountOnly: (value: boolean) => void;
  sortMode: ProductSortMode | CatalogSortMode;
  setSortMode: (value: ProductSortMode | CatalogSortMode) => void;
  priceCap: number;
  setPriceCap: (value: number) => void;
  minPrice: number;
  maxPrice: number;
  onClear: () => void;
}) {
  const toggleBrand = (brand: string) => {
    setSelectedBrands(
      selectedBrands.includes(brand)
        ? selectedBrands.filter((item) => item !== brand)
        : [...selectedBrands, brand],
    );
  };

  if (activeTab !== "products") {
    return (
      <div className="space-y-4">
        <Card className="rounded-[1.5rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-bold text-text">Search scope</h3>
          </div>
          <div className="grid gap-2">
            {SEARCH_TABS.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[1rem] border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                  tab.id === activeTab
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                )}
              >
                <span>{tab.label}</span>
                <Badge variant={tab.id === activeTab ? "accent" : "neutral"} className="px-2 py-0 text-[10px]">
                  {counts[tab.id]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-bold text-text">Recent searches</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {RECENT_SEARCHES.map((item) => (
              <Button key={item} asChild variant="outline" size="sm" className="rounded-full">
                <Link href={buildSearchHref(item)}>{item}</Link>
              </Button>
            ))}
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-bold text-text">Popular searches</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((item) => (
              <Button key={item} asChild variant="outline" size="sm" className="rounded-full">
                <Link href={buildSearchHref(item)}>{item}</Link>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.5rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-bold text-text">Filters</h3>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-accent transition-colors hover:text-accent/80"
          >
            Clear all
          </button>
        </div>

        <div className="space-y-4">
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Brand</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                  selectedBrands.length === 0
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                )}
              >
                All
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
                      active
                        ? "border-accent/20 bg-accent/10 text-accent"
                        : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                    )}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Category</h4>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "rounded-[1rem] border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                  selectedCategory === "all"
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                )}
              >
                All categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "rounded-[1rem] border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                    selectedCategory === category
                      ? "border-accent/20 bg-accent/10 text-accent"
                      : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Price cap
              </h4>
              <span className="text-xs font-semibold text-text">{formatPrice(priceCap)}</span>
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceCap}
              onChange={(event) => setPriceCap(Number(event.target.value))}
              aria-label="Maximum price"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-background-secondary accent-[color:var(--color-accent)]"
            />
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>{formatPrice(minPrice)}</span>
              <span>{formatPrice(maxPrice)}</span>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Availability
            </h4>
            <div className="grid gap-2">
              {([
                { value: "all", label: "All items" },
                { value: "in-stock", label: "In stock" },
                { value: "out-of-stock", label: "Out of stock" },
              ] as const).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAvailability(item.value)}
                  className={cn(
                    "rounded-[1rem] border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                    availability === item.value
                      ? "border-accent/20 bg-accent/10 text-accent"
                      : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Sorting
            </h4>
            <div className="grid gap-2">
              {(activeTab === "products"
                ? PRODUCT_SORT_OPTIONS
                : CATALOG_SORT_OPTIONS
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                  className={cn(
                    "rounded-[1rem] border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                    sortMode === option.value
                      ? "border-accent/20 bg-accent/10 text-accent"
                      : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-border/70 bg-background-secondary/60 px-3 py-3">
            <div>
              <p className="text-sm font-bold text-text">Discounts only</p>
              <p className="text-xs font-medium text-muted">Show sale items first.</p>
            </div>
            <button
              type="button"
              aria-pressed={discountOnly}
              onClick={() => setDiscountOnly(!discountOnly)}
              className={cn(
                "relative h-7 w-12 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                discountOnly ? "border-accent/20 bg-accent/10" : "border-border/70 bg-white",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform",
                  discountOnly ? "translate-x-6 bg-accent" : "translate-x-1",
                )}
              />
            </button>
          </section>
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-bold text-text">Recent searches</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {RECENT_SEARCHES.map((item) => (
            <Button key={item} asChild variant="outline" size="sm" className="rounded-full">
              <Link href={buildSearchHref(item)}>{item}</Link>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SearchResultsToolbar({
  activeTab,
  setActiveTab,
  counts,
  resultsCount,
  sortMode,
  setSortMode,
  viewMode,
  setViewMode,
  hasQuery,
  mobileFiltersOpen,
  setMobileFiltersOpen,
}: {
  activeTab: SearchTab;
  setActiveTab: (value: SearchTab) => void;
  counts: Record<SearchTab, number>;
  resultsCount: number;
  sortMode: ProductSortMode | CatalogSortMode;
  setSortMode: (value: ProductSortMode | CatalogSortMode) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  hasQuery: boolean;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (value: boolean) => void;
}) {
  return (
    <Card className="rounded-[1.5rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {SEARCH_TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`search-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                    active
                      ? "border-accent/20 bg-accent/10 text-accent shadow-[0_10px_20px_-16px_rgba(249,115,22,0.45)]"
                      : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {tab.label}
                  <Badge variant={active ? "accent" : "neutral"} className="px-2 py-0 text-[10px]">
                    {counts[tab.id]}
                  </Badge>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
            <span>{hasQuery ? "Live search results" : "Browse the catalog"}</span>
            <span aria-hidden="true">•</span>
            <span>{resultsCount} items</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-border/70 bg-white/85 px-3 py-2 text-sm font-semibold text-text">
            <span className="text-muted">Sort</span>
            <select
              aria-label="Sort search results"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as ProductSortMode | CatalogSortMode)}
              className="bg-transparent text-sm font-semibold text-text outline-none"
            >
              {(activeTab === "products" ? PRODUCT_SORT_OPTIONS : CATALOG_SORT_OPTIONS).map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
            <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
          </label>

          {activeTab === "products" && (
            <div className="hidden rounded-full border border-border/70 bg-white/85 p-1 md:inline-flex">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all",
                  viewMode === "grid" ? "bg-accent/10 text-accent" : "text-text hover:bg-background-secondary",
                )}
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all",
                  viewMode === "list" ? "bg-accent/10 text-accent" : "text-text hover:bg-background-secondary",
                )}
              >
                <List className="h-4 w-4" aria-hidden="true" />
                List
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full md:hidden"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SearchExperience({ initialQuery, products, brands, categories }: SearchExperienceProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [inputValue, setInputValue] = useState(initialQuery);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>("products");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<ProductSortMode | CatalogSortMode>("relevance");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [priceCap, setPriceCap] = useState(0);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const deferredQuery = useDeferredValue(inputValue);
  const query = deferredQuery.trim();
  const hasQuery = query.length > 0;

  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  const catalog = useMemo(
    () => ({
      products,
      brands,
      categories,
    }),
    [products, brands, categories],
  );
  const allResults = useMemo(() => getSearchResultsFromCatalog(query, catalog), [query, catalog]);
  const suggestionItems = useMemo(() => getSearchSuggestionItemsFromCatalog(inputValue, catalog).slice(0, 8), [inputValue, catalog]);

  const productBrands = getProductBrands(allResults.products);
  const productCategories = getProductCategories(allResults.products);

  const productPriceMin = allResults.products.length > 0 ? Math.min(...allResults.products.map((item) => item.price)) : 0;
  const productPriceMax = allResults.products.length > 0 ? Math.max(...allResults.products.map((item) => item.price)) : 0;

  useEffect(() => {
    setPriceCap(productPriceMax);
  }, [productPriceMax]);

  useEffect(() => {
    setPage(1);
  }, [query, activeTab]);

  useEffect(() => {
    setSortMode(getDefaultSortForTab(activeTab));
    setPage(1);
  }, [activeTab]);

  const handleSubmit = () => {
    const nextQuery = inputValue.trim();
    router.push(buildSearchHref(nextQuery));
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    inputRef.current?.blur();
  };

  const handleSuggestionSelect = (item: SearchSuggestion) => {
    if (item.kind === "query") {
      setInputValue(item.label);
      router.push(item.href);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    router.push(item.href);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) => {
        if (suggestionItems.length === 0) return -1;
        return (current + 1 + suggestionItems.length) % suggestionItems.length;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) => {
        if (suggestionItems.length === 0) return -1;
        return current <= 0 ? suggestionItems.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0 && suggestionsOpen) {
      event.preventDefault();
      const activeSuggestion = suggestionItems[activeSuggestionIndex];
      if (activeSuggestion) {
        handleSuggestionSelect(activeSuggestion);
      }
      return;
    }

    if (event.key !== "Tab") {
      setSuggestionsOpen(true);
    }
  };

  const clearSearch = () => {
    setInputValue("");
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    inputRef.current?.focus();
    router.push("/search");
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setSortMode(getDefaultSortForTab(tab));
    setPage(1);
  };

  const rawProducts = allResults.products;
  const filteredProducts = sortProducts(
    rawProducts.filter((product) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
        return false;
      }

      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }

      if (availability === "in-stock" && !product.inStock) {
        return false;
      }

      if (availability === "out-of-stock" && product.inStock) {
        return false;
      }

      if (discountOnly && !(product.compareAtPrice && product.compareAtPrice > product.price)) {
        return false;
      }

      if (priceCap > 0 && product.price > priceCap) {
        return false;
      }

      return true;
    }),
    sortMode as ProductSortMode,
  );

  const sortedBrands = sortBrands(allResults.brands, sortMode as CatalogSortMode);
  const sortedCategories = sortCategories(allResults.categories, sortMode as CatalogSortMode);

  const activeResults =
    activeTab === "products"
      ? filteredProducts
      : activeTab === "brands"
        ? sortedBrands
        : sortedCategories;

  const totalPages = Math.max(1, Math.ceil(activeResults.length / PAGE_SIZE[activeTab]));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE[activeTab],
    safePage * PAGE_SIZE[activeTab],
  );
  const paginatedBrands = sortedBrands.slice(
    (safePage - 1) * PAGE_SIZE[activeTab],
    safePage * PAGE_SIZE[activeTab],
  );
  const paginatedCategories = sortedCategories.slice(
    (safePage - 1) * PAGE_SIZE[activeTab],
    safePage * PAGE_SIZE[activeTab],
  );

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategory("all");
    setAvailability("all");
    setDiscountOnly(false);
    setSortMode("relevance");
    setViewMode("grid");
    setPriceCap(productPriceMax);
    setPage(1);
  };

  const counts = {
    products: rawProducts.length,
    brands: sortedBrands.length,
    categories: sortedCategories.length,
  };

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={SECTION_VARIANTS}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <motion.nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted"
          variants={ITEM_VARIANTS}
        >
          <Link href="/" className="transition-colors hover:text-text">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">Search</span>
          {hasQuery && (
            <>
              <span aria-hidden="true">/</span>
              <span className="max-w-[12rem] truncate text-text">{query}</span>
            </>
          )}
        </motion.nav>

        <motion.header className="mb-6 space-y-4" variants={ITEM_VARIANTS}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" className="eyebrow-font">
              Search
            </Badge>
            <Badge variant="neutral" className="eyebrow-font">
              {counts.products} products
            </Badge>
            <Badge variant="neutral" className="eyebrow-font">
              {counts.brands} brands
            </Badge>
            <Badge variant="neutral" className="eyebrow-font">
              {counts.categories} categories
            </Badge>
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Search everything in one premium catalog.
            </h1>
            <p className="max-w-2xl text-base font-medium leading-7 text-muted sm:text-lg">
              Search across products, brands, and categories. Use recent searches, arrow-key
              suggestions, and refined filters to find the right paint or plumbing essential
              faster.
            </p>
          </div>
        </motion.header>

        <motion.div className="relative mb-8" variants={ITEM_VARIANTS}>
          <SearchHeader
            inputRef={inputRef}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSubmit={handleSubmit}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={handleKeyDown}
            onClear={clearSearch}
            onBlurClose={() => {
              setSuggestionsOpen(false);
              setActiveSuggestionIndex(-1);
            }}
            suggestionsOpen={suggestionsOpen}
            activeIndex={activeSuggestionIndex}
            suggestions={suggestionItems}
            onSelectSuggestion={handleSuggestionSelect}
            onHoverSuggestion={setActiveSuggestionIndex}
          />
        </motion.div>

        {!hasQuery ? (
          <motion.div className="space-y-8" variants={SECTION_VARIANTS}>
            <motion.div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" variants={SECTION_VARIANTS}>
              <motion.div variants={ITEM_VARIANTS}>
                <LandingSearchChips title="Recent searches" icon={Clock3} items={RECENT_SEARCHES} />
              </motion.div>
              <motion.div variants={ITEM_VARIANTS}>
                <LandingSearchChips title="Popular searches" icon={Sparkles} items={POPULAR_SEARCHES} />
              </motion.div>
              <motion.div variants={ITEM_VARIANTS} className="md:col-span-2 xl:col-span-2">
                <Card className="h-full rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-4 flex items-center gap-2">
                    <BadgePercent className="h-4 w-4 text-accent" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-text">Search shortcuts</h3>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {suggestionItems.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSuggestionSelect(item)}
                        className="flex items-center justify-between gap-3 rounded-[1rem] border border-border/70 bg-white/80 px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white"
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </motion.div>

            <ProductShowcase
              title="Suggested products"
              subtitle="Explore a curated set of products while you search."
              products={allResults.products.slice(0, 4) as Product[]}
              viewAllHref="/products"
              badge="Search"
            />

            <motion.div className="grid gap-6 xl:grid-cols-2" variants={SECTION_VARIANTS}>
              <motion.section variants={ITEM_VARIANTS} aria-labelledby="search-brands-heading">
                <Card className="h-full rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <h2 id="search-brands-heading" className="text-lg font-bold text-text">
                        Suggested brands
                      </h2>
                      <p className="mt-1 text-sm font-medium text-muted">
                        Trusted manufacturers from our current catalog.
                      </p>
                    </div>
                    <Badge variant="neutral">{allResults.brands.length} brands</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {allResults.brands.slice(0, 6).map((brand) => (
                      <BrandCard key={brand.slug} brand={brand} />
                    ))}
                  </div>
                </Card>
              </motion.section>

              <motion.section variants={ITEM_VARIANTS} aria-labelledby="search-categories-heading">
                <Card className="h-full rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <h2 id="search-categories-heading" className="text-lg font-bold text-text">
                        Suggested categories
                      </h2>
                      <p className="mt-1 text-sm font-medium text-muted">
                        Browse the strongest product collections on the platform.
                      </p>
                    </div>
                    <Badge variant="neutral">{allResults.categories.length} categories</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {allResults.categories.slice(0, 4).map((category) => (
                      <CategoryCard key={category.slug} category={category} />
                    ))}
                  </div>
                </Card>
              </motion.section>
            </motion.div>
          </motion.div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <SearchFilters
                  activeTab={activeTab}
                  brands={productBrands}
                  categories={productCategories}
                  counts={counts}
                  selectedBrands={selectedBrands}
                  setSelectedBrands={(value) => {
                    setSelectedBrands(value);
                    setPage(1);
                  }}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={(value) => {
                    setSelectedCategory(value);
                    setPage(1);
                  }}
                  availability={availability}
                  setAvailability={(value) => {
                    setAvailability(value);
                    setPage(1);
                  }}
                  discountOnly={discountOnly}
                  setDiscountOnly={(value) => {
                    setDiscountOnly(value);
                    setPage(1);
                  }}
                  sortMode={sortMode}
                  setSortMode={(value) => {
                    setSortMode(value);
                    setPage(1);
                  }}
                  priceCap={priceCap}
                  setPriceCap={(value) => {
                    setPriceCap(value);
                    setPage(1);
                  }}
                  minPrice={productPriceMin}
                  maxPrice={productPriceMax}
                  onClear={clearFilters}
                />
              </div>
            </aside>

            <div className="space-y-4">
              <details className="hidden rounded-[1.5rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)] md:block lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text">
                  <span className="inline-flex items-center gap-2">
                    <Filter className="h-4 w-4 text-accent" aria-hidden="true" />
                    Refine results
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Collapsible
                  </span>
                </summary>
                <div className="mt-4">
                <SearchFilters
                  activeTab={activeTab}
                  brands={productBrands}
                  categories={productCategories}
                  counts={counts}
                  selectedBrands={selectedBrands}
                    setSelectedBrands={(value) => {
                      setSelectedBrands(value);
                      setPage(1);
                    }}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={(value) => {
                      setSelectedCategory(value);
                      setPage(1);
                    }}
                    availability={availability}
                    setAvailability={(value) => {
                      setAvailability(value);
                      setPage(1);
                    }}
                    discountOnly={discountOnly}
                    setDiscountOnly={(value) => {
                      setDiscountOnly(value);
                      setPage(1);
                    }}
                    sortMode={sortMode}
                    setSortMode={(value) => {
                      setSortMode(value);
                      setPage(1);
                    }}
                    priceCap={priceCap}
                    setPriceCap={(value) => {
                      setPriceCap(value);
                      setPage(1);
                    }}
                    minPrice={productPriceMin}
                    maxPrice={productPriceMax}
                    onClear={clearFilters}
                  />
                </div>
              </details>

              <div className="md:hidden">
                <div className="flex items-center justify-between rounded-[1.35rem] border border-white/80 bg-white/92 px-4 py-3 shadow-[var(--shadow-sm)]">
                  <p className="text-sm font-semibold text-text">Need filters?</p>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                  >
                    Open
                  </Button>
                </div>
              </div>

              <SearchResultsToolbar
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                counts={counts}
                resultsCount={activeResults.length}
                sortMode={sortMode}
                setSortMode={(value) => {
                  setSortMode(value);
                  setPage(1);
                }}
                viewMode={viewMode}
                setViewMode={setViewMode}
                hasQuery={hasQuery}
                mobileFiltersOpen={mobileFiltersOpen}
                setMobileFiltersOpen={setMobileFiltersOpen}
              />

              {activeResults.length === 0 ? (
                <EmptyState
                  title="No results matched your search"
                  description="Try a different search term, clear one of the filters, or browse a broader category."
                  actionLabel="Clear filters"
                  onAction={clearFilters}
                  secondaryActionLabel="Browse products"
                  onSecondaryAction={() => router.push("/products")}
                />
              ) : (
                <>
                  {activeTab === "products" ? (
                    <motion.ul
                      className={cn(
                        "grid gap-4",
                        viewMode === "grid"
                          ? "grid-cols-1 sm:grid-cols-2"
                          : "grid-cols-1",
                      )}
                      variants={SECTION_VARIANTS}
                      initial={false}
                      animate="visible"
                      layout
                      role="tabpanel"
                      id="search-panel-products"
                      aria-labelledby="search-tab-products"
                    >
                      {paginatedProducts.map((product) => (
                        <motion.li key={product.id} variants={ITEM_VARIANTS} className="h-full list-none" layout>
                          <ProductCard product={product} />
                        </motion.li>
                      ))}
                    </motion.ul>
                  ) : activeTab === "brands" ? (
                    <motion.ul
                      className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
                      variants={SECTION_VARIANTS}
                      initial={false}
                      animate="visible"
                      layout
                      role="tabpanel"
                      id="search-panel-brands"
                      aria-labelledby="search-tab-brands"
                    >
                      {paginatedBrands.map((brand) => (
                        <motion.li key={brand.slug} variants={ITEM_VARIANTS} className="list-none" layout>
                          <BrandCard brand={brand} />
                        </motion.li>
                      ))}
                    </motion.ul>
                  ) : (
                    <motion.ul
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                      variants={SECTION_VARIANTS}
                      initial={false}
                      animate="visible"
                      layout
                      role="tabpanel"
                      id="search-panel-categories"
                      aria-labelledby="search-tab-categories"
                    >
                      {paginatedCategories.map((category) => (
                        <motion.li key={category.slug} variants={ITEM_VARIANTS} className="list-none" layout>
                          <CategoryCard category={category} />
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}

                  {totalPages > 1 && (
                    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-white/92 px-4 py-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
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
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        title="Filters"
        description="Refine search results on mobile."
        className="bottom-0 left-auto right-0 top-auto h-[88vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[1.5rem] border-t border-border p-4 md:hidden"
      >
        <div className="h-full overflow-y-auto pr-1">
          <SearchFilters
            activeTab={activeTab}
            brands={productBrands}
            categories={productCategories}
            counts={counts}
            selectedBrands={selectedBrands}
            setSelectedBrands={(value) => {
              setSelectedBrands(value);
              setPage(1);
            }}
            selectedCategory={selectedCategory}
            setSelectedCategory={(value) => {
              setSelectedCategory(value);
              setPage(1);
            }}
            availability={availability}
            setAvailability={(value) => {
              setAvailability(value);
              setPage(1);
            }}
            discountOnly={discountOnly}
            setDiscountOnly={(value) => {
              setDiscountOnly(value);
              setPage(1);
            }}
            sortMode={sortMode}
            setSortMode={(value) => {
              setSortMode(value);
              setPage(1);
            }}
            priceCap={priceCap}
            setPriceCap={(value) => {
              setPriceCap(value);
              setPage(1);
            }}
            minPrice={productPriceMin}
            maxPrice={productPriceMax}
            onClear={() => {
              clearFilters();
              setMobileFiltersOpen(false);
            }}
          />
        </div>
      </Modal>
    </motion.section>
  );
}

export { SearchExperience };
