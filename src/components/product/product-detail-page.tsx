"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  Check,
  ChevronDown,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import { ProductShowcase } from "./product-showcase";
import type { ProductDetail, ProductFaq } from "@/lib/product-detail-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/components/auth/auth-provider";
import { buildLoginRedirectPath } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, formatPrice } from "@/lib/utils";
import { addValidatedCartItem } from "@/lib/cart-service";
import { toast } from "@/hooks/use-toast";

type ProductDetailPageProps = {
  product: Product;
  detail: ProductDetail;
  relatedProducts: Product[];
};

type ZoomPoint = {
  x: number;
  y: number;
};

type VariantGroup = {
  label: string;
  options: ProductDetail["variants"];
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

function getBrandTone(accent: ProductDetail["brandAccent"]) {
  switch (accent) {
    case "plumbing":
      return {
        wash: "from-cyan-50 via-white to-sky-50",
      };
    case "tools":
      return {
        wash: "from-indigo-50 via-white to-blue-50",
      };
    default:
      return {
        wash: "from-orange-50 via-white to-amber-50",
      };
  }
}

function formatVariantGroup(label: string | null | undefined, fallbackIndex: number) {
  const value = label?.trim();

  if (!value) {
    return fallbackIndex === 0 ? "Variants" : `Option ${fallbackIndex + 1}`;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("weight")) {
    return "Weight";
  }

  if (normalized.includes("colour") || normalized.includes("color") || normalized.includes("shade")) {
    return "Colour";
  }

  return value.replace(/\s+/g, " ");
}

function buildVariantGroups(variants: ProductDetail["variants"]) {
  const groups = new Map<string, ProductDetail["variants"]>();
  const namedGroups = variants.filter((variant) => Boolean(variant.group?.trim()));

  if (namedGroups.length === 0) {
    if (variants.length === 0) {
      return [];
    }

    return [{ label: "Variants", options: variants }];
  }

  for (const variant of variants) {
    const label = formatVariantGroup(variant.group, 0);
    const options = groups.get(label) ?? [];
    options.push(variant);
    groups.set(label, options);
  }

  return Array.from(groups.entries()).map(([label, options]) => ({ label, options }));
}

function buildDefaultSelections(groups: VariantGroup[]) {
  return groups.reduce<Record<string, string>>((accumulator, group) => {
    const defaultOption = group.options.find((option) => option.isDefault) ?? group.options[0];

    accumulator[group.label] = defaultOption?.value ?? "";

    return accumulator;
  }, {});
}

function syncSelections(current: Record<string, string>, groups: VariantGroup[]) {
  const next = buildDefaultSelections(groups);
  let changed = Object.keys(current).length !== Object.keys(next).length;

  for (const group of groups) {
    const currentValue = current[group.label];
    const allowed = group.options.some((option) => option.value === currentValue);
    const fallback = next[group.label];
    const resolved = (allowed && currentValue ? currentValue : fallback) ?? "";

    if (next[group.label] !== resolved) {
      next[group.label] = resolved;
      changed = true;
    }
  }

  if (!changed) {
    return current;
  }

  return next;
}

function Rating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
      <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/90 px-3 py-1.5 text-text">
        <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
        <span className="font-semibold">{rating.toFixed(1)}</span>
      </div>
      {reviewCount > 0 && <span>{reviewCount} reviews</span>}
    </div>
  );
}

function FAQItem({ item }: { item: ProductFaq }) {
  return (
    <details className="group rounded-[1.1rem] border border-border/70 bg-white/95 p-4 shadow-[var(--shadow-sm)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span>{item.question}</span>
        <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="mt-3 text-sm font-medium leading-7 text-muted">{item.answer}</p>
    </details>
  );
}

