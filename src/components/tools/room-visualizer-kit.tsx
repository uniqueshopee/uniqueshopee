"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Brush,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  Fullscreen,
  Heart,
  ImageUp,
  Layers3,
  Palette,
  PaintRoller,
  Printer,
  Search,
  Share2,
  Sparkles,
  Tag,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductShowcase } from "@/components/product/product-showcase";
import { cn } from "@/lib/utils";
import {
  COLOR_SWATCHES,
  FAVORITE_COLOR_IDS,
  PAINT_BRANDS,
  PAINT_CATEGORIES,
  RECENT_COLOR_IDS,
  type ColorSwatch,
  type PaintBrand,
  type PaintCategory,
} from "@/lib/room-visualizer-data";

type PreviewMode = "before-after" | "overlay";

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

function colorWithAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function RoomVisualizerSkeleton() {
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
              <Skeleton className="h-[32rem] rounded-[1.6rem]" />
              <Skeleton className="h-64 rounded-[1.6rem]" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-56 rounded-[1.6rem]" />
              <Skeleton className="h-[36rem] rounded-[1.6rem]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoomVisualizerEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      title="Upload your room to begin"
      description="Choose a room photo to preview paint colours with a premium before/after layout."
      actionLabel="Upload Room"
      onAction={onUpload}
    />
  );
}

