"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  CircleHelp,
  Download,
  Mail,
  Paintbrush,
  Printer,
  Tag,
  Share2,
  Sparkles,
  SquareStack,
  Waves,
  DoorOpen,
  LampWallDown,
  Ruler,
  ShieldCheck,
  Brush,
  PaintRoller,
  TriangleAlert,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductShowcase } from "@/components/product/product-showcase";
import { cn } from "@/lib/utils";

type Unit = "feet" | "meters";
type PaintType = "Interior Paint" | "Exterior Paint" | "Primer" | "Waterproofing" | "Wood Finish" | "Metal Paint";
type SurfaceType = "Concrete" | "Wall" | "Wood" | "Metal" | "POP" | "Putty";
type CoatCount = 1 | 2 | 3;

type MaterialRecommendation = {
  label: string;
  description: string;
  icon: typeof Brush;
  tone: "accent" | "neutral" | "success" | "warning";
};

const MATERIAL_RECOMMENDATIONS: MaterialRecommendation[] = [
  { label: "Brushes", description: "For edges, corners, and detail work", icon: Brush, tone: "accent" },
  { label: "Rollers", description: "For smooth wall coverage", icon: PaintRoller, tone: "neutral" },
  { label: "Masking Tape", description: "Protect trims and clean edges", icon: Tag, tone: "warning" },
];

const PAINT_TYPE_FACTORS: Record<PaintType, number> = {
  "Interior Paint": 115,
  "Exterior Paint": 105,
  Primer: 125,
  Waterproofing: 92,
  "Wood Finish": 135,
  "Metal Paint": 120,
};

const SURFACE_FACTORS: Record<SurfaceType, number> = {
  Concrete: 0.86,
  Wall: 1,
  Wood: 0.92,
  Metal: 0.8,
  POP: 0.76,
  Putty: 0.72,
};

const METERS_TO_FEET = 3.28084;
const SQM_TO_SQFT = 10.7639;

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
};

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPackList(requiredLitres: number) {
  const packs = [10, 4, 1];
  let remaining = Math.max(requiredLitres, 0);
  const rounded = Math.ceil(remaining * 10) / 10;
  remaining = rounded;
  const result: number[] = [];

  for (const size of packs) {
    while (remaining >= size - 0.01) {
      result.push(size);
      remaining = Number((remaining - size).toFixed(1));
    }
  }

  if (result.length === 0) {
    result.push(1);
  } else if (remaining > 0) {
    result.push(1);
  }

  return result;
}

function convertDimension(value: number, unit: Unit) {
  return unit === "feet" ? value : value * METERS_TO_FEET;
}

function convertArea(value: number, unit: Unit) {
  return unit === "feet" ? value : value * SQM_TO_SQFT;
}

