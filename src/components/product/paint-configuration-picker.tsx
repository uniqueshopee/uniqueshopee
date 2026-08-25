"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ShadeOption = {
  id: string;
  shade_code: string;
  shade_name: string;
  color_family: string;
  color_sub_family: string | null;
  hex_color: string | null;
  rgb: string | null;
  is_popular: boolean | null;
  is_featured: boolean | null;
};

type Props = {
  productId: string;
  brandId?: string;
  shades: Array<{
    id: string;
    name: string;
    code: string;
    colorFamily: string;
    colorSubFamily: string | null;
    hexColor: string | null;
    isPopular: boolean;
    isFeatured: boolean;
  }>;
  variants: Array<{
    id: string;
    shadeId?: string | null;
    packSize?: string | null;
    unit?: string | null;
    finish?: string | null;
  }>;
  selectedShadeId: string;
  selectedFinish: string;
  selectedPackSize: string;
  onFinishChange: (finish: string) => void;
  onShadeChange: (shadeId: string, shade?: ShadeOption) => void;
  onPackSizeChange: (packSize: string) => void;
};

type PickerStage = "colour" | "shade";

type FamilyOption = {
  name: string;
  count: number;
  swatch: string | null;
};

const FAMILY_STYLES: Record<string, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#eab308",
  green: "#16a34a",
  cyan: "#0891b2",
  blue: "#2563eb",
  purple: "#9333ea",
  pink: "#db2777",
  brown: "#92400e",
  beige: "#d6b98c",
  white: "#f8fafc",
  grey: "#64748b",
  gray: "#64748b",
  black: "#111827",
  "earth tones": "#9a6b3f",
};

function familyColour(name: string, fallback?: string | null) {
  return fallback || FAMILY_STYLES[name.trim().toLowerCase()] || "#94a3b8";
}

function formatFamilyName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paintCustomerDebug(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") console.debug("[PaintCustomer]", ...args);
}