function ProductDetailPage({
  product,
  detail,
  relatedProducts,
}: ProductDetailPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, profile, user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomPoint, setZoomPoint] = useState<ZoomPoint>({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [consultationSubmitting, setConsultationSubmitting] = useState(false);
  const [consultationForm, setConsultationForm] = useState({
    fullName: "",
    phone: "",
    slot: "Today (Within 30 mins)",
    notes: "",
  });
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const tone = useMemo(() => getBrandTone(detail.brandAccent), [detail.brandAccent]);
  const variantGroups = useMemo(() => buildVariantGroups(detail.variants), [detail.variants]);
  const activeImage = detail.gallery[activeImageIndex] ?? product.image;
  const isOutOfStock = !product.inStock || (product.stockCount ?? 0) <= 0;
  const compareAtPrice = product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice : undefined;
  const discountPercent = compareAtPrice ? Math.max(1, Math.round((1 - product.price / compareAtPrice) * 100)) : null;
  const selectedVariantSummary = useMemo(
    () =>
      variantGroups
        .map((group) => {
          const selectedValue = selectedVariants[group.label];
          const option = group.options.find((item) => item.value === selectedValue) ?? group.options[0];

          if (!option) {
            return null;
          }

          return `${group.label}: ${option.label}`;
        })
        .filter((item): item is string => Boolean(item))
        .join(" • "),
    [selectedVariants, variantGroups],
  );
  const visibleRelatedProducts = relatedProducts.slice(0, 4);

  useEffect(() => {
    setSelectedVariants((current) => syncSelections(current, variantGroups));
  }, [variantGroups]);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [product.id]);

  useEffect(() => {
    setConsultationForm((current) => ({
      ...current,
      fullName: profile?.full_name?.trim() || current.fullName || "",
      phone: profile?.phone?.trim() || current.phone || "",
    }));
  }, [profile?.full_name, profile?.phone, product.id]);

  useEffect(() => {
    const target = actionsRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry) {
          return;
        }

        setShowStickyBar(!entry.isIntersecting);
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, []);

  const updateZoom = (event: PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    setZoomPoint({ x, y });
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      return;
    }

    if (!isAuthenticated) {
      router.push(buildLoginRedirectPath(pathname));
      return;
    }

    const result = await addValidatedCartItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        slug: product.slug,
        category: product.category,
        compareAtPrice: product.compareAtPrice,
        inStock: product.inStock,
        stockCount: product.stockCount,
        reservedCount: product.reservedCount,
        lowStockThreshold: product.lowStockThreshold,
      },
      quantity,
      { silent: true },
    );

    if (result.success) {
      toast({
        title: "Added to cart",
        description: selectedVariantSummary ? `${product.name} • ${selectedVariantSummary}` : product.name,
        variant: "success",
      });
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) {
      return;
    }

    const result = await addValidatedCartItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        slug: product.slug,
        category: product.category,
        compareAtPrice: product.compareAtPrice,
        inStock: product.inStock,
        stockCount: product.stockCount,
        reservedCount: product.reservedCount,
        lowStockThreshold: product.lowStockThreshold,
      },
      quantity,
      { silent: true },
    );

    if (result.success) {
      toast({
        title: "Added to cart",
        description: product.name,
        variant: "success",
      });
      router.push("/checkout");
    }
  };

  const handleOpenConsultation = () => {
    if (!isAuthenticated) {
      router.push(buildLoginRedirectPath(pathname));
      return;
    }

    setConsultationOpen(true);
  };

  const handleSubmitConsultation = async () => {
    if (!isAuthenticated || !user) {
      router.push(buildLoginRedirectPath(pathname));
      return;
    }

    const fullName = consultationForm.fullName.trim();
    const phone = consultationForm.phone.trim();

    if (!fullName || !phone) {
      toast({
        title: "Complete the consultation form",
        description: "Your name and phone number are required.",
        variant: "warning",
      });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({
        title: "Supabase unavailable",
        description: "Cannot submit the consultation right now.",
        variant: "danger",
      });
      return;
    }

    setConsultationSubmitting(true);
    try {
      const { error } = await client.from("consultations").insert([
        {
          user_id: user.id,
          product_id: product.id,
          full_name: fullName,
          phone,
          preferred_slot: consultationForm.slot,
          notes: consultationForm.notes.trim() || null,
          status: "pending",
        },
      ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Consultation requested",
        description: "Our team will review your request soon.",
        variant: "success",
      });
      setConsultationOpen(false);
      setConsultationForm((current) => ({ ...current, notes: "" }));
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Unable to submit the consultation request.",
        variant: "danger",
      });
    } finally {
      setConsultationSubmitting(false);
    }
  };

  const specifications = detail.specifications.filter(
    (item) => item.label.trim().length > 0 && item.value.trim().length > 0,
  );

  return (
    <main className="bg-background pb-64 sm:pb-72 lg:pb-8">
      <motion.section
        aria-labelledby="product-detail-title"
        className="relative isolate overflow-hidden border-b border-border surface-warm"
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.15 }}
        variants={SECTION_VARIANTS}
      >
        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
              <li>
                <Link href="/" className="transition-colors hover:text-text focus-visible:text-text">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/products" className="transition-colors hover:text-text focus-visible:text-text">
                  Products
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-text">{product.name}</li>
            </ol>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/96 p-3 shadow-[var(--shadow-lg)]">
                <div
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-[1.5rem] border border-white/80 bg-gradient-to-br",
                    tone.wash,
                  )}
                  onPointerMove={updateZoom}
                  onPointerEnter={() => setIsZooming(true)}
                  onPointerLeave={() => setIsZooming(false)}
                >
                  <Image
                    src={activeImage}
                    alt={`${product.name} image ${activeImageIndex + 1}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="cursor-zoom-in object-contain p-5 transition-transform duration-300"
                    style={{
                      transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`,
                      transform: isZooming && !shouldReduceMotion ? "scale(1.08)" : "scale(1)",
                      objectPosition: `${zoomPoint.x}% ${zoomPoint.y}%`,
                    }}
                    onClick={() => setIsZooming((current) => !current)}
                    aria-pressed={isZooming}
                  />
                  {discountPercent ? (
                    <Badge variant="accent" className="absolute right-3 top-3 shadow-[var(--shadow-sm)]">
                      {discountPercent}% off
                    </Badge>
                  ) : null}
                </div>
              </div>

              {detail.gallery.length > 1 && (
                <div className="overflow-x-auto pb-1">
                  <div className="flex gap-3">
                    {detail.gallery.map((image, index) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        aria-pressed={activeImageIndex === index}
                        aria-label={`View image ${index + 1} of ${detail.gallery.length}`}
                        className={cn(
                          "group relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.15rem] border bg-white/95 shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-24 sm:w-24",
                          activeImageIndex === index ? "border-accent/30 ring-1 ring-accent/20" : "border-border/70",
                        )}
                      >
                        <Image
                          src={image}
                          alt={`Thumbnail ${index + 1} of ${product.name}`}
                          width={160}
                          height={160}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <Card className="overflow-hidden">
                <div className="space-y-3 p-3 sm:space-y-5 sm:p-5">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{detail.brand}</p>
                      <h1 
                         id="product-detail-title" 
                         className="break-words text-[1.7rem] font-bold leading-[1.08] text-text sm:text-3xl">
                         {product.name}
                      </h1>
                      <Rating rating={product.rating ?? 4.6} reviewCount={product.reviewCount ?? 0} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Selling Price</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[2rem] font-bold leading-none text-text">{formatPrice(product.price)}</span>
                        {compareAtPrice && (
                          <span className="text-sm font-medium text-muted line-through">{formatPrice(compareAtPrice)}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="neutral" className="inline-flex items-center gap-1">
                      <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
                      GST included
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <p
                      className={cn(
                        "max-w-xl text-sm font-medium leading-5 text-muted",
                        descriptionExpanded ? "line-clamp-none" : "line-clamp-1",
                      )}
                    >
                      {detail.description}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full px-2 text-accent"
                      onClick={() => setDescriptionExpanded((current) => !current)}
                    >
                      {descriptionExpanded ? "Show less" : "Read more"}
                    </Button>
                  </div>

                  {detail.showVariants && variantGroups.length > 0 && (
                    <div className="space-y-3.5">
                      {variantGroups.map((group) => {
                        const selectedValue = selectedVariants[group.label];
                        const selectedOption = group.options.find((option) => option.value === selectedValue) ?? group.options[0];

                        return (
                          <div key={group.label} className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-text">{group.label}</p>
                                <p className="text-xs font-medium text-muted">Choose from the available options.</p>
                              </div>
                              {selectedOption && <span className="text-xs font-semibold text-muted">{selectedOption.label}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.options.map((option) => {
                                const selected = selectedVariants[group.label] === option.value;

                                return (
                                  <motion.button
                                    key={option.value}
                                    type="button"
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() =>
                                      setSelectedVariants((current) => ({
                                        ...current,
                                        [group.label]: option.value,
                                      }))
                                    }
                                    aria-pressed={selected}
                                    className={cn(
                                      "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                                      selected
                                        ? "border-accent bg-accent text-accent-foreground shadow-[0_14px_30px_-20px_rgba(37,99,235,0.7)] scale-[1.02]"
                                        : "border-border/80 bg-white text-text hover:border-accent/20 hover:bg-sky-50",
                                    )}
                                  >
                                    {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                                    <span>{option.label}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-text">Quantity</p>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Minimum 1</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/95 p-1 shadow-[var(--shadow-sm)]">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <span className="min-w-12 text-center text-sm font-bold text-text">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => setQuantity((current) => current + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div ref={actionsRef} className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      type="button"
                      onClick={() => void handleAddToCart()}
                      className="w-full"
                      disabled={isOutOfStock}
                    >
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="accent"
                      size="lg"
                      type="button"
                      onClick={() => void handleBuyNow()}
                      className="w-full"
                      disabled={isOutOfStock}
                    >
                      Buy Now
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <Card className="border-border/70 bg-white/95 p-4 shadow-[var(--shadow-sm)]">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Book your free colour consultation</p>
                        <p className="text-sm font-medium leading-6 text-muted">
                          Confused about shades? Talk to our expert before you decide.
                        </p>
                      </div>
                      <Button variant="outline" type="button" className="w-full sm:w-auto" onClick={handleOpenConsultation}>
                        <span>Talk to our experts</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </Card>
            </section>
          </div>
        </div>
      </motion.section>

      {specifications.length > 0 && (
        <motion.section
          className="border-b border-border surface-splash"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
          variants={SECTION_VARIANTS}
        >
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Specifications</p>
              <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">Specifications</h2>
            </div>
            <Card>
              <dl className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
                {specifications.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-4 rounded-[1rem] border border-border/60 bg-white/90 px-4 py-3">
                    <dt className="min-w-0 text-sm font-medium text-muted">{item.label}</dt>
                    <dd className="text-right text-sm font-semibold text-text">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </motion.section>
      )}

      {detail.faq.length > 0 && (
        <motion.section
          className="border-b border-border surface-warm"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
          variants={SECTION_VARIANTS}
        >
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">FAQ</p>
              <h2 className="mt-2 text-xl font-bold text-text sm:text-2xl">FAQ</h2>
            </div>
            <div className="grid gap-3">
              {detail.faq.map((item) => (
                <FAQItem key={item.question} item={item} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {visibleRelatedProducts.length > 0 && (
        <ProductShowcase
          title="Related Products"
          subtitle={`More from ${detail.brand} that pairs well with ${product.name.toLowerCase()}.`}
          products={visibleRelatedProducts}
          viewAllHref="/products"
          badge="Related"
          viewAllLabel="View All Products"
        />
      )}

      {showStickyBar && (
        <motion.div
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 px-3 lg:hidden"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto max-w-2xl rounded-[1.35rem] border border-border/70 bg-white/98 px-3 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Price</p>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[1.05rem] font-bold text-text">{formatPrice(product.price)}</span>
                    {compareAtPrice && <span className="text-xs font-medium text-muted line-through">{formatPrice(compareAtPrice)}</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="md" type="button" onClick={() => void handleAddToCart()} className="w-full" disabled={isOutOfStock}>
                  Add to Cart
                </Button>
                <Button variant="primary" size="md" type="button" onClick={() => void handleBuyNow()} className="w-full" disabled={isOutOfStock}>
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <Modal
        open={consultationOpen}
        onOpenChange={setConsultationOpen}
        title="Book Your Free Colour Consultation"
        description="Share your details and our expert will contact you soon."
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Card className="border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-sm font-bold text-text">Product Context: {product.name}</p>
            <p className="mt-1 text-xs font-medium text-muted">Your request will be visible in the admin reviews panel.</p>
          </Card>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-text">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Your Full Name</span>
              <input
                value={consultationForm.fullName}
                onChange={(event) => setConsultationForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="e.g. Ananya Roy"
                className="h-12 rounded-[var(--radius-md)] border border-border bg-background px-4 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-text">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Phone Number for Callback</span>
              <input
                value={consultationForm.phone}
                onChange={(event) => setConsultationForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+91 98765 43210"
                inputMode="tel"
                className="h-12 rounded-[var(--radius-md)] border border-border bg-background px-4 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
            <div className="grid gap-2 text-sm font-semibold text-text">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Preferred Callback Slot</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Today (Within 30 mins)",
                  "Today Evening (6 - 8 PM)",
                  "Tomorrow Morning",
                  "Weekend Special",
                ].map((slot) => {
                  const selected = consultationForm.slot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setConsultationForm((current) => ({ ...current, slot }))}
                      className={cn(
                        "rounded-[1rem] border px-4 py-3 text-left text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        selected ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border bg-white text-text hover:border-accent/20 hover:bg-sky-50",
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-text">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Notes</span>
              <textarea
                value={consultationForm.notes}
                onChange={(event) => setConsultationForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Tell us about your shade preferences, room type, or wall condition."
                rows={4}
                className="min-h-28 rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={() => setConsultationOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="accent" type="button" loading={consultationSubmitting} onClick={() => void handleSubmitConsultation()} className="w-full sm:w-auto">
              Request Call
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

export { ProductDetailPage };