function ToolCard({
  title,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  description: string;
  icon: typeof Brush;
  tone: MaterialRecommendation["tone"];
}) {
  return (
    <div
      className={cn(
        "rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4",
        tone === "accent" && "bg-accent/5",
        tone === "success" && "bg-success/5",
        tone === "warning" && "bg-warning/10",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]",
            tone === "accent" && "bg-accent/10 text-accent",
            tone === "neutral" && "bg-white text-text",
            tone === "success" && "bg-success/10 text-success",
            tone === "warning" && "bg-warning/15 text-warning",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text">{title}</h3>
          <p className="mt-1 text-xs font-medium leading-6 text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: typeof Calculator;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-[1.2rem] border border-border/70 bg-white/80 p-4", accent && "border-accent/20 bg-accent/5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-1 text-lg font-black tracking-tight text-text">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary text-accent", accent && "bg-accent/10")}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function CoveragePill({ children }: { children: React.ReactNode }) {
  return <Badge variant="neutral" className="whitespace-nowrap">{children}</Badge>;
}

function PaintCalculatorSkeleton() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80" />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <Skeleton className="h-64 rounded-[1.6rem]" />
              <Skeleton className="h-64 rounded-[1.6rem]" />
              <Skeleton className="h-48 rounded-[1.6rem]" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[34rem] rounded-[1.6rem]" />
              <Skeleton className="h-64 rounded-[1.6rem]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaintCalculatorEmptyState({ onStart }: { onStart: () => void }) {
  return (
    <EmptyState
      title="Start entering room dimensions"
      description="Add the room measurements, openings, paint type, and coats to generate a premium estimate."
      actionLabel="Start Calculating"
      onAction={onStart}
    />
  );
}

function PaintCalculatorPage() {
  const shouldReduceMotion = useReducedMotion();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [unit, setUnit] = useState<Unit>("feet");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [doors, setDoors] = useState("1");
  const [doorArea, setDoorArea] = useState("21");
  const [windows, setWindows] = useState("2");
  const [windowArea, setWindowArea] = useState("12");
  const [paintType, setPaintType] = useState<PaintType>("Interior Paint");
  const [surface, setSurface] = useState<SurfaceType>("Wall");
  const [coats, setCoats] = useState<CoatCount>(2);
  const [calculated, setCalculated] = useState(false);

  const deferredLength = useDeferredValue(length);
  const deferredWidth = useDeferredValue(width);
  const deferredHeight = useDeferredValue(height);

  const computed = useMemo(() => {
    const l = parseNumber(deferredLength);
    const w = parseNumber(deferredWidth);
    const h = parseNumber(deferredHeight);
    const doorCount = parseNumber(doors);
    const windowCount = parseNumber(windows);
    const doorSize = parseNumber(doorArea);
    const windowSize = parseNumber(windowArea);

    const lengthFt = convertDimension(l, unit);
    const widthFt = convertDimension(w, unit);
    const heightFt = convertDimension(h, unit);

    const totalAreaSqFt = Math.max(2 * (lengthFt + widthFt) * heightFt, 0);
    const openingsSqFt = Math.max(convertArea(doorCount * doorSize + windowCount * windowSize, unit), 0);
    const paintableAreaSqFt = Math.max(totalAreaSqFt - openingsSqFt, 0);
    const coverage = PAINT_TYPE_FACTORS[paintType] * SURFACE_FACTORS[surface];
    const litresRequired = Math.max((paintableAreaSqFt * coats) / coverage, 0);
    const purchasePacks = formatPackList(litresRequired);
    const hasDimensions = l > 0 && w > 0 && h > 0;

    return {
      hasDimensions,
      totalAreaSqFt,
      openingsSqFt,
      paintableAreaSqFt,
      litresRequired,
      purchasePacks,
      coverage,
    };
  }, [coats, deferredHeight, deferredLength, deferredWidth, doorArea, doors, paintType, surface, unit, windowArea, windows]);

  useEffect(() => {
    if (computed.hasDimensions) {
      setCalculated(true);
    }
  }, [computed.hasDimensions]);

  const recommendedProducts = useMemo(
    () => [],
    [],
  );

  const recalculateNow = () => {
    setCalculated(true);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleShare = async () => {
    const text = `Paint estimate: ${computed.paintableAreaSqFt.toFixed(0)} sq.ft, ${computed.litresRequired.toFixed(1)} litres.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "UniqueShopee Paint Estimate", text });
        return;
      } catch {
        // Ignore share cancel.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Estimate copied", description: "Share text copied to clipboard.", variant: "success" });
    } catch {
      toast({ title: "Share unavailable", description: "Clipboard access is unavailable in this session.", variant: "danger" });
    }
  };

  const downloadPlaceholder = (mode: "PDF" | "Email") => {
    toast({
      title: `${mode} export placeholder`,
      description: "This export flow is ready for future backend integration.",
      variant: "success",
    });
  };

  const summaryLabel = unit === "feet" ? "sq.ft" : "sq.m";
  const areaDisplay = `${computed.paintableAreaSqFt.toFixed(0)} sq.ft`;
  const litresDisplay = `${computed.litresRequired.toFixed(1)} L`;

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <motion.div variants={itemVariants} className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
                <li>
                  <Link href="/tools" className="transition-colors hover:text-text focus-visible:text-text">
                    Tools
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <span aria-current="page" className="text-text">
                    Paint Calculator
                  </span>
                </li>
              </ol>
            </nav>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge variant="accent" className="eyebrow-font w-fit">
                  Engineering Tool
                </Badge>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">Paint Calculator</h1>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted sm:text-base">
                    Estimate how much paint you need before placing your order.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <CoveragePill>Coverage-aware</CoveragePill>
                <CoveragePill>Premium estimate</CoveragePill>
                <CoveragePill>Flagship tool</CoveragePill>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <motion.div variants={itemVariants} className="space-y-4">
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 1</p>
                    <h2 className="mt-2 text-xl font-black text-text">Room Information</h2>
                  </div>
                  <Ruler className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="Room Length" htmlFor="room-length">
                    <Input id="room-length" value={length} onChange={(event) => setLength(event.target.value)} type="number" inputMode="decimal" placeholder={`Enter length in ${unit}`} aria-label="Room length" />
                  </FormField>
                  <FormField label="Room Width" htmlFor="room-width">
                    <Input id="room-width" value={width} onChange={(event) => setWidth(event.target.value)} type="number" inputMode="decimal" placeholder={`Enter width in ${unit}`} aria-label="Room width" />
                  </FormField>
                  <FormField label="Room Height" htmlFor="room-height">
                    <Input id="room-height" value={height} onChange={(event) => setHeight(event.target.value)} type="number" inputMode="decimal" placeholder={`Enter height in ${unit}`} aria-label="Room height" />
                  </FormField>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-text">Unit Selector</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["feet", "meters"] as Unit[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setUnit(item)}
                          aria-pressed={unit === item}
                          className={cn(
                            "rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            unit === item
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                          )}
                        >
                          {item === "feet" ? "Feet" : "Meters"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 2</p>
                    <h2 className="mt-2 text-xl font-black text-text">Openings</h2>
                  </div>
                  <DoorOpen className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="Doors Number" htmlFor="doors-number">
                    <Input id="doors-number" value={doors} onChange={(event) => setDoors(event.target.value)} type="number" inputMode="numeric" min={0} placeholder="0" aria-label="Number of doors" />
                  </FormField>
                  <FormField label={`Average Door Size (${unit === "feet" ? "sq.ft" : "sq.m"})`} htmlFor="door-size">
                    <Input id="door-size" value={doorArea} onChange={(event) => setDoorArea(event.target.value)} type="number" inputMode="decimal" min={0} placeholder={unit === "feet" ? "21" : "2"} aria-label="Average door size" />
                  </FormField>
                  <FormField label="Windows Number" htmlFor="windows-number">
                    <Input id="windows-number" value={windows} onChange={(event) => setWindows(event.target.value)} type="number" inputMode="numeric" min={0} placeholder="0" aria-label="Number of windows" />
                  </FormField>
                  <FormField label={`Average Window Size (${unit === "feet" ? "sq.ft" : "sq.m"})`} htmlFor="window-size">
                    <Input id="window-size" value={windowArea} onChange={(event) => setWindowArea(event.target.value)} type="number" inputMode="decimal" min={0} placeholder={unit === "feet" ? "12" : "1.1"} aria-label="Average window size" />
                  </FormField>
                </div>

                <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-muted">
                  <TriangleAlert className="h-4 w-4 text-accent" aria-hidden="true" />
                  Opening area is automatically subtracted from the wall area.
                </p>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 3 - 5</p>
                    <h2 className="mt-2 text-xl font-black text-text">Paint, Surface, and Coats</h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 space-y-5">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text">Paint Type</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.keys(PAINT_TYPE_FACTORS).map((item) => {
                        const active = paintType === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPaintType(item as PaintType)}
                            aria-pressed={active}
                            className={cn(
                              "rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                              active
                                ? "border-transparent bg-accent text-accent-foreground"
                                : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                            )}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text">Surface</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.keys(SURFACE_FACTORS).map((item) => {
                        const active = surface === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setSurface(item as SurfaceType)}
                            aria-pressed={active}
                            className={cn(
                              "rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                              active
                                ? "border-transparent bg-primary text-primary-foreground"
                                : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                            )}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text">Coats</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((coat) => {
                        const active = coats === coat;
                        return (
                          <button
                            key={coat}
                            type="button"
                            onClick={() => setCoats(coat as CoatCount)}
                            aria-pressed={active}
                            className={cn(
                              "rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                              active
                                ? "border-transparent bg-primary text-primary-foreground"
                                : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                            )}
                          >
                            {coat} Coat{coat > 1 ? "s" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>

              <Card ref={resultsRef} className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Live Results</p>
                    <h2 className="mt-2 text-xl font-black text-text">Coverage estimate</h2>
                  </div>
                  <Calculator className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                {!calculated ? (
                  <div className="mt-4">
                    <PaintCalculatorEmptyState onStart={recalculateNow} />
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ResultStat label="Total Paintable Area" value={`${computed.paintableAreaSqFt.toFixed(0)} sq.ft`} icon={SquareStack} accent />
                      <ResultStat label="Estimated Paint Required" value={litresDisplay} icon={Paintbrush} />
                    </div>

                    <div className="rounded-[1.35rem] border border-accent/20 bg-accent/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Recommended Purchase</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {computed.purchasePacks.map((pack, index) => (
                          <Badge key={`${pack}-${index}`} variant={pack === 10 ? "accent" : "neutral"} className="text-sm">
                            {pack}L
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm font-semibold text-text">
                        <div className="rounded-[1rem] border border-border/70 bg-white/85 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Area</p>
                          <p className="mt-1">{areaDisplay}</p>
                        </div>
                        <div className="rounded-[1rem] border border-border/70 bg-white/85 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Coverage</p>
                          <p className="mt-1">{computed.coverage.toFixed(0)} sq.ft/L</p>
                        </div>
                        <div className="rounded-[1rem] border border-border/70 bg-white/85 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Unit</p>
                          <p className="mt-1">{summaryLabel}</p>
                        </div>
                      </div>
                    </div>

                    <details className="group rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                        <span>Calculation details</span>
                        <ArrowRight className="h-4 w-4 rotate-90 text-muted transition-transform group-open:-rotate-90" aria-hidden="true" />
                      </summary>
                      <div className="mt-4 space-y-3 text-sm font-medium leading-6 text-muted">
                        <p>Formula: ((2 x (Length + Width) x Height) - Openings) x Coats ÷ Coverage</p>
                        <p>Coverage assumptions: {paintType} at {PAINT_TYPE_FACTORS[paintType].toFixed(0)} sq.ft/L and {surface} factor {SURFACE_FACTORS[surface].toFixed(2)}.</p>
                        <p>Calculation notes: openings are subtracted after unit conversion and the final quantity is rounded for practical purchasing.</p>
                      </div>
                    </details>
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4 lg:sticky lg:top-24 self-start">
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Results panel</p>
                    <h2 className="mt-2 text-xl font-black text-text">At a glance</h2>
                  </div>
                  <Waves className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                {calculated ? (
                  <div className="mt-4 space-y-3">
                    <ResultStat label="Total Paintable Area" value={`${computed.paintableAreaSqFt.toFixed(0)} sq.ft`} icon={LampWallDown} accent />
                    <ResultStat label="Paint Required" value={litresDisplay} icon={Paintbrush} />
                    <ResultStat label="Suggested Purchase" value={computed.purchasePacks.join(" + ")} icon={ShieldCheck} />
                    <div className="rounded-[1.35rem] border border-border/70 bg-background-secondary/30 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Current setup</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="accent">{paintType}</Badge>
                        <Badge variant="neutral">{surface}</Badge>
                        <Badge variant="neutral">{coats} coat{coats > 1 ? "s" : ""}</Badge>
                        <Badge variant="neutral">{unit}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <PaintCalculatorEmptyState onStart={recalculateNow} />
                  </div>
                )}

                <div className="mt-4 grid gap-2">
                  <Button type="button" variant="accent" size="md" className="w-full" onClick={recalculateNow}>
                    <Calculator className="h-4 w-4" aria-hidden="true" />
                    Calculate Estimate
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Print
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => downloadPlaceholder("PDF")}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      PDF
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => downloadPlaceholder("Email")}>
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Email
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleShare}>
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      Share
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Tips</p>
                    <h2 className="mt-2 text-xl font-black text-text">How to measure better</h2>
                  </div>
                  <CircleHelp className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { title: "How to Measure", body: "Measure each wall separately when the room shape is uneven or has recesses." },
                    { title: "Common Mistakes", body: "Do not forget doors, windows, and extra coats when estimating paint needs." },
                    { title: "Buying Guide", body: "Round up to pack sizes for fewer trips and better project continuity." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                      <h3 className="text-sm font-bold text-text">{item.title}</h3>
                      <p className="mt-1 text-xs font-medium leading-6 text-muted">{item.body}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <ProductShowcase
              title="Recommended Products"
              subtitle="Curated paint and primer picks to help you order with confidence after estimating coverage."
              products={recommendedProducts}
              viewAllHref="/products"
              badge="Product Showcase"
              viewAllLabel="Browse all products"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Coverage accessories</p>
                  <h2 className="mt-2 text-xl font-black text-text">Brushes, rollers, and tape</h2>
                </div>
                <Badge variant="neutral">Project-ready</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {MATERIAL_RECOMMENDATIONS.map((item) => (
                  <ToolCard key={item.label} title={item.label} description={item.description} icon={item.icon} tone={item.tone} />
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-20 z-40 lg:hidden">
        <Button type="button" variant="accent" size="lg" className="w-full shadow-[var(--shadow-lg)]" onClick={recalculateNow}>
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Calculate Estimate
        </Button>
      </div>
    </motion.section>
  );
}

export { PaintCalculatorPage, PaintCalculatorSkeleton };
