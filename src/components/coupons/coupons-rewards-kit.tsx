"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  Copy,
  Gift,
  History,
  LineChart,
  Search,
  Sparkles,
  Tag,
  Ticket,
  Trophy,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cart-store";
import { loadLiveCoupons, loadRewardSnapshot, type LiveCoupon, type RewardSnapshot } from "@/lib/account-service";
import { resolveCouponCode } from "@/lib/checkout-pricing";

type CouponStatus = LiveCoupon["status"] | "All";
type CouponView = "All" | "Coupons" | "Offers";
type RewardHistoryStatus = RewardSnapshot["history"][number]["status"];
type RewardTier = RewardSnapshot["tier"];

type RewardSummary = {
  title: string;
  value: string;
  description: string;
  icon: typeof BarChart3;
};

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
};

const HISTORY_FILTERS: Array<RewardHistoryStatus | "All"> = ["All", "Earned", "Redeemed", "Pending"];

function getStatusBadge(status: CouponStatus) {
  switch (status) {
    case "Available":
      return "success" as const;
    case "Applied":
      return "accent" as const;
    case "Used":
      return "neutral" as const;
    case "Expired":
    default:
      return "danger" as const;
  }
}

function getHistoryBadge(status: RewardHistoryStatus) {
  switch (status) {
    case "Earned":
      return "success" as const;
    case "Redeemed":
      return "accent" as const;
    case "Pending":
    default:
      return "warning" as const;
  }
}

function getRewardTierVariant(tier: RewardTier) {
  switch (tier) {
    case "Platinum":
      return "accent" as const;
    case "Gold":
      return "warning" as const;
    case "Silver":
    default:
      return "neutral" as const;
  }
}

function getCouponView(coupon: LiveCoupon): Exclude<CouponView, "All"> {
  return coupon.category.toLowerCase().includes("offer") ? "Offers" : "Coupons";
}

