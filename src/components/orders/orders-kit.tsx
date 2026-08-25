"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDot, Clock3, Copy, LocateFixed, Package, ScrollText, ShieldCheck, Truck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPrice } from "@/lib/utils";
import { SharedProductCard } from "@/components/product/shared-product-card";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  canCancelOrder,
  type OrderItem,
  type OrderRecord,
  type OrderStatus,
  type OrderTab,
  getOrderTab,
} from "@/lib/orders-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cancelOrder, loadOrderById, type OrderAccessRole } from "@/lib/order-service";
import { createReturnRequest, getReturnEligibility, loadOrderReturnRequests, type OrderReturnRequest, type ReturnPickupOption } from "@/lib/return-service";
import { calculateCartPricing, resolveCouponCode } from "@/lib/checkout-pricing";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const ORDER_TABS: Array<{ label: string; value: OrderTab }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Delivered", value: "delivered" },
];

const TIMELINE_ICONS: Record<string, IconType> = {
  pending: Clock3,
  ordered: CircleDot,
  confirmed: CheckCircle2,
  packed: Package,
  shipped: Truck,
  delivery: LocateFixed,
  delivered: ShieldCheck,
};

function getStatusTone(status: OrderStatus) {
  const tone = ORDER_STATUS_TONE[status];
  return tone === "neutral"
    ? "neutral"
    : tone === "accent"
      ? "accent"
      : tone === "success"
        ? "success"
        : tone === "warning"
          ? "warning"
          : "danger";
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = getStatusTone(status);

  return (
    <Badge
      variant={tone}
      className={cn(
        "whitespace-nowrap",
        tone === "neutral" && "border-border/70 bg-white/75 text-muted",
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

function OrderTimeline({ order }: { order: OrderRecord }) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Track Shipment</p>
          <h2 className="mt-2 text-xl font-bold text-text">Live timeline</h2>
        </div>
        <Badge variant={order.trackingNumber ? "success" : "neutral"}>
          {order.trackingNumber ? "Tracking set" : "Awaiting dispatch"}
        </Badge>
      </div>

      <ol className="space-y-4" aria-label="Order timeline">
        {order.timeline.map((step, index) => {
          const Icon = TIMELINE_ICONS[step.icon] ?? Clock3;
          return (
            <li key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border",
                    step.active
                      ? "border-transparent bg-accent text-accent-foreground shadow-[var(--shadow-sm)]"
                      : "border-border/70 bg-background-secondary text-muted",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden={true} />
                </span>
                {index < order.timeline.length - 1 ? <span className="mt-2 h-full w-px bg-border" aria-hidden="true" /> : null}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-text">{step.status}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{step.timestamp}</p>
                </div>
                <p className="mt-1 text-sm font-medium leading-6 text-muted">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function OrdersBreadcrumb({ label }: { label: string }) {
  return (
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
            {label}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function OrdersPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden border-b border-border surface-warm", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-orange-300/10 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
    </section>
  );
}

function OrderTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-border/70 bg-white/85 p-2 shadow-[var(--shadow-sm)]">
      {ORDER_TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
              isActive
                ? "bg-accent text-accent-foreground shadow-[var(--shadow-sm)]"
                : "text-muted hover:bg-background-secondary hover:text-text",
            )}
            aria-pressed={isActive}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function OrderCard({ order }: { order: OrderRecord }) {
  return (
    <Card className="overflow-hidden rounded-[1.6rem] border-white/80 bg-white/92 shadow-[var(--shadow-lg)]">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-text">{order.orderNumber}</h3>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-muted">
              <span>Placed {order.placedAt}</span>
              {order.deliveredAt ? <span>Delivered {order.deliveredAt}</span> : null}
            </div>
          </div>
          <div className="rounded-full border border-border/70 bg-background-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {order.itemsCount} items
          </div>
        </div>

        <div className="space-y-3 rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Order items</p>
            <p className="mt-1 text-sm font-medium text-muted">Products from this order</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {order.items.map((item) => (
              <OrderLineItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/orders/${order.id}`}>
              View Details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function OrderLineItem({ item }: { item: OrderItem }) {
  return (
    <Link
      href={`/product/${item.slug}`}
      className="group block rounded-[1.2rem] border border-border/70 bg-white/95 p-3 transition-all hover:-translate-y-0.5 hover:border-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] bg-background-secondary">
          <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{item.brand}</p>
          <h4 className="line-clamp-2 text-sm font-bold leading-5 text-text">{item.name}</h4>
          <p className="text-xs font-medium text-muted">{item.variant}</p>
          {item.shadeName ? <div className="mt-2 flex items-center gap-2 rounded-lg bg-background-secondary/50 p-2"><span className="h-6 w-6 shrink-0 rounded-md border border-white" style={{ backgroundColor: item.shadeHexColor || "#cbd5e1" }} aria-hidden="true" /><span className="min-w-0 text-xs font-semibold text-text">{item.shadeName} · {item.shadeCode || "No code"}<span className="block font-medium text-muted">{[item.shadeFamily, item.baseName, item.finish, item.packSize].filter(Boolean).join(" · ")}</span></span></div> : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-text">{formatPrice(item.price)}</span>
            <Badge variant="neutral" className="text-[10px]">
              Qty {item.quantity}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}

function OrdersEmptyState({ onContinueShopping }: { onContinueShopping: () => void }) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-6 text-center shadow-[var(--shadow-lg)]">
      <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-accent/10 via-white to-sky-100/50">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/80 bg-white/90 shadow-[var(--shadow-lg)]">
          <ScrollText className="h-14 w-14 text-accent" aria-hidden="true" />
        </div>
      </div>
      <h3 className="mt-4 text-xl font-bold text-text">No Orders Yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-muted">
        Start shopping to see your order history, delivery timeline, and invoice tools here.
      </p>
      <div className="mt-5">
        <Button variant="accent" size="md" onClick={onContinueShopping}>
          Continue Shopping
        </Button>
      </div>
    </Card>
  );
}

function OrdersListSkeleton() {
  return (
    <OrdersPageShell>
      <div className="space-y-5">
        <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-5 w-96" />
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-14 w-full rounded-[1.4rem]" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_18rem]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-20 w-full rounded-[1.2rem]" />
                  <Skeleton className="h-28 w-full rounded-[1.2rem]" />
                  <Skeleton className="h-12 w-full rounded-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="aspect-square w-full rounded-[1.35rem]" />
                  <Skeleton className="h-24 w-full rounded-[1.35rem]" />
                  <Skeleton className="h-24 w-full rounded-[1.35rem]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </OrdersPageShell>
  );
}

function OrderDetailSkeleton() {
  return (
    <OrdersPageShell>
      <div className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="mt-3 h-5 w-80" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 rounded-[1.2rem]" />
                <Skeleton className="h-20 rounded-[1.2rem]" />
                <Skeleton className="h-20 rounded-[1.2rem]" />
                <Skeleton className="h-20 rounded-[1.2rem]" />
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <Skeleton className="h-6 w-40" />
              <div className="mt-4 space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-[1.2rem]" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <Skeleton className="h-64 w-full rounded-[1.6rem]" />
            <Skeleton className="h-44 w-full rounded-[1.6rem]" />
            <Skeleton className="h-44 w-full rounded-[1.6rem]" />
          </div>
        </div>
      </div>
    </OrdersPageShell>
  );
}

function OrdersListPage({ orders }: { orders: OrderRecord[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<OrderTab>("all");

  const filteredOrders = useMemo(() => {
    return [...orders]
      .filter((order) => activeTab === "all" || getOrderTab(order.status) === activeTab);
  }, [activeTab, orders]);

  return (
    <OrdersPageShell>
      <motion.main
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5"
      >
        <div className="px-1">
          <h1 className="text-xl font-black tracking-tight text-text">My Orders</h1>
        </div>

        <OrderTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {orders.length === 0 ? (
          <OrdersEmptyState onContinueShopping={() => window.location.assign("/products")} />
        ) : filteredOrders.length === 0 ? (
          <OrdersEmptyState onContinueShopping={() => window.location.assign("/products")} />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </motion.main>
    </OrdersPageShell>
  );
}

function OrderDetailPage({ order, roleKey }: { order: OrderRecord; roleKey: OrderAccessRole | null }) {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [liveOrder, setLiveOrder] = useState(order);
  const [liveSyncState, setLiveSyncState] = useState<"live" | "refreshing" | "offline">("live");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [returnRequests, setReturnRequests] = useState<OrderReturnRequest[]>([]);
  const [returnItem, setReturnItem] = useState<OrderItem | null>(null);
  const [returnReason, setReturnReason] = useState("Damaged product");
  const [returnPickupOption, setReturnPickupOption] = useState<ReturnPickupOption>("Home Pickup");
  const [returnPickupLocation, setReturnPickupLocation] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const expected = window.sessionStorage.getItem("checkout.navigationTarget");
    if (expected && expected === pathname) {
      console.debug("[checkout] router navigation complete", { pathname });
      window.sessionStorage.removeItem("checkout.navigationTarget");
    }
  }, [pathname]);

  useEffect(() => {
    setLiveOrder(order);
    setReturnRequests([]);
    setReturnItem(null);
  }, [order]);

  useEffect(() => {
    if (authLoading || !user?.id) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setLiveSyncState("offline");
      return;
    }

    let cancelled = false;

    const refreshOrder = async () => {
      setLiveSyncState("refreshing");
      const nextOrder = await loadOrderById(client, liveOrder.id, user.id, { roleKey });

      if (cancelled) {
        return;
      }

      if (nextOrder) {
        setLiveOrder(nextOrder);
        setLastSyncedAt(new Date());
        setLiveSyncState("live");
      } else {
        setLiveSyncState("offline");
      }
    };

    const refreshReturns = async () => {
      const nextReturns = await loadOrderReturnRequests(client, liveOrder.id, user.id, { roleKey });
      if (!cancelled) {
        setReturnRequests(nextReturns);
      }
    };

    void refreshOrder();
    void refreshReturns();

    const channel = client
      .channel(`order-live-${liveOrder.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${liveOrder.id}` },
        () => {
          void refreshOrder();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `order_id=eq.${liveOrder.id}` },
        () => {
          void refreshReturns();
        },
      )
      .subscribe();

    const timer = window.setInterval(() => {
      void refreshOrder();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void client.removeChannel(channel);
    };
  }, [authLoading, liveOrder.id, roleKey, user?.id]);

  const activeReturnRequestByProductId = useMemo(() => {
    return new Map(returnRequests.map((request) => [request.productId, request]));
  }, [returnRequests]);

  const pricing = useMemo(() => {
    return calculateCartPricing(
      liveOrder.items.map((item) => ({
        price: item.price,
        quantity: item.quantity,
        compareAtPrice: item.compareAtPrice ?? null,
      })),
      resolveCouponCode(liveOrder.couponApplied ?? ""),
    );
  }, [liveOrder.couponApplied, liveOrder.items]);

  const returnEligibilityByProductId = useMemo(() => {
    const entries = liveOrder.items.map((item) => {
      const itemKey = item.productId ?? item.id;
      const activeRequest = activeReturnRequestByProductId.get(itemKey) ?? null;
      const eligibility = getReturnEligibility(
        { status: liveOrder.status, deliveredAtRaw: liveOrder.deliveredAtRaw ?? null },
        item,
        activeRequest,
      );

      return [itemKey, eligibility] as const;
    });

    return new Map(entries);
  }, [activeReturnRequestByProductId, liveOrder.items, liveOrder.deliveredAtRaw, liveOrder.status]);

  const canCancelLiveOrder = canCancelOrder(liveOrder.status);

  const handleCancelOrder = async () => {
    if (!canCancelLiveOrder || cancellingOrder) {
      return;
    }

    const confirmed = window.confirm(`Cancel order ${liveOrder.orderNumber}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Cancel order unavailable", description: "Supabase is not configured.", variant: "danger" });
      return;
    }

    if (!user?.id) {
      toast({ title: "Cancel order unavailable", description: "Please sign in again to cancel this order.", variant: "danger" });
      return;
    }

    setCancellingOrder(true);
    const result = await cancelOrder(client, liveOrder.id);

    if (result.error) {
      toast({ title: "Unable to cancel order", description: result.error, variant: "danger" });
      setCancellingOrder(false);
      return;
    }

    const refreshedOrder = await loadOrderById(client, liveOrder.id, user.id, { roleKey });
    if (refreshedOrder) {
      setLiveOrder(refreshedOrder);
      setLastSyncedAt(new Date());
    }
    const refreshedReturns = await loadOrderReturnRequests(client, liveOrder.id, user.id, { roleKey });
    setReturnRequests(refreshedReturns);
    setCancellingOrder(false);

    toast({
      title: "Order cancelled",
      description: "The order was cancelled and will appear in the admin panel live.",
      variant: "success",
    });
  };

  const closeReturnModal = () => {
    setReturnItem(null);
    setReturnReason("Damaged product");
    setReturnPickupOption("Home Pickup");
    setReturnPickupLocation("");
    setReturnNotes("");
    setReturnSubmitting(false);
  };

  const submitReturnRequest = async () => {
    if (!returnItem) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Return request unavailable", description: "Supabase is not configured.", variant: "danger" });
      return;
    }

    setReturnSubmitting(true);
    const nextReason = returnReason.trim() || "Damaged product";
    const combinedReason = returnNotes.trim().length > 0 ? `${nextReason}. ${returnNotes.trim()}` : nextReason;
    const result = await createReturnRequest(client, {
      orderId: liveOrder.id,
      productId: returnItem.productId ?? returnItem.id,
      productName: returnItem.name,
      reason: combinedReason,
      pickupOption: returnPickupOption,
      pickupLocation: returnPickupLocation,
    });

    if (result.error) {
      toast({ title: "Unable to create return request", description: result.error, variant: "danger" });
      setReturnSubmitting(false);
      return;
    }

    toast({
      title: "Return request submitted",
      description: "Delivery charge remains non-refundable. We will update the ticket shortly.",
      variant: "success",
    });
    setReturnSubmitting(false);
    closeReturnModal();

    const refreshedReturns = await loadOrderReturnRequests(client, liveOrder.id, user?.id ?? null, { roleKey });
    setReturnRequests(refreshedReturns);
  };

  return (
    <OrdersPageShell>
      <motion.main
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5"
      >
        <OrdersBreadcrumb label="Order Details" />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{liveOrder.orderNumber}</h1>
                    <OrderStatusBadge status={liveOrder.status} />
                  </div>
                  <p className="text-sm font-medium text-muted">
                    Placed on {liveOrder.placedAt}
                    {liveOrder.deliveredAt ? ` - Delivered on ${liveOrder.deliveredAt}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                <span className="rounded-full border border-border/70 bg-background-secondary px-3 py-1">
                  {liveSyncState === "refreshing" ? "Refreshing live status" : liveSyncState === "offline" ? "Live sync offline" : "Live sync enabled"}
                </span>
                <span className="rounded-full border border-border/70 bg-background-secondary px-3 py-1">
                  {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : "Awaiting first sync"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {canCancelLiveOrder ? (
                  <Button type="button" variant="danger" size="md" onClick={() => void handleCancelOrder()} loading={cancellingOrder}>
                    Cancel Order
                  </Button>
                ) : liveOrder.status === "Shipped" || liveOrder.status === "Delivered" || liveOrder.status === "Out for Delivery" ? (
                  <Badge variant="warning" className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    Cancel not available after shipment
                  </Badge>
                ) : null}
              </div>
            </Card>

            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Items ordered</p>
                <h2 className="mt-2 text-xl font-bold text-text">Products</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {liveOrder.items.map((item) => (
                  (() => {
                    const itemKey = item.productId ?? item.id;
                    const activeRequest = activeReturnRequestByProductId.get(itemKey) ?? null;
                    const eligibility = returnEligibilityByProductId.get(itemKey);
                    const canOpenReturnModal = Boolean(eligibility?.eligible);
                    const returnStatus = activeRequest?.status ?? eligibility?.message ?? null;

                    return (
                      <OrderedProductCard
                        key={item.id}
                        item={item}
                        returnStatus={returnStatus}
                        returnable={canOpenReturnModal}
                        onReturn={canOpenReturnModal ? () => setReturnItem(item) : undefined}
                      />
                    );
                  })()
                ))}
              </div>
            </Card>

            {returnRequests.length > 0 ? (
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Returns</p>
                  <h2 className="mt-2 text-xl font-bold text-text">Return requests</h2>
                </div>
                <div className="space-y-3">
                  {returnRequests.map((request) => (
                    <div key={request.id} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-text">{request.productName}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{request.ticketNumber}</p>
                        </div>
                        <Badge variant="warning">{request.status}</Badge>
                      </div>
                      <p className="mt-3 text-sm font-medium leading-6 text-muted">{request.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">{request.pickupOption}</span>
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1 normal-case tracking-normal">{request.pickupLocation}</span>
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">{request.deliveryChargeNote}</span>
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">{request.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Price breakdown</p>
                <h2 className="mt-2 text-xl font-bold text-text">Billing</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3 rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
                  <p className="text-sm font-bold text-text">Shipping address</p>
                  <AddressBlock address={liveOrder.deliveryAddress} />
                </div>
              </div>
            </Card>

            <OrderTimeline order={liveOrder} />

            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Summary</p>
                <h2 className="mt-2 text-xl font-bold text-text">Order summary</h2>
              </div>
              <div className="space-y-2 text-sm font-medium text-muted">
                <Row label="Subtotal" value={formatPrice(pricing.subtotal)} />
                <Row label="Discount" value={`-${formatPrice(pricing.discount)}`} />
                <Row label="Coupon Discount" value={pricing.couponDiscount > 0 ? `-${formatPrice(pricing.couponDiscount)}` : formatPrice(0)} />
                <Row label="GST" value={formatPrice(pricing.gst)} />
                <Row label="Delivery Charges" value={pricing.shipping === 0 ? "Free" : formatPrice(pricing.shipping)} />
                <div className="border-t border-border/70 pt-3">
                  <Row label="Grand Total" value={formatPrice(pricing.grandTotal)} strong />
                </div>
              </div>
            </Card>

            {liveOrder.notes ? (
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Order notes</p>
                <p className="mt-2 text-sm font-medium leading-6 text-muted">{liveOrder.notes}</p>
              </Card>
            ) : null}
          </div>
        </div>

        <Modal
          open={Boolean(returnItem)}
          onOpenChange={(open) => {
            if (!open) {
              closeReturnModal();
            }
          }}
          title="Request return pickup"
          description="Tell us why you want to return this delivered item. Returns are allowed only within 5 days of delivery, and the delivery charge remains non-refundable."
        >
          <div className="space-y-4">
            <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Selected item</p>
              <p className="mt-1 text-sm font-bold text-text">{returnItem?.name ?? "Item"}</p>
              <p className="mt-1 text-xs font-medium text-muted">{returnItem?.variant}</p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitReturnRequest();
              }}
            >
              <FormField label="Return reason" htmlFor="return-reason">
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="Damaged product">Damaged product</option>
                  <option value="Wrong item received">Wrong item received</option>
                  <option value="Product is not needed">Product is not needed</option>
                  <option value="Quality issue">Quality issue</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>

              <FormField label="Pickup option" htmlFor="return-pickup">
                <select
                  id="return-pickup"
                  value={returnPickupOption}
                  onChange={(event) => setReturnPickupOption(event.target.value as ReturnPickupOption)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="Home Pickup">Home pickup</option>
                  <option value="Store Drop-off">Store drop-off</option>
                  <option value="Schedule Pickup">Schedule pickup</option>
                </select>
              </FormField>

              <FormField label="Pickup location" htmlFor="return-location" hint="Enter the address or drop-off point where we should collect the item.">
                <textarea
                  id="return-location"
                  value={returnPickupLocation}
                  onChange={(event) => setReturnPickupLocation(event.target.value)}
                  rows={3}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="Flat no., landmark, city, or store counter"
                />
              </FormField>

              <FormField label="Additional note" htmlFor="return-note" hint="Optional details for the pickup team.">
                <textarea
                  id="return-note"
                  value={returnNotes}
                  onChange={(event) => setReturnNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="Add any extra details"
                />
              </FormField>

              <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-3 text-xs font-semibold text-muted">
                Delivery charge is non-refundable. Return pickup is created as a support ticket and will be reviewed live.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" size="md" onClick={closeReturnModal} disabled={returnSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="accent" size="md" loading={returnSubmitting}>
                  Request return
                </Button>
              </div>
            </form>
          </div>
        </Modal>

      </motion.main>

    </OrdersPageShell>
  );
}

function OrderedProductCard({
  item,
  returnable,
  returnStatus,
  onReturn,
}: {
  item: OrderItem;
  returnable: boolean;
  returnStatus?: string | null;
  onReturn?: () => void;
}) {
  const hasShade = Boolean(item.shadeId || item.shadeName || item.shadeCode || item.shadeFamily || item.shadeHexColor || item.finish || item.packSize || item.baseName);

  return (
    <div className="space-y-2">
      <SharedProductCard mode="order" image={item.image} href={`/product/${item.slug}`} brand={item.brand} title={item.name} subtitle={item.variant} quantity={item.quantity} price={item.price} compareAtPrice={item.compareAtPrice} shadeName={item.shadeName} shadeCode={item.shadeCode} shadeFamily={item.shadeFamily} shadeHexColor={item.shadeHexColor} returnable={returnable} returnStatus={returnStatus} onReturn={onReturn} onBuyAgain={() => toast({ title: "Buy again", description: `Reorder for ${item.name} is ready for future wiring.` })} />
      {hasShade ? (
        <PaintConfiguration item={item} />
      ) : null}
    </div>
  );
}

function PaintConfiguration({ item }: { item: OrderItem }) {
  const copyShadeCode = async () => {
    if (!item.shadeCode) return;
    await navigator.clipboard?.writeText(item.shadeCode);
    toast({ title: "Shade code copied", description: item.shadeCode, variant: "success" });
  };

  const money = (value: number | null | undefined) => value === null || value === undefined ? "—" : formatPrice(value);

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black uppercase tracking-[0.16em] text-accent">🎨 Paint configuration</p>
        {item.shadeCode ? <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => void copyShadeCode()} aria-label={`Copy shade code ${item.shadeCode}`}><Copy className="h-3 w-3" />Copy</Button> : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><p className="font-semibold text-muted">Colour Family</p><p className="font-bold text-text">{item.shadeFamily || "—"}</p></div>
        <div><p className="font-semibold text-muted">Shade</p><div className="flex items-center gap-2"><span className="h-6 w-6 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: item.shadeHexColor || "#cbd5e1" }} aria-label={item.shadeHexColor ? `Shade colour ${item.shadeHexColor}` : "Neutral shade swatch"} role="img" /><p className="font-bold text-text">{item.shadeName || (item.shadeId ? "Shade information unavailable for this order" : "No shade selected")}<span className="block font-black tracking-wide text-accent">{item.shadeCode || ""}</span>{item.shadeHexColor ? <span className="block font-medium text-muted">{item.shadeHexColor}</span> : null}</p></div></div>
        <div><p className="font-semibold text-muted">Finish</p><p className="font-bold text-text">{item.finish || "—"}</p></div>
        <div><p className="font-semibold text-muted">Pack Size</p><p className="font-bold text-text">{item.packSize || "—"}</p></div>
        <div><p className="font-semibold text-muted">Quantity</p><p className="font-bold text-text">{item.quantity}</p></div>
        <div><p className="font-semibold text-muted">Shade Extra</p><p className="font-bold text-text">{item.shadeAdjustment === null || item.shadeAdjustment === undefined ? "—" : `+${money(item.shadeAdjustment)} / unit`}</p></div>
      </div>
      <div className="mt-3 border-t border-accent/15 pt-3">
        <p className="font-black uppercase tracking-[0.14em] text-muted">Historical pricing</p>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          <span>SP/Base Price <b className="float-right text-text">{money(item.basePrice)}</b></span>
          <span>Unit Price <b className="float-right text-text">{money(item.finalUnitPrice ?? item.price)}</b></span>
          <span>Taxable Value <b className="float-right text-text">{money(item.taxableValue)}</b></span>
          <span>GST {item.gstRate ? `(${item.gstRate}%)` : ""}<b className="float-right text-text">{money(item.gstAmount)}</b></span>
          <span>Line Total <b className="float-right text-text">{money(item.lineTotal ?? item.subtotal)}</b></span>
        </div>
      </div>
      {item.sku ? <p className="mt-2 font-medium text-muted">SKU: <span className="font-bold text-text">{item.sku}</span></p> : null}
    </div>
  );
}

function AddressBlock({
  address,
}: {
  address: OrderRecord["deliveryAddress"] | OrderRecord["billingAddress"];
}) {
  return (
    <div className="space-y-1.5 text-sm font-medium text-muted">
      <p className="font-bold text-text">{address.name}</p>
      <p>{address.line1}</p>
      <p>{address.line2}</p>
      <p>
        {address.city}, {address.state} {address.pincode}
      </p>
      {"phone" in address ? <p>{address.phone}</p> : null}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", strong && "text-text")}>
      <span className={cn("text-sm", strong ? "font-bold text-text" : "font-medium")}>{label}</span>
      <span className={cn("text-sm", strong ? "font-bold text-text" : "font-medium")}>{value}</span>
    </div>
  );
}

export {
  OrdersListPage,
  OrderDetailPage,
  OrdersListSkeleton,
  OrderDetailSkeleton,
  OrdersEmptyState,
  OrderStatusBadge,
};