export function PaintConfigurationPicker({
  productId,
  shades,
  variants,
  selectedShadeId,
  selectedFinish,
  selectedPackSize,
  onFinishChange,
  onShadeChange,
  onPackSizeChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<PickerStage>("colour");
  const [family, setFamily] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<ShadeOption[]>([]);
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const familyCache = useRef(new Map<string, FamilyOption[]>());
  const onShadeChangeRef = useRef(onShadeChange);
  const previousConfigurationRef = useRef(`${productId}:${selectedFinish}`);
  onShadeChangeRef.current = onShadeChange;
  const finishes = useMemo(() => {
    const byNormalizedFinish = new Map<string, string>();
    for (const variant of variants) {
      const value = variant.finish?.trim();
      if (value && !byNormalizedFinish.has(value.toLowerCase()))
        byNormalizedFinish.set(value.toLowerCase(), value);
    }
    return [...byNormalizedFinish.values()];
  }, [variants]);
  const validVariants = useMemo(
    () =>
      variants.filter(
        (variant) =>
          (!selectedShadeId || !variant.shadeId || variant.shadeId === selectedShadeId) &&
          (!selectedFinish ||
            variant.finish?.trim().toLowerCase() === selectedFinish.trim().toLowerCase()),
      ),
    [selectedFinish, selectedShadeId, variants],
  );
  const packSizes = useMemo(
    () =>
      [
        ...new Set(validVariants.map((variant) => variant.packSize).filter(Boolean)),
      ] as string[],
    [validVariants],
  );

  useEffect(() => {
    const configurationKey = `${productId}:${selectedFinish}`;
    if (previousConfigurationRef.current === configurationKey) return;
    previousConfigurationRef.current = configurationKey;
    setFamily("");
    setStage("colour");
    setSearch("");
    setFilter("");
    setItems([]);
    setTotal(0);
    setPage(1);
    setHasMore(false);
    setError("");
    setLoading(false);
    setFamilies([]);
    if (selectedShadeId) onShadeChangeRef.current("");
  }, [productId, selectedFinish, selectedShadeId]);

  useEffect(() => {
    if (!open || !productId || !selectedFinish) {
      setCompatibilityLoading(false);
      if (!productId || !selectedFinish) setFamilies([]);
      return;
    }
    const cacheKey = `${productId}:${selectedFinish.trim().toLowerCase()}`;
    const cached = familyCache.current.get(cacheKey);
    if (cached) {
      setCompatibilityLoading(false);
      setFamilies(cached);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setCompatibilityLoading(true);
    const query = new URLSearchParams({ productId, finish: selectedFinish });
    const requestUrl = `/api/paint/shades/families?${query.toString()}`;
    paintCustomerDebug("family request", requestUrl);
    void fetch(requestUrl, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load compatible colours right now.");
        return response.json() as Promise<FamilyOption[]>;
      })
      .then((result) => {
        if (!active) return;
        familyCache.current.set(cacheKey, result);
        setFamilies(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof DOMException && requestError.name === "AbortError")
          return;
        if (process.env.NODE_ENV !== "production")
          console.debug("[PaintCustomer] shade loading failed", {
            productId,
            finish: selectedFinish,
            error: requestError,
          });
        setFamilies([]);
      })
      .finally(() => {
        if (active) setCompatibilityLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, productId, selectedFinish]);

  useEffect(() => {
    if (!open || stage !== "shade" || !family) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const requestedPage = page;
      const query = new URLSearchParams({
        productId,
        colourFamily: family,
        page: String(requestedPage),
      });
      if (selectedFinish) query.set("finish", selectedFinish);
      if (search.trim()) query.set("search", search.trim());
      if (filter === "light" || filter === "deep")
        query.set("depth", filter === "deep" ? "dark" : "light");
      if (filter === "rich") query.set("depth", "medium");
      if (filter === "soft") query.set("tone", "neutral");
      const requestUrl = `/api/paint/shades?${query.toString()}`;
      paintCustomerDebug("shade request", requestUrl);
      void fetch(requestUrl, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to load shades right now.");
          return response.json() as Promise<{
            items: ShadeOption[];
            total: number;
            hasMore: boolean;
          }>;
        })
        .then((result) => {
          if (!active) return;
          const uniqueItems = result.items.filter(
            (item, index, allItems) =>
              allItems.findIndex((candidate) => candidate.id === item.id) === index,
          );
          setItems((current) =>
            requestedPage === 1
              ? uniqueItems
              : [
                  ...current,
                  ...uniqueItems.filter(
                    (item) => !current.some((existing) => existing.id === item.id),
                  ),
                ],
          );
          setTotal(result.total);
          setHasMore(result.hasMore);
        })
        .catch((requestError: unknown) => {
          if (!active) return;
          if (requestError instanceof DOMException && requestError.name === "AbortError")
            return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load shades right now.",
          );
          setItems([]);
          setTotal(0);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [family, filter, open, page, productId, search, selectedFinish, stage]);

  useEffect(() => {
    if (open && stage === "shade") {
      setPage(1);
      setItems([]);
      setHasMore(false);
    }
  }, [family, filter, open, search, selectedFinish, stage]);

  const loadMoreShades = () => {
    if (!loading && hasMore) setPage((current) => current + 1);
  };

  const openColours = () => {
    setStage("colour");
    setOpen(true);
  };

  const chooseFamily = (value: string) => {
    setFamily(value);
    setSearch("");
    setFilter("");
    setStage("shade");
  };

  const chooseShade = (shade: ShadeOption) => {
    onShadeChange(shade.id, shade);
    setOpen(false);
  };

  const selectedShade = shades.find((shade) => shade.id === selectedShadeId);
  const selectedCatalogueShade = items.find((shade) => shade.id === selectedShadeId);
  const selectedShadeView =
    selectedShade ??
    (selectedCatalogueShade
      ? {
          id: selectedCatalogueShade.id,
          name: selectedCatalogueShade.shade_name,
          code: selectedCatalogueShade.shade_code,
          colorFamily: selectedCatalogueShade.color_family,
          colorSubFamily: selectedCatalogueShade.color_sub_family,
          hexColor: selectedCatalogueShade.hex_color,
          isPopular: Boolean(selectedCatalogueShade.is_popular),
          isFeatured: Boolean(selectedCatalogueShade.is_featured),
        }
      : null);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-text text-sm font-bold">Finish</p>
            <p className="text-muted text-xs font-medium">
              Choose the finish for this paint.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {finishes.map((finish) => (
            <button
              key={finish}
              type="button"
              onClick={() => onFinishChange(finish)}
              aria-pressed={selectedFinish === finish}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                selectedFinish === finish
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border/80 text-text hover:border-accent/30 bg-white",
              )}
            >
              {finish}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-text text-sm font-bold">Colour</p>
        <button
          type="button"
          onClick={openColours}
          disabled={!productId || !selectedFinish}
          className="border-border/70 hover:border-accent/30 focus-visible:ring-accent flex min-h-14 w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span
            className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-[var(--shadow-sm)]"
            style={{
              backgroundColor: selectedShadeView
                ? familyColour(selectedShadeView.colorFamily, selectedShadeView.hexColor)
                : "#e2e8f0",
            }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="text-text block text-sm font-semibold">
              {selectedShadeView ? selectedShadeView.colorFamily : "Choose Colour"}
            </span>
            <span className="text-muted block text-xs font-medium">
              {selectedShadeView
                ? `${selectedShadeView.name} · ${selectedShadeView.hexColor || "Colour unavailable"}`
                : "Browse colour families"}
            </span>
          </span>
          <span className="text-accent text-lg" aria-hidden="true">
            🎨
          </span>
        </button>
        {!compatibilityLoading && families.length === 0 && open ? (
          <p className="border-warning/40 bg-warning/5 text-muted rounded-xl border border-dashed px-3 py-2 text-sm font-medium">
            No shades available for {selectedFinish || "this finish"}.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-text text-sm font-bold">Shade</p>
        {selectedShadeView ? (
          <button
            type="button"
            onClick={openColours}
            className="border-accent/30 bg-accent/5 focus-visible:ring-accent flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:outline-none"
          >
            <span
              className="h-10 w-10 shrink-0 rounded-full border-2 border-white shadow-[var(--shadow-sm)]"
              style={{ backgroundColor: selectedShadeView.hexColor || "#cbd5e1" }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="text-text block text-sm font-bold">
                {selectedShadeView.name}
              </span>
              <span className="text-muted block text-xs font-semibold">
                {selectedShadeView.colorFamily} ·{" "}
                {selectedShadeView.hexColor || "Colour unavailable"}
              </span>
            </span>
            <span className="text-accent inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Change
            </span>
          </button>
        ) : (
          <p className="border-border text-muted rounded-xl border border-dashed px-3 py-2.5 text-sm font-medium">
            Choose a colour to browse shades.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-text text-sm font-bold">Pack Size</p>
        <div className="flex flex-wrap gap-2">
          {packSizes.map((size) => {
            const unit = validVariants.find((variant) => variant.packSize === size)?.unit;
            return (
              <button
                key={`${size}-${unit ?? ""}`}
                type="button"
                onClick={() => onPackSizeChange(size)}
                aria-pressed={selectedPackSize === size}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold",
                  selectedPackSize === size
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border/80 text-text hover:border-accent/30 bg-white",
                )}
              >
                {size}
                {unit ? ` ${unit}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={
          stage === "colour" ? "Choose a colour" : `${formatFamilyName(family)} shades`
        }
        description={
          stage === "colour"
            ? "Start with a familiar colour family."
            : "Search by shade name or manufacturer code."
        }
        className="max-h-[90vh] max-w-3xl rounded-t-[1.5rem] p-4 sm:rounded-[var(--radius-xl)] sm:p-5"
      >
        {stage === "colour" ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
            role={compatibilityLoading ? "status" : undefined}
            aria-live={compatibilityLoading ? "polite" : undefined}
          >
            {compatibilityLoading
              ? [
                  <span
                    key="loading"
                    className="text-muted col-span-full text-sm font-medium"
                  >
                    Loading colours...
                  </span>,
                  ...Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="min-h-28 rounded-xl" />
                  )),
                ]
              : families.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    onClick={() => chooseFamily(group.name)}
                    aria-label={`Select ${group.name} colour family`}
                    className="group focus-visible:ring-accent border-border/70 hover:border-accent/30 flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3 text-center transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span
                      className="h-12 w-12 rounded-full border-2 border-white shadow-[var(--shadow-sm)]"
                      style={{ backgroundColor: familyColour(group.name, group.swatch) }}
                      aria-hidden="true"
                    />
                    <span className="text-text text-sm font-bold">{group.name}</span>
                    <span className="text-muted text-xs font-medium">
                      {group.count} {group.count === 1 ? "shade" : "shades"}
                    </span>
                  </button>
                ))}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStage("colour")}
              className="text-accent inline-flex items-center gap-1 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to colours
            </button>
            <div className="bg-background sticky top-0 z-10 pb-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-text text-sm font-bold">
                  {formatFamilyName(family)}
                </span>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadMoreShades}
                    className="text-accent focus-visible:ring-accent text-xs font-bold tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Load more shades <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <span className="text-muted text-xs font-semibold">{total} shades</span>
                )}
              </div>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shade name or code"
                aria-label="Search shade name or code"
                leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
              <span className="text-muted shrink-0 text-xs font-semibold">
                {total} shades
              </span>
              {["all", "light", "soft", "rich", "deep"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter((current) =>
                      value === "all" ? "" : current === value ? "" : value,
                    )
                  }
                  aria-pressed={value === "all" ? filter === "" : filter === value}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize",
                    (value === "all" ? filter === "" : filter === value)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border/70 text-text bg-white",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            {error ? (
              <div className="border-danger/20 bg-danger/5 text-danger rounded-xl border p-4 text-sm font-medium">
                <p>{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setSearch((value) => `${value} `)}
                >
                  Try again
                </Button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="border-border text-muted rounded-xl border border-dashed p-6 text-center text-sm font-medium">
                No matching shades found. Try another shade name or code.
              </div>
            ) : (
              <>
                {selectedCatalogueShade ? (
                  <div className="border-accent/25 bg-accent/5 mb-2 flex items-center gap-2 rounded-lg border px-2.5 py-2">
                    <span
                      className="relative h-8 w-8 shrink-0 rounded-md"
                      style={{
                        backgroundColor: selectedCatalogueShade.hex_color || "#cbd5e1",
                      }}
                      aria-hidden="true"
                    >
                      <span className="absolute inset-1 rounded-full border border-white/90" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-text block truncate text-xs font-bold">
                        {selectedCatalogueShade.shade_name}
                      </span>
                      <span className="text-muted block truncate text-[11px]">
                        {formatFamilyName(family)} ·{" "}
                        {selectedCatalogueShade.hex_color || "Colour unavailable"}
                      </span>
                    </span>
                    <Check className="text-accent h-4 w-4 shrink-0" aria-hidden="true" />
                  </div>
                ) : null}
                <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-8">
                  {items.map((shade) => (
                    <button
                      key={shade.id}
                      type="button"
                      onClick={() => chooseShade(shade)}
                      aria-label={`Select ${shade.shade_name}, shade ${shade.shade_code}`}
                      aria-pressed={selectedShadeId === shade.id}
                      className={cn(
                        "focus-visible:ring-accent group relative aspect-square overflow-hidden rounded-md border bg-white p-1 transition focus-visible:ring-2 focus-visible:outline-none",
                        selectedShadeId === shade.id
                          ? "border-accent ring-accent ring-2"
                          : "border-border/70 hover:border-accent",
                      )}
                    >
                      <span
                        className="absolute inset-0 rounded-[inherit]"
                        style={{ backgroundColor: shade.hex_color || "#cbd5e1" }}
                        aria-hidden="true"
                      >
                        <span className="absolute inset-[18%] rounded-full border border-white/90" />
                      </span>
                      <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/35 px-1 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        {shade.shade_name}
                      </span>
                      {selectedShadeId === shade.id ? (
                        <span className="bg-accent absolute top-1 right-1 rounded-full p-0.5 text-white">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {hasMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={loadMoreShades}
                  >
                    Load more shades →
                  </Button>
                ) : null}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