function CouponCard({
  coupon,
  onCopy,
  onApply,
  onViewTerms,
}: {
  coupon: LiveCoupon;
  onCopy: (coupon: LiveCoupon) => void;
  onApply: (coupon: LiveCoupon) => void;
  onViewTerms: (coupon: LiveCoupon) => void;
}) {
  return (
    <Card className={cn("rounded-[1.25rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]", coupon.status === "Applied" && "border-accent/20")}>
      <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-accent/10 text-accent">
          {getCouponView(coupon) === "Offers" ? <Gift className="h-5 w-5" aria-hidden="true" /> : <Ticket className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getStatusBadge(coupon.status)}>{coupon.status}</Badge>
                <Badge variant="neutral">{getCouponView(coupon)}</Badge>
              </div>
              <h3 className="mt-2 truncate text-base font-black tracking-tight text-text sm:text-lg">{coupon.title}</h3>
              <p className="text-xs font-bold tracking-[0.12em] text-accent">Use code {coupon.code}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-black text-text sm:text-lg">{coupon.discount}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Save more</p>
            </div>
          </div>
          <p className="line-clamp-2 text-sm font-medium leading-5 text-muted">{coupon.description}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
            {coupon.minimumOrder !== "₹0" && <span>Min. {coupon.minimumOrder}</span>}
            {coupon.maximumDiscount !== "Unlimited" && <span>Max. {coupon.maximumDiscount}</span>}
            {coupon.expiry !== "No expiry" && <span>Valid till {coupon.expiry}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" variant="accent" size="sm" onClick={() => onApply(coupon)}>
              <Tag className="h-4 w-4" aria-hidden="true" />
              Apply
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onCopy(coupon)} aria-label={`Copy ${coupon.code}`}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy code
            </Button>
            <Button type="button" variant="ghost" size="sm" className="border border-border/70 bg-white/75" onClick={() => onViewTerms(coupon)}>
              Terms
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CouponSkeletonCard() {
  return (
    <Card className="rounded-[1.45rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-16 w-24 rounded-[1rem]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-14 rounded-[1rem]" />
          <Skeleton className="h-14 rounded-[1rem]" />
          <Skeleton className="h-14 rounded-[1rem]" />
          <Skeleton className="h-14 rounded-[1rem]" />
        </div>
        <Skeleton className="h-16 rounded-[1rem]" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

function CouponsSkeleton() {
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
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80" />
              <Skeleton className="h-12 w-40 rounded-full" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <Skeleton className="h-12 rounded-[1.2rem]" />
            <Skeleton className="h-12 rounded-[1.2rem]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-full" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <CouponSkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RewardsSkeleton() {
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
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80" />
              <Skeleton className="h-12 w-44 rounded-full" />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Skeleton className="h-56 rounded-[1.6rem]" />
            <Skeleton className="h-56 rounded-[1.6rem]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 rounded-[1.6rem]" />
            <Skeleton className="h-64 rounded-[1.6rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CouponsEmptyState({ onHome }: { onHome: () => void }) {
  return (
    <EmptyState
      title="No Coupons Found"
      description="Try a different search or switch tabs to see more available offers."
      actionLabel="Return to Home"
      onAction={onHome}
    />
  );
}

function RewardsEmptyState({ onHome }: { onHome: () => void }) {
  return (
    <EmptyState
      title="No Rewards Yet"
      description="Earn points through purchases, reviews, and referrals to build your rewards balance."
      actionLabel="Return to Home"
      onAction={onHome}
    />
  );
}

function Header({
  title,
  subtitle,
  countLabel,
  countValue,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  subtitle: string;
  countLabel: string;
  countValue: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-text focus-visible:text-text">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-text">
              {title}
            </span>
          </li>
        </ol>
      </nav>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="accent" className="eyebrow-font w-fit">
            Rewards Center
          </Badge>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background-secondary px-3 py-1.5 text-sm font-semibold text-text">
            <Ticket className="h-4 w-4 text-accent" aria-hidden="true" />
            {countValue} {countLabel}
          </div>
        </div>
        {primaryAction || secondaryAction ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            {secondaryAction}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CouponsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { profile, user } = useAuth();
  const accountId = profile?.id ?? user?.id ?? null;
  const currentCouponCode = useCartStore((state) => state.couponCode);
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const [items, setItems] = useState<LiveCoupon[]>([]);
  const [activeView, setActiveView] = useState<CouponView>("All");
  const [query, setQuery] = useState("");
  const [termsCoupon, setTermsCoupon] = useState<LiveCoupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void loadLiveCoupons(client, accountId, currentCouponCode ?? null).then((nextItems) => {
      if (!active) {
        return;
      }
      setItems(nextItems);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [accountId, currentCouponCode]);

  const filteredCoupons = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((coupon) => {
      if (coupon.status !== "Available" && coupon.status !== "Applied") return false;
      if (activeView !== "All" && getCouponView(coupon) !== activeView) return false;
      if (!normalized) return true;
      return [coupon.code, coupon.title, coupon.description, coupon.category, coupon.terms].join(" ").toLowerCase().includes(normalized);
    });
  }, [activeView, items, query]);

  const availableCount = useMemo(() => items.filter((coupon) => coupon.status === "Available" || coupon.status === "Applied").length, [items]);

  const copyCode = async (coupon: LiveCoupon) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast({
        title: "Coupon code copied",
        description: `${coupon.code} is ready to paste at checkout.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy unavailable",
        description: "Clipboard access is unavailable in this session.",
        variant: "danger",
      });
    }
  };

  const applyCoupon = (coupon: LiveCoupon) => {
    const resolved = resolveCouponCode(coupon.code);
    if (resolved) {
      setCouponCode(resolved);
    }

    setItems((current) =>
      current.map((item) =>
        item.id === coupon.id
          ? { ...item, status: "Applied" }
          : item.status === "Applied" && coupon.status === "Available"
            ? { ...item, status: "Available" }
            : item,
      ),
    );

    toast({
      title: resolved ? "Coupon applied" : "Coupon saved",
      description: resolved
        ? `${coupon.code} is now applied to your cart session.`
        : `${coupon.code} is available in your account, but this code is not mapped to cart pricing yet.`,
      variant: "success",
    });
  };

  if (loading) {
    return <CouponsRewardsSkeleton variant="coupons" />;
  }

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
          <motion.div variants={itemVariants}>
            <Header
              title="Coupons"
              subtitle="Save more with curated offers across paints, plumbing, bank deals, and contractor rewards."
              countLabel="available coupons"
              countValue={String(availableCount)}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="flex rounded-[1.1rem] border border-border/70 bg-white/85 p-1" role="tablist" aria-label="Coupon type">
            {(["All", "Coupons", "Offers"] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={activeView === view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "min-h-10 flex-1 rounded-[0.85rem] px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  activeView === view ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]" : "text-muted hover:bg-background-secondary hover:text-text",
                )}
              >
                {view}
              </button>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-3">
            <FormField label="Search coupons" htmlFor="coupon-search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  id="coupon-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search coupon code, category, or terms"
                  className="h-12 pl-11"
                  aria-label="Search coupons"
                />
              </div>
            </FormField>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredCoupons.length === 0 ? (
              <CouponsEmptyState onHome={() => (window.location.href = "/")} />
            ) : (
              filteredCoupons.map((coupon) => (
                <motion.div key={coupon.id} variants={itemVariants}>
                  <CouponCard
                    coupon={coupon}
                    onCopy={copyCode}
                    onApply={applyCoupon}
                    onViewTerms={(current) => setTermsCoupon(current)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(termsCoupon)}
        onOpenChange={(next) => {
          if (!next) setTermsCoupon(null);
        }}
        title={termsCoupon ? `Terms for ${termsCoupon.code}` : "Coupon Terms"}
        description={termsCoupon ? termsCoupon.description : "Coupon terms"}
        className="max-w-lg"
      >
        {termsCoupon && (
          <div className="space-y-4">
            <p className="text-sm font-medium leading-6 text-text">{termsCoupon.terms}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-border/70 bg-background-secondary/35 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Minimum Order</p>
                <p className="mt-1 text-sm font-semibold text-text">{termsCoupon.minimumOrder}</p>
              </div>
              <div className="rounded-[1rem] border border-border/70 bg-background-secondary/35 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Maximum Discount</p>
                <p className="mt-1 text-sm font-semibold text-text">{termsCoupon.maximumDiscount}</p>
              </div>
            </div>
            <Button type="button" variant="accent" size="md" className="w-full" onClick={() => applyCoupon(termsCoupon)}>
              Apply Coupon
            </Button>
          </div>
        )}
      </Modal>
    </motion.section>
  );
}

function RewardsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { profile, user } = useAuth();
  const accountId = profile?.id ?? user?.id ?? null;
  const [historyFilter, setHistoryFilter] = useState<(typeof HISTORY_FILTERS)[number]>("All");
  const [snapshot, setSnapshot] = useState<RewardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void loadRewardSnapshot(client, accountId).then((nextSnapshot) => {
      if (!active) {
        return;
      }
      setSnapshot(nextSnapshot);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [accountId]);

  const currentPoints = snapshot?.currentPoints ?? 0;
  const currentTier = snapshot?.tier ?? "Silver";
  const nextTierPoints = snapshot?.nextTierPoints ?? 1200;
  const nextReward = snapshot?.nextReward ?? "Gold Benefits";
  const progress = Math.min((currentPoints / nextTierPoints) * 100, 100);
  const currentTierBadge = getRewardTierVariant(currentTier);

  const historyItems = useMemo(
    () => (historyFilter === "All" ? snapshot?.history ?? [] : (snapshot?.history ?? []).filter((item) => item.status === historyFilter)),
    [historyFilter, snapshot],
  );

  const summaryCards: RewardSummary[] = [
    { title: "Current Points", value: currentPoints.toLocaleString(), description: "Available to redeem", icon: BarChart3 },
    { title: "Tier", value: currentTier, description: "Member reward tier", icon: Trophy },
    { title: "Next Reward", value: nextReward, description: "Unlocks after the next milestone", icon: Gift },
  ];

  if (loading) {
    return <CouponsRewardsSkeleton variant="rewards" />;
  }

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
          <motion.div variants={itemVariants}>
            <Header
              title="Rewards"
              subtitle="Track your points, tier progress, and all the ways you can earn or redeem rewards."
              countLabel="reward points"
              countValue={currentPoints.toLocaleString()}
              primaryAction={
                <Button type="button" variant="accent" size="md" className="w-full sm:w-auto">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Redeem Now
                </Button>
              }
              secondaryAction={
                <Button type="button" variant="outline" size="md" className="w-full sm:w-auto">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  Tier Benefits
                </Button>
              }
            />
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Progress to next tier</p>
                    <h2 className="text-2xl font-black tracking-tight text-text">Keep earning points</h2>
                    <p className="max-w-xl text-sm font-medium leading-6 text-muted">
                      You need {Math.max(nextTierPoints - currentPoints, 0).toLocaleString()} more points to unlock the next reward milestone.
                    </p>
                  </div>
                  <Badge variant={currentTierBadge}>{currentTier} Tier</Badge>
                </div>

                <div className="mt-5 rounded-[1.35rem] border border-border/70 bg-background-secondary/35 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-text">
                    <span>{currentPoints.toLocaleString()} points</span>
                    <span>{nextTierPoints.toLocaleString()} points</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent via-[#fb923c] to-[#fdba74]" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Tier progress</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{Math.round(progress)}%</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.title} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{card.title}</p>
                            <p className="text-lg font-black text-text">{card.value}</p>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary text-accent">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium text-muted">{card.description}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Next reward</p>
                    <h2 className="mt-2 text-xl font-black text-text">{nextReward}</h2>
                    <p className="mt-2 text-sm font-medium text-muted">Redeem using the options below when enough points are available.</p>
                  </div>
                  <Gift className="h-10 w-10 text-accent" aria-hidden="true" />
                </div>

                <div className="mt-4 space-y-3">
                  {(snapshot?.redeemOptions ?? []).map((option) => (
                    <div key={option.id} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-text">{option.title}</h3>
                          <p className="mt-1 text-xs font-medium text-muted">{option.description}</p>
                        </div>
                        <Badge variant="neutral">{option.points}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Rewards history</p>
                    <h2 className="mt-2 text-xl font-black text-text">Earned, redeemed, pending</h2>
                  </div>
                  <History className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {HISTORY_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setHistoryFilter(filter)}
                      aria-pressed={historyFilter === filter}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        historyFilter === filter
                          ? "border-transparent bg-accent text-accent-foreground"
                          : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  {historyItems.length === 0 ? (
                    <RewardsEmptyState onHome={() => (window.location.href = "/")} />
                  ) : (
                    historyItems.map((item) => (
                      <div key={item.id} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-text">{item.title}</h3>
                              <Badge variant={getHistoryBadge(item.status)}>{item.status}</Badge>
                            </div>
                            <p className="text-xs font-medium text-muted">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-text">{item.points.toLocaleString()} pts</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{item.date}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Ways to earn</p>
                    <h2 className="mt-2 text-xl font-black text-text">Grow your points faster</h2>
                  </div>
                  <LineChart className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(snapshot?.earnWays ?? []).map((item) => (
                    <div key={item.id} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-text">{item.title}</h3>
                          <p className="text-xs font-medium text-muted">{item.description}</p>
                        </div>
                        <Badge variant="accent">{item.points}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function CouponsRewardsSkeleton({ variant = "coupons" }: { variant?: "coupons" | "rewards" }) {
  return variant === "rewards" ? <RewardsSkeleton /> : <CouponsSkeleton />;
}

export { CouponsPage, RewardsPage, CouponsRewardsSkeleton };
