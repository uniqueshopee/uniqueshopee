"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Filter,
  Paintbrush,
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ProductCard } from "./product-card";
import type { CatalogProduct } from "@/lib/catalog";

type DepartmentKey = "paints" | "plumbing";
type ProductDensity = "comfortable" | "dense";

type Department = {
  key: DepartmentKey;
  label: string;
  icon: typeof Paintbrush;
};

type ProductListingPageProps = {
  products: CatalogProduct[];
  initialDepartment?: DepartmentKey;
  initialQuery?: string;
  initialCategory?: string;
};

const DEPARTMENTS: Department[] = [
  { key: "paints", label: "Paints", icon: Paintbrush },
  { key: "plumbing", label: "Plumbing", icon: Wrench },
];

const PAINT_FILTERS = {
  rooms: [] as string[],
};

const PLUMBING_FILTERS = {
  rooms: [] as string[],
};

const ANIM_CONTAINER = {
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

const ANIM_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

function FilterChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] border px-[18px] py-3 text-[15px] font-medium transition-all duration-200",
        active
          ? "border-transparent bg-[#2563EB] text-white shadow-[0_10px_26px_-16px_rgba(37,99,235,0.75)]"
          : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]",
        className,
      )}
    >
      <span>{label}</span>
      {active && <Check className="h-4 w-4" aria-hidden="true" />}
    </motion.button>
  );
}

function DepartmentEmptyState({
  activeLabel,
  alternateLabel,
  searchQuery,
  hasFilters,
  onClearAll,
  onSwitchDepartment,
}: {
  activeLabel: string;
  alternateLabel: string;
  searchQuery: string;
  hasFilters: boolean;
  onClearAll: () => void;
  onSwitchDepartment: () => void;
}) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 text-center shadow-[var(--shadow-lg)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background-secondary">
        <Search className="h-6 w-6 text-muted" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-text">
        No {activeLabel.toLowerCase()} products matched this view
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted">
        {searchQuery
          ? `Your search for "${searchQuery}" did not return any matches.`
          : `These filters are a little too specific for the current ${activeLabel.toLowerCase()} catalog.`}
        {" "}
        Try loosening the filters or switch over to {alternateLabel.toLowerCase()}.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="accent" size="md" onClick={onClearAll}>
          Clear filters
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onSwitchDepartment}>
          Switch to {alternateLabel}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        <span className="rounded-full border border-border/70 bg-background-secondary px-3 py-1.5">
          {hasFilters ? "Filters active" : "Search only"}
        </span>
        <span className="rounded-full border border-border/70 bg-background-secondary px-3 py-1.5">
          {activeLabel}
        </span>
      </div>
    </Card>
  );
}

function getProductTags(product: CatalogProduct) {
  return {
    categories: [product.categoryName, product.departmentName].filter(Boolean) as string[],
    collections: [
      product.brandName,
      product.featured ? "Featured" : null,
      product.badge === "sale" ? "Sale" : null,
      product.isNew ? "New Arrivals" : null,
    ].filter(Boolean) as string[],
    rooms: [] as string[],
    finishes: product.filterFinishes,
  };
}