function SwatchChip({
  swatch,
  active,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  swatch: ColorSwatch;
  active: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group rounded-[1.1rem] border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "border-transparent bg-accent/10 shadow-[var(--shadow-sm)]" : "border-border/70 bg-white/85 hover:border-accent/20 hover:bg-white",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-full border border-white/80 shadow-[var(--shadow-sm)]"
          style={{ backgroundColor: swatch.hex }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-text">{swatch.name}</p>
            {favorite && <Heart className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden="true" />}
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{swatch.category}</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={`${favorite ? "Remove" : "Add"} ${swatch.name} from favourites`}
          className="rounded-full p-2 text-muted transition-colors hover:bg-background-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Heart className={cn("h-4 w-4", favorite && "fill-accent text-accent")} aria-hidden="true" />
        </button>
      </div>
    </button>
  );
}

function HelpTile({ title, body, icon: Icon }: { title: string; body: string; icon: typeof Palette }) {
  return (
    <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">{title}</h3>
          <p className="mt-1 text-xs font-medium leading-6 text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}

function RoomVisualizerPage() {
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [activeCategory, setActiveCategory] = useState<PaintCategory>("Interior");
  const [activeBrand, setActiveBrand] = useState<PaintBrand>("Asian Paints");
  const [search, setSearch] = useState("");
  const [selectedColorId, setSelectedColorId] = useState(COLOR_SWATCHES[0]?.id ?? "");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(FAVORITE_COLOR_IDS);
  const [recentIds, setRecentIds] = useState<string[]>(RECENT_COLOR_IDS);
  const [opacity, setOpacity] = useState(62);
  const [split, setSplit] = useState(52);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("before-after");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#f3eee7");
  const [customSwatches, setCustomSwatches] = useState<ColorSwatch[]>([]);

  const deferredSearch = useDeferredValue(search);
  const allSwatches = useMemo(() => [...COLOR_SWATCHES, ...customSwatches], [customSwatches]);

  const selectedColor = useMemo(
    () => allSwatches.find((swatch) => swatch.id === selectedColorId) ?? allSwatches[0] ?? null,
    [allSwatches, selectedColorId],
  );

  const filteredSwatches = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    return allSwatches.filter((swatch) => {
      if (swatch.category !== activeCategory) return false;
      if (swatch.brand !== activeBrand) return false;
      if (!normalized) return true;
      return [swatch.name, swatch.category, swatch.brand].join(" ").toLowerCase().includes(normalized);
    });
  }, [activeBrand, activeCategory, allSwatches, deferredSearch]);

  const favoriteSwatches = useMemo(() => allSwatches.filter((swatch) => favoriteIds.includes(swatch.id)), [allSwatches, favoriteIds]);
  const recentSwatches = useMemo(() => allSwatches.filter((swatch) => recentIds.includes(swatch.id)), [allSwatches, recentIds]);
  const paintRecommendations = useMemo(() => [], []);

  useEffect(() => {
    return () => {
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage);
      }
    };
  }, [uploadedImage]);

  const handleUpload = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported file", description: "Please upload JPG, PNG, or WEBP images.", variant: "danger" });
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setUploadedImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setUploadedFileName(file.name);
    toast({ title: "Room uploaded", description: `${file.name} is ready for preview.`, variant: "success" });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]));
  };

  const selectColor = (swatch: ColorSwatch) => {
    setSelectedColorId(swatch.id);
    setRecentIds((current) => [swatch.id, ...current.filter((id) => id !== swatch.id)].slice(0, 4));
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) {
      toast({ title: "Add a colour name", description: "Give your custom colour a name first.", variant: "danger" });
      return;
    }
    const nextId = `custom-${Date.now()}`;
    const customSwatch: ColorSwatch = {
      id: nextId,
      name: customColorName.trim(),
      hex: customColorHex,
      category: activeCategory,
      brand: activeBrand,
    };
    setCustomSwatches((current) => [customSwatch, ...current]);
    setSelectedColorId(nextId);
    setRecentIds((current) => [nextId, ...current.filter((id) => id !== nextId)].slice(0, 4));
    setCustomColorName("");
    toast({ title: "Colour added", description: `${customSwatch.name} has been added to the palette.`, variant: "success" });
  };

  const handleShare = async () => {
    const text = `Room Visualizer: ${selectedColor?.name ?? "Custom colour"} on ${activeCategory} preview.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "UniqueShopee Room Visualizer", text });
        return;
      } catch {
        // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Preview copied", description: "Share text copied to clipboard.", variant: "success" });
    } catch {
      toast({ title: "Share unavailable", description: "Clipboard access is unavailable in this session.", variant: "danger" });
    }
  };

  const handlePrint = () => window.print();

  const handleDownload = () => toast({ title: "Download placeholder", description: "Preview download is ready for future integration.", variant: "success" });

  const selectedOverlay = selectedColor ? colorWithAlpha(selectedColor.hex, opacity / 100) : "rgba(255,255,255,0.55)";
  const hasUpload = Boolean(uploadedImage);
  const previewImage = uploadedImage ?? "";

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
                  <Link href="/tools/paint-calculator" className="transition-colors hover:text-text focus-visible:text-text">
                    Tools
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <span aria-current="page" className="text-text">
                    Room Visualizer
                  </span>
                </li>
              </ol>
            </nav>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge variant="accent" className="eyebrow-font w-fit">
                  Visual Planning
                </Badge>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">Room Visualizer</h1>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted sm:text-base">
                    Preview paint colours before buying.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">AI-ready later</Badge>
                <Badge variant="neutral">Cloudinary-ready</Badge>
                <Badge variant="neutral">Storage-ready</Badge>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <motion.div variants={itemVariants} className="space-y-4">
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 1</p>
                    <h2 className="mt-2 text-xl font-black text-text">Upload Room</h2>
                  </div>
                  <ImageUp className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  aria-label="Upload room photo"
                  onChange={(event) => handleUpload(event.target.files?.[0])}
                />

                <button
                  type="button"
                  onClick={openFilePicker}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleUpload(event.dataTransfer.files?.[0]);
                  }}
                  className="mt-4 flex min-h-64 w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-border bg-[linear-gradient(135deg,rgba(255,247,235,0.92),rgba(255,255,255,0.98))] px-6 py-8 text-center transition-all hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-accent shadow-[var(--shadow-sm)]">
                      <Upload className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-black text-text">Drag & Drop</p>
                      <p className="text-sm font-medium text-muted">Upload JPG, PNG, or WEBP</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Supported formats</p>
                    </div>
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="accent">JPG</Badge>
                  <Badge variant="neutral">PNG</Badge>
                  <Badge variant="neutral">WEBP</Badge>
                  {uploadedFileName ? <Badge variant="success">{uploadedFileName}</Badge> : null}
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 2 - 4</p>
                    <h2 className="mt-2 text-xl font-black text-text">Category, brand, and colour</h2>
                  </div>
                  <Palette className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 space-y-5">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text">Choose Paint Category</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAINT_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(category)}
                          aria-pressed={activeCategory === category}
                          className={cn(
                            "rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            activeCategory === category
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                          )}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text">Choose Brand</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PAINT_BRANDS.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => setActiveBrand(brand)}
                          aria-pressed={activeBrand === brand}
                          className={cn(
                            "rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            activeBrand === brand
                              ? "border-transparent bg-accent text-accent-foreground"
                              : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                          )}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text">Choose Colour</p>
                      <Badge variant="neutral">{filteredSwatches.length} colours</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search colour"
                          className="h-12 pl-11"
                          aria-label="Search colour"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={customColorName}
                          onChange={(event) => setCustomColorName(event.target.value)}
                          placeholder="Add"
                          aria-label="Custom colour name"
                        />
                        <Input
                          value={customColorHex}
                          onChange={(event) => setCustomColorHex(event.target.value)}
                          placeholder="#f3eee7"
                          aria-label="Custom colour hex"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomColor}>
                      Add
                    </Button>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Favourite colours</p>
                          <Badge variant="neutral">{favoriteSwatches.length}</Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {favoriteSwatches.slice(0, 4).map((swatch) => (
                            <SwatchChip
                              key={swatch.id}
                              swatch={swatch}
                              active={selectedColorId === swatch.id}
                              favorite
                              onSelect={() => selectColor(swatch)}
                              onToggleFavorite={() => toggleFavorite(swatch.id)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Recent colours</p>
                          <Badge variant="neutral">{recentSwatches.length}</Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {recentSwatches.slice(0, 4).map((swatch) => (
                            <SwatchChip
                              key={swatch.id}
                              swatch={swatch}
                              active={selectedColorId === swatch.id}
                              favorite={favoriteIds.includes(swatch.id)}
                              onSelect={() => selectColor(swatch)}
                              onToggleFavorite={() => toggleFavorite(swatch.id)}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                        {filteredSwatches.map((swatch) => (
                          <SwatchChip
                            key={swatch.id}
                            swatch={swatch}
                            active={selectedColorId === swatch.id}
                            favorite={favoriteIds.includes(swatch.id)}
                            onSelect={() => selectColor(swatch)}
                            onToggleFavorite={() => toggleFavorite(swatch.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4 lg:sticky lg:top-24 self-start">
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 5</p>
                    <h2 className="mt-2 text-xl font-black text-text">Preview</h2>
                  </div>
                  <Layers3 className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(["before-after", "overlay"] as PreviewMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        aria-pressed={previewMode === mode}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          previewMode === mode
                            ? "border-transparent bg-accent text-accent-foreground"
                            : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                        )}
                      >
                        {mode === "before-after" ? "Before / After" : "Overlay"}
                      </button>
                    ))}
                  </div>

                  <FormField label="Opacity" htmlFor="opacity-range">
                    <input
                      id="opacity-range"
                      type="range"
                      min={0}
                      max={100}
                      value={opacity}
                      onChange={(event) => setOpacity(Number(event.target.value))}
                      className="w-full accent-[color:var(--color-accent)]"
                      aria-label="Overlay opacity"
                    />
                  </FormField>

                  <FormField label="Before / After" htmlFor="split-range">
                    <input
                      id="split-range"
                      type="range"
                      min={0}
                      max={100}
                      value={split}
                      onChange={(event) => setSplit(Number(event.target.value))}
                      className="w-full accent-[color:var(--color-accent)]"
                      aria-label="Before after preview slider"
                    />
                  </FormField>

                  <div
                    ref={previewAreaRef}
                    className="relative min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,247,235,0.88),rgba(255,255,255,0.98))] shadow-[var(--shadow-sm)]"
                  >
                    {hasUpload ? (
                      <>
                        <Image
                          src={previewImage}
                          alt="Uploaded room preview"
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />

                        {previewMode === "before-after" ? (
                          <>
                            <div className="absolute inset-0">
                              <Image
                                src={previewImage}
                                alt=""
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                              />
                            </div>
                            <div
                              className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.25)]"
                              style={{ left: `${split}%` }}
                            />
                            <div
                              className="absolute inset-y-0 right-0"
                              style={{
                                left: `${split}%`,
                                backgroundColor: selectedOverlay,
                                mixBlendMode: "multiply",
                                opacity: opacity / 100,
                              }}
                            />
                            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text shadow-[var(--shadow-sm)]">
                              Before
                            </div>
                            <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text shadow-[var(--shadow-sm)]">
                              After
                            </div>
                          </>
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: selectedOverlay,
                              mixBlendMode: "multiply",
                              opacity: opacity / 100,
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <div className="flex h-full min-h-[28rem] items-center justify-center p-6">
                        <RoomVisualizerEmptyState onUpload={openFilePicker} />
                      </div>
                    )}

                    {hasUpload && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-primary/60 to-transparent px-4 py-4 text-white">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Selected colour</p>
                          <p className="truncate text-sm font-semibold">{selectedColor?.name ?? "Custom colour"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-white/90" style={{ backgroundColor: selectedColor?.hex ?? "#fff" }} />
                          <span className="text-xs font-semibold">{opacity}% opacity</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button type="button" variant="accent" size="md" className="w-full" onClick={() => setFullscreenOpen(true)} disabled={!hasUpload}>
                    <Fullscreen className="h-4 w-4" aria-hidden="true" />
                    Fullscreen preview
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Step 6</p>
                    <h2 className="mt-2 text-xl font-black text-text">Save</h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="accent" size="md" className="w-full" onClick={() => toast({ title: "Design saved", description: "This is a frontend-only saved design placeholder.", variant: "success" })}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Save Design
                  </Button>
                  <Button type="button" variant="outline" size="md" className="w-full" onClick={handleDownload}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download Preview
                  </Button>
                  <Button type="button" variant="outline" size="md" className="w-full" onClick={handleShare}>
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    Share
                  </Button>
                  <Button type="button" variant="outline" size="md" className="w-full" onClick={handlePrint}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Print
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Help</p>
                    <h2 className="mt-2 text-xl font-black text-text">Tips for the best preview</h2>
                  </div>
                  <Camera className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>
                <div className="mt-4 grid gap-3">
                  <HelpTile title="Best colour combinations" body="Use warm whites and creams for softer light, or muted blues and greys for a premium modern feel." icon={Palette} />
                  <HelpTile title="Lighting guide" body="Natural daylight gives the most accurate result. Turn on room lights for night previews." icon={Wand2} />
                  <HelpTile title="Finish guide" body="Matte hides surface variation, while silk and gloss feel brighter under direct light." icon={PaintRoller} />
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <ProductShowcase
              title="Recommended Products"
              subtitle="Use the visual preview to choose paint and accessories that match the room mood."
              products={paintRecommendations}
              viewAllHref="/products"
              badge="Recommended"
              viewAllLabel="Browse products"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Accessory ideas</p>
                  <h2 className="mt-2 text-xl font-black text-text">Brush, roller, masking tape</h2>
                </div>
                <Badge variant="neutral">Project-ready</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                  <Brush className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-text">Brush</p>
                  <p className="mt-1 text-xs font-medium text-muted">Detail work and edges</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                  <PaintRoller className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-text">Roller</p>
                  <p className="mt-1 text-xs font-medium text-muted">Fast wall coverage</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                  <Tag className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-text">Masking Tape</p>
                  <p className="mt-1 text-xs font-medium text-muted">Sharp clean lines</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <Modal
        open={fullscreenOpen}
        onOpenChange={(next) => setFullscreenOpen(next)}
        title="Fullscreen Preview"
        description="Preview your selected colour on the uploaded room image."
        className="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="relative min-h-[70vh] overflow-hidden rounded-[1.5rem] border border-border/70 bg-background-secondary/25">
            {hasUpload ? (
              <>
                <Image src={previewImage} alt="Fullscreen room preview" fill unoptimized className="object-cover" sizes="100vw" />
                <div className="absolute inset-0" style={{ backgroundColor: selectedOverlay, mixBlendMode: "multiply", opacity: opacity / 100 }} />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text shadow-[var(--shadow-sm)]">
                  {selectedColor?.name ?? "Custom colour"}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[70vh] items-center justify-center">
                <RoomVisualizerEmptyState onUpload={openFilePicker} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="accent" size="md" className="w-full" onClick={handleShare}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button type="button" variant="outline" size="md" className="w-full" onClick={handlePrint}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>
      </Modal>

      <div className="fixed inset-x-4 bottom-20 z-40 lg:hidden">
        <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/80 bg-white/92 p-2 shadow-[var(--shadow-lg)]">
          <Button type="button" variant="accent" size="md" onClick={openFilePicker}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
          <Button type="button" variant="outline" size="md" onClick={() => setFullscreenOpen(true)} disabled={!hasUpload}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

export { RoomVisualizerPage, RoomVisualizerSkeleton };