function ProductListingPage({ products, initialDepartment = "paints", initialQuery = "", initialCategory = "" }: ProductListingPageProps) {
  const shouldReduceMotion = useReducedMotion();

  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [department, setDepartment] = useState<DepartmentKey>(initialDepartment);
  const [density, setDensity] = useState<ProductDensity>("comfortable");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : [],
  );
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);

  useEffect(() => {
    setDepartment(initialDepartment);
    setQuery(initialQuery);
    setSelectedCategories(initialCategory ? [initialCategory] : []);
    setSelectedBrands([]);
    setSelectedCollections([]);
    setSelectedRooms([]);
    setSelectedFinishes([]);
    setPage(1);
  }, [initialCategory, initialDepartment, initialQuery]);

  const departmentProducts = useMemo(
    () => products.filter((product) => product.departmentSlug === department),
    [products, department],
  );

  const brands = useMemo(
    () => Array.from(new Set(departmentProducts.map((product) => product.brandName))).sort(),
    [departmentProducts],
  );

  const filterConfig = useMemo(() => {
    const categories = Array.from(new Set(departmentProducts.map((product) => product.categoryName))).sort();
    const finishes = Array.from(
      new Map(
        departmentProducts
          .flatMap((product) => product.filterFinishes)
          .map((finish) => [finish.trim().toLowerCase(), finish] as const),
      ).values(),
    ).sort();
    const collections = Array.from(
      new Set([
        ...brands,
        "Featured",
        "Sale",
        "New Arrivals",
      ]),
    );

    return {
      categories: categories.length > 0 ? categories : department === "paints" ? ["Interior Paint", "Exterior Paint"] : ["PVC Pipes", "Faucets"],
      collections,
      rooms: department === "paints" ? PAINT_FILTERS.rooms : PLUMBING_FILTERS.rooms,
      finishes,
    };
  }, [brands, department, departmentProducts]);

  const filteredProducts = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();

    return departmentProducts.filter((product) => {
      const tags = getProductTags(product);
      const matchesQuery =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        product.categoryName.toLowerCase().includes(term) ||
        product.brandName.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brandName);
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((item) => tags.categories.includes(item));
      const matchesCollection =
        selectedCollections.length === 0 ||
        selectedCollections.some((item) => tags.collections.includes(item));
      const matchesRoom =
        selectedRooms.length === 0 || selectedRooms.some((item) => tags.rooms.includes(item));
      const matchesFinish =
        selectedFinishes.length === 0 || selectedFinishes.some((item) => tags.finishes.includes(item));

      return matchesQuery && matchesBrand && matchesCategory && matchesCollection && matchesRoom && matchesFinish;
    });
  }, [
    deferredQuery,
    departmentProducts,
    selectedBrands,
    selectedCategories,
    selectedCollections,
    selectedRooms,
    selectedFinishes,
  ]);

  const activeDepartment = DEPARTMENTS.find((item) => item.key === department) ?? DEPARTMENTS[0]!;
  const oppositeDepartment = department === "paints" ? DEPARTMENTS[1]! : DEPARTMENTS[0]!;
  const activeFilterCount =
    selectedBrands.length +
    selectedCategories.length +
    selectedCollections.length +
    selectedRooms.length +
    selectedFinishes.length;

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / 8));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * 8, safePage * 8);

  const clearQuery = () => setQuery("");
  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedCollections([]);
    setSelectedRooms([]);
    setSelectedFinishes([]);
    setPage(1);
  };
  const handleDepartmentChange = (nextDepartment: DepartmentKey) => {
    if (nextDepartment === department) return;
    setDepartment(nextDepartment);
    setFilterOpen(false);
    clearFilters();
    setPage(1);
  };
  const toggleValue = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    setPage(1);
  };
  const gridClassName =
    density === "dense"
      ? "grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4"
      : "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3";

  return (
    <motion.section
      aria-labelledby="products-page-title"
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      variants={ANIM_CONTAINER}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-amber-300/8 blur-3xl" />
        <div className="absolute right-0 top-28 h-64 w-64 rounded-full bg-sky-300/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 lg:py-5">
        <motion.div
          className="flex items-center gap-2 rounded-[1.3rem] border border-border/70 bg-white/92 px-3 py-3 shadow-[var(--shadow-sm)] backdrop-blur-sm sm:gap-3 sm:px-4"
          variants={ANIM_ITEM}
        >
          <form role="search" className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="products-search" className="sr-only">
              Search products
            </label>
            <Input
              id="products-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search paints, plumbing, brands..."
              className="h-11 rounded-full border-border/80 bg-white/95 pl-10 shadow-none sm:h-12"
            />
          </form>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {(["comfortable", "dense"] as const).map((item) => {
              const isActive = density === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDensity(item)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                    isActive
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border/70 bg-white text-text hover:border-accent/20",
                  )}
                  aria-pressed={isActive}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div className="mt-4" variants={ANIM_ITEM}>
          <div className="flex items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              {DEPARTMENTS.map((item) => {
                const Icon = item.icon;
                const isActive = department === item.key;
                const count = products.filter((product) => product.departmentSlug === item.key).length;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleDepartmentChange(item.key)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex w-full items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-all",
                      isActive
                        ? "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                        : "border-border/70 bg-white/90 text-text hover:border-accent/20 hover:bg-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                    <span className={cn("ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold", isActive ? "bg-white/15 text-white" : "bg-background-secondary text-muted")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Open filters"
              onClick={() => setFilterOpen(true)}
              className="relative shrink-0"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </motion.div>

        <motion.div className="mt-4" variants={ANIM_ITEM}>
          {paginatedProducts.length === 0 ? (
            <DepartmentEmptyState
              activeLabel={activeDepartment.label}
              alternateLabel={oppositeDepartment.label}
              searchQuery={query.trim()}
              hasFilters={activeFilterCount > 0}
              onClearAll={() => {
                clearFilters();
                clearQuery();
              }}
              onSwitchDepartment={() => handleDepartmentChange(oppositeDepartment.key)}
            />
          ) : (
            <motion.ul className={gridClassName} variants={ANIM_CONTAINER} initial={false} animate="visible" layout>
              {paginatedProducts.map((product) => (
                <motion.li key={product.id} className="list-none" variants={ANIM_ITEM} layout>
                  <ProductCard product={product} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>

        {filteredProducts.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex flex-col gap-3 rounded-[1.35rem] border border-border/70 bg-white/85 px-4 py-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
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
              </Button>
            </div>
          </div>
        )}

        <Modal
          open={filterOpen}
          onOpenChange={setFilterOpen}
          title="Filters"
          description={`Refine ${activeDepartment.label.toLowerCase()} products with curated chips.`}
          className="max-w-lg max-h-[85vh] overflow-y-auto"
        >
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-bold text-[#111827]">Categories</h3>
                <button type="button" onClick={() => setSelectedCategories([])} className="text-xs font-semibold text-[#2563EB] hover:underline">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterConfig.categories.map((item) => {
                  const active = selectedCategories.includes(item);
                  return (
                    <FilterChip
                      key={item}
                      label={item}
                      active={active}
                      onClick={() => toggleValue(item, selectedCategories, setSelectedCategories)}
                    />
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-bold text-[#111827]">Browse by Brand</h3>
                <button type="button" onClick={() => setSelectedBrands([])} className="text-xs font-semibold text-[#2563EB] hover:underline">
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {brands.map((brand) => {
                  const active = selectedBrands.includes(brand);
                  return (
                    <FilterChip
                      key={brand}
                      label={brand}
                      active={active}
                      onClick={() => toggleValue(brand, selectedBrands, setSelectedBrands)}
                      className="w-full justify-center px-3 text-center"
                    />
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-bold text-[#111827]">Popular Collections</h3>
                <button type="button" onClick={() => setSelectedCollections([])} className="text-xs font-semibold text-[#2563EB] hover:underline">
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filterConfig.collections.map((item) => {
                  const active = selectedCollections.includes(item);
                  return (
                    <FilterChip
                      key={item}
                      label={item}
                      active={active}
                      onClick={() => toggleValue(item, selectedCollections, setSelectedCollections)}
                      className="w-full justify-center px-3 text-center"
                    />
                  );
                })}
              </div>
            </section>

            {filterConfig.rooms.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[18px] font-bold text-[#111827]">Shop by Room</h3>
                  <button type="button" onClick={() => setSelectedRooms([])} className="text-xs font-semibold text-[#2563EB] hover:underline">
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterConfig.rooms.map((item) => {
                    const active = selectedRooms.includes(item);
                    return (
                      <FilterChip
                        key={item}
                        label={item}
                        active={active}
                        onClick={() => toggleValue(item, selectedRooms, setSelectedRooms)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-bold text-[#111827]">Shop by Finish</h3>
                <button type="button" onClick={() => setSelectedFinishes([])} className="text-xs font-semibold text-[#2563EB] hover:underline">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterConfig.finishes.map((item) => {
                  const active = selectedFinishes.includes(item);
                  return (
                    <FilterChip
                      key={item}
                      label={item}
                      active={active}
                      onClick={() => toggleValue(item, selectedFinishes, setSelectedFinishes)}
                    />
                  );
                })}
              </div>
            </section>

            <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  clearFilters();
                  clearQuery();
                }}
              >
                Reset all
              </Button>
              <Button type="button" onClick={() => setFilterOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </motion.section>
  );
}

export { ProductListingPage };
