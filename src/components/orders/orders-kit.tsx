"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Download,
  LocateFixed,
  MessageCircleQuestion,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  ScrollText,
  FileText,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductShowcase } from "@/components/product/product-showcase";
import { cn, formatPrice } from "@/lib/utils";
import {
  ORDER_MUTABLE_STATUS_OPTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  type OrderMutableStatus,
  type OrderItem,
  type OrderRecord,
  type OrderSortMode,
  type OrderStatus,
  type OrderTab,
  getOrderTab,
  isOrderActive,
} from "@/lib/orders-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadOrderById, updateOrderStatus, updateOrderTrackingNumber, type OrderAccessRole } from "@/lib/order-service";
import type { Product } from "@/types";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const ORDER_TABS: Array<{ label: string; value: OrderTab }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Returned", value: "returned" },
];

const SORT_LABELS: Record<OrderSortMode, string> = {
  latest: "Latest",
  oldest: "Oldest",
  "amount-high": "Amount: High to Low",
  "amount-low": "Amount: Low to High",
  status: "Status",
};

const STATUS_FILTERS: OrderStatus[] = [
  "Pending",
  "Ordered",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
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

function OrdersHeader({
  title,
  subtitle,
  count,
  searchValue,
  onSearchChange,
  onOpenFilters,
  sort,
  onSortChange,
}: {
  title: string;
  subtitle: string;
  count: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  sort: OrderSortMode;
  onSortChange: (value: OrderSortMode) => void;
}) {
  return (
    <div className="space-y-5">
      <OrdersBreadcrumb label={title} />

      <div className="flex flex-col gap-4 rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="accent" className="eyebrow-font w-fit">
              Orders
            </Badge>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background-secondary px-3 py-1.5 text-sm font-semibold text-text">
              <Package className="h-4 w-4 text-accent" aria-hidden="true" />
              {count} total orders
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:max-w-lg lg:flex-1">
            <label className="relative block">
              <span className="sr-only">Search orders</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by order ID, product, or address"
                className="h-12 rounded-full border-border/80 bg-white/95 pl-11 shadow-[var(--shadow-sm)]"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
              <Button type="button" variant="outline" size="md" onClick={onOpenFilters} className="w-full sm:w-auto">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                Filter
              </Button>
              <label className="relative block">
                <span className="sr-only">Sort orders</span>
                <select
                  value={sort}
                  onChange={(event) => onSortChange(event.target.value as OrderSortMode)}
                  aria-label="Sort orders"
                  className="h-12 w-full appearance-none rounded-full border border-border/80 bg-white/95 px-4 pr-10 text-sm font-semibold text-text shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
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

function OrdersFilterModal({
  open,
  onOpenChange,
  selectedStatuses,
  onToggleStatus,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStatuses: OrderStatus[];
  onToggleStatus: (status: OrderStatus) => void;
  onClear: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Filter Orders"
      description="Narrow your order history by current order status."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => {
            const active = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => onToggleStatus(status)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border/70 bg-white text-text hover:border-accent/20",
                )}
              >
                {status}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function OrderActionRow({
  order,
}: {
  order: OrderRecord;
}) {
  const canReturn = order.status === "Delivered";
  const canCancel = isOrderActive(order.status);

  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3">
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={`/orders/${order.id}`}>
          View Details
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="w-full"
      >
        <Link href={`/orders/${order.id}#shipment-tracking`}>Track Shipment</Link>
      </Button>
      <Button
        type="button"
        variant="accent"
        size="sm"
        className="w-full"
        onClick={() => toast({ title: "Buy again ready", description: `We will re-add items from ${order.orderNumber} in a future phase.`, variant: "success" })}
      >
        Buy Again
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full border border-border/70 bg-white/75"
        onClick={() => toast({ title: "Invoice download", description: "Invoice PDF download is UI-only for now." })}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Invoice
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full border border-border/70 bg-white/75"
        onClick={() => toast({ title: "Support requested", description: "Customer support contact flow is ready for integration." })}
      >
        <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
        Help
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full border border-border/70 bg-white/75"
        disabled={!canReturn}
        onClick={() => toast({ title: "Return item", description: "Return flow is UI-only and will connect later.", variant: "warning" })}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Return
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="w-full"
        disabled={!canCancel}
        onClick={() => toast({ title: "Cancel order", description: "Order cancellation is a frontend placeholder.", variant: "danger" })}
      >
        <Ban className="h-4 w-4" aria-hidden="true" />
        Cancel
      </Button>
    </div>
  );
}

function OrderCard({ order }: { order: OrderRecord }) {
  const primaryItem = order.items[0];
  const secondaryItem = order.items[1];

  return (
    <Card className="overflow-hidden rounded-[1.6rem] border-white/80 bg-white/92 shadow-[var(--shadow-lg)]">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_18rem]">
        <div className="space-y-4">
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Order total</p>
              <p className="mt-1 text-lg font-bold text-text">{formatPrice(order.grandTotal)}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Payment</p>
              <p className="mt-1 text-sm font-bold text-text">{order.paymentMethod}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">{order.paymentStatus}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Delivery</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-text">
                {order.deliveryAddress.line1}, {order.deliveryAddress.city}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Reference</p>
              <p className="mt-1 text-sm font-bold text-text">{order.paymentReference}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Order items</p>
                <p className="mt-1 text-sm font-medium text-muted">Products from this order</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden rounded-full px-3 text-accent sm:inline-flex">
                <Link href={`/orders/${order.id}`}>View details</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[primaryItem, secondaryItem]
                .filter((item): item is OrderItem => Boolean(item))
                .map((item) => (
                  <OrderLineItem key={item.id} item={item} />
                ))}
            </div>
          </div>

          <OrderActionRow order={order} />
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-gradient-to-br from-background-secondary via-white to-white p-3 shadow-[var(--shadow-sm)]">
            <div className="grid grid-cols-2 gap-2">
              {order.items.slice(0, 4).map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-[1rem] bg-white">
                  <Image src={item.image} alt={item.name} width={320} height={320} className="aspect-square w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Delivery address</p>
            <div className="mt-3 space-y-1.5 text-sm font-medium text-muted">
              <p className="font-bold text-text">{order.deliveryAddress.name}</p>
              <p>{order.deliveryAddress.line1}</p>
              <p>{order.deliveryAddress.line2}</p>
              <p>
                {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}
              </p>
              <p>{order.deliveryAddress.phone}</p>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Summary</p>
            <div className="mt-3 space-y-2 text-sm font-medium text-muted">
              <div className="flex items-center justify-between gap-3">
                <span>Items</span>
                <span>{order.itemsCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Coupon</span>
                <span>-{formatPrice(order.couponDiscount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>GST</span>
                <span>{formatPrice(order.gst)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-border/70 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-text">Grand total</span>
                <span className="text-xl font-bold text-text">{formatPrice(order.grandTotal)}</span>
              </div>
            </div>
          </div>
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

function OrderTimeline({ order }: { order: OrderRecord }) {
  return (
    <Card id="timeline" className="rounded-[1.5rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Order timeline</p>
        <h2 className="mt-2 text-xl font-bold text-text">Progress</h2>
      </div>
      <ol className="space-y-4" aria-label="Order timeline">
        {order.timeline.map((step, index) => {
          const Icon = TIMELINE_ICONS[step.icon] as IconType;
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

function getShipmentProgress(order: OrderRecord) {
  const activeSteps = order.timeline.filter((step) => step.active).length;
  const totalSteps = Math.max(order.timeline.length, 1);
  const percentage = Math.max(8, Math.round((activeSteps / totalSteps) * 100));
  const currentStep = [...order.timeline].reverse().find((step) => step.active) ?? order.timeline[0] ?? null;

  return {
    percentage,
    currentStep,
  };
}

function ShipmentTrackingCard({ order }: { order: OrderRecord }) {
  const { percentage, currentStep } = getShipmentProgress(order);

  return (
    <Card id="shipment-tracking" className="rounded-[1.5rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Shipment tracking</p>
          <h2 className="mt-2 text-xl font-bold text-text">Live progress</h2>
        </div>
        <Badge variant={order.trackingNumber ? "success" : "neutral"}>{order.trackingNumber ? "Tracking set" : "Awaiting dispatch"}</Badge>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.25rem] border border-border/70 bg-background-secondary/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current status</p>
              <p className="mt-1 text-base font-bold text-text">{ORDER_STATUS_LABELS[order.status]}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Progress</p>
              <p className="mt-1 text-base font-bold text-text">{percentage}%</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#fdba74]" style={{ width: `${percentage}%` }} />
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-muted">
            {currentStep?.description ?? "Your shipment will appear here once admin updates the order."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-border/70 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Tracking number</p>
            <p className="mt-2 break-all text-sm font-bold text-text">{order.trackingNumber ?? "Not assigned yet"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border/70 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last update</p>
            <p className="mt-2 text-sm font-bold text-text">{order.deliveredAt ?? order.placedAt}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OrderSupportLinks() {
  const supportLinks = [
    { label: "Contact Support", icon: MessageCircleQuestion, description: "Talk to our team" },
    { label: "Return Policy", icon: RotateCcw, description: "Review return rules" },
    { label: "Track Shipment", icon: Truck, description: "See delivery progress" },
    { label: "Download Invoice", icon: FileText, description: "Get the billing copy" },
  ];

  return (
    <Card className="rounded-[1.5rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Need help?</p>
        <h2 className="mt-2 text-xl font-bold text-text">Support</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {supportLinks.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => toast({ title: item.label, description: `${item.description} is ready for future integration.` })}
              className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/85 px-4 py-3 text-left transition-all hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-text">{item.label}</span>
                <span className="block text-xs font-medium text-muted">{item.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
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

function buildProductSubset(_items: OrderItem[]): Product[] {
  return [];
}

function OrdersListPage({ orders }: { orders: OrderRecord[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<OrderSortMode>("latest");
  const [activeTab, setActiveTab] = useState<OrderTab>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        const matchesTab = activeTab === "all" || getOrderTab(order.status) === activeTab;
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
        const haystack = [
          order.orderNumber,
          order.deliveryAddress.name,
          order.deliveryAddress.line1,
          order.deliveryAddress.city,
          order.paymentMethod,
          order.status,
          ...order.items.map((item) => item.name),
        ]
          .join(" ")
          .toLowerCase();
        const matchesSearch = term.length === 0 || haystack.includes(term);
        return matchesTab && matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        switch (sort) {
          case "oldest":
            return Date.parse(left.placedAt) - Date.parse(right.placedAt);
          case "amount-high":
            return right.grandTotal - left.grandTotal;
          case "amount-low":
            return left.grandTotal - right.grandTotal;
          case "status":
            return left.status.localeCompare(right.status);
          case "latest":
          default:
            return Date.parse(right.placedAt) - Date.parse(left.placedAt);
        }
      });
  }, [activeTab, orders, search, selectedStatuses, sort]);

  const clearFilters = () => {
    setSelectedStatuses([]);
    setActiveTab("all");
  };

  const toggleStatus = (status: OrderStatus) => {
    setSelectedStatuses((current) => (current.includes(status) ? current.filter((item) => item !== status) : [...current, status]));
  };

  return (
    <OrdersPageShell>
      <motion.main
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5"
      >
        <OrdersHeader
          title="My Orders"
          subtitle="Track your purchase history, manage shipments, and revisit invoice, return, and support tools."
          count={orders.length}
          searchValue={search}
          onSearchChange={setSearch}
          onOpenFilters={() => setFiltersOpen(true)}
          sort={sort}
          onSortChange={setSort}
        />

        <OrderTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {orders.length === 0 ? (
          <OrdersEmptyState onContinueShopping={() => window.location.assign("/products")} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders matched your filters"
            description="Try a different search, change the tab, or clear the filters to see your full order history."
            actionLabel="Clear filters"
            onAction={clearFilters}
            secondaryActionLabel="Continue Shopping"
            onSecondaryAction={() => window.location.assign("/products")}
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </motion.main>

      <OrdersFilterModal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        onClear={clearFilters}
      />
    </OrdersPageShell>
  );
}

function canManageOrder(roleKey: OrderAccessRole | null | undefined) {
  return roleKey === "admin" || roleKey === "manager" || roleKey === "staff";
}

function OrderStatusUpdateCard({
  order,
  roleKey,
}: {
  order: OrderRecord;
  roleKey: OrderAccessRole | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [status, setStatus] = useState<OrderMutableStatus>(
    ORDER_MUTABLE_STATUS_OPTIONS.includes(order.status as OrderMutableStatus) ? (order.status as OrderMutableStatus) : "Confirmed",
  );
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");

  useEffect(() => {
    setStatus(ORDER_MUTABLE_STATUS_OPTIONS.includes(order.status as OrderMutableStatus) ? (order.status as OrderMutableStatus) : "Confirmed");
    setTrackingNumber(order.trackingNumber ?? "");
  }, [order.id, order.status, order.trackingNumber]);

  if (!canManageOrder(roleKey)) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      if (!client) {
        toast({ title: "Supabase unavailable", description: "Status updates need a connected Supabase client.", variant: "danger" });
        return;
      }

      const result = await updateOrderStatus(client, order.id, status, { roleKey });
      if (result.error) {
        toast({ title: "Unable to update status", description: result.error, variant: "danger" });
        return;
      }

      toast({ title: "Order status updated", description: `${order.orderNumber} is now marked as ${status}.`, variant: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTracking = async () => {
    setTrackingSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      if (!client) {
        toast({ title: "Supabase unavailable", description: "Tracking updates need a connected Supabase client.", variant: "danger" });
        return;
      }

      const result = await updateOrderTrackingNumber(client, order.id, trackingNumber, { roleKey });
      if (result.error) {
        toast({ title: "Unable to update tracking", description: result.error, variant: "danger" });
        return;
      }

      toast({
        title: "Tracking updated",
        description: trackingNumber.trim().length > 0 ? `${order.orderNumber} now has a tracking number.` : `${order.orderNumber} tracking number cleared.`,
        variant: "success",
      });
      router.refresh();
    } finally {
      setTrackingSaving(false);
    }
  };

  const dirty = status !== order.status;

  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Order control</p>
          <h2 className="mt-2 text-xl font-bold text-text">Update status</h2>
        </div>
        <Badge variant="neutral" className="shrink-0">
          Staff only
        </Badge>
      </div>
      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-muted">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderMutableStatus)}
            className="h-12 w-full rounded-[1rem] border border-border/70 bg-white px-4 text-sm font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Update order status"
          >
            {ORDER_MUTABLE_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm leading-6 text-muted">
          Updating the status will refresh the order timeline and keep the timestamps in sync automatically.
        </p>
        <Button type="button" variant="accent" size="md" className="w-full" loading={saving} disabled={saving || !dirty} onClick={() => void handleSave()}>
          Save status
        </Button>
      </div>

      <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Shipment</p>
          <h3 className="mt-2 text-lg font-bold text-text">Tracking number</h3>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-muted">Carrier / tracking ID</span>
          <Input
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="Enter tracking number"
            className="h-12 rounded-[1rem]"
            aria-label="Tracking number"
          />
        </label>
        <Button type="button" variant="outline" size="md" className="w-full" loading={trackingSaving} disabled={trackingSaving} onClick={() => void handleSaveTracking()}>
          Save tracking
        </Button>
      </div>
    </Card>
  );
}

function OrderDetailPage({ order, roleKey }: { order: OrderRecord; roleKey: OrderAccessRole | null }) {
  const shouldReduceMotion = useReducedMotion();
  const { user, loading: authLoading } = useAuth();
  const [liveOrder, setLiveOrder] = useState(order);
  const [liveSyncState, setLiveSyncState] = useState<"live" | "refreshing" | "offline">("live");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const recommendedProducts = useMemo(() => buildProductSubset(liveOrder.items), [liveOrder.items]);

  useEffect(() => {
    setLiveOrder(order);
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

    void refreshOrder();

    const channel = client
      .channel(`order-live-${liveOrder.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${liveOrder.id}` },
        () => {
          void refreshOrder();
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
                <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:w-auto lg:grid-cols-3">
                  <Button asChild variant="outline" size="sm" className="w-full justify-center">
                    <Link href={`/orders/${liveOrder.id}#shipment-tracking`}>
                      <Truck className="h-4 w-4" aria-hidden="true" />
                      Track Shipment
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => toast({ title: "Invoice download", description: "Invoice download is UI-only for now." })}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Invoice
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center border border-border/70 bg-white/75"
                    onClick={() => toast({ title: "Need help", description: "Support contact flow is available for future integration." })}
                  >
                    <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                    Help
                  </Button>
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
            </Card>

            <ShipmentTrackingCard order={liveOrder} />

            <OrderTimeline order={liveOrder} />

            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Items ordered</p>
                <h2 className="mt-2 text-xl font-bold text-text">Products</h2>
              </div>
              <div className="grid gap-4">
                {liveOrder.items.map((item) => (
                  <OrderedProductCard key={item.id} item={item} />
                ))}
              </div>
            </Card>

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
                <div className="space-y-3 rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
                  <p className="text-sm font-bold text-text">Billing address</p>
                  <AddressBlock address={liveOrder.billingAddress} />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <OrderStatusUpdateCard order={liveOrder} roleKey={roleKey} />

            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Summary</p>
                <h2 className="mt-2 text-xl font-bold text-text">Order summary</h2>
              </div>
              <div className="space-y-2 text-sm font-medium text-muted">
                <Row label="Subtotal" value={formatPrice(liveOrder.subtotal)} />
                <Row label="Discount" value={`-${formatPrice(liveOrder.discount)}`} />
                <Row label="Coupon Applied" value={liveOrder.couponApplied ?? "None"} />
                <Row label="Tracking Number" value={liveOrder.trackingNumber ?? "Not set"} />
                <Row label="GST" value={formatPrice(liveOrder.gst)} />
                <Row label="Delivery Charges" value={liveOrder.shipping === 0 ? "Free" : formatPrice(liveOrder.shipping)} />
                <div className="border-t border-border/70 pt-3">
                  <Row label="Grand Total" value={formatPrice(liveOrder.grandTotal)} strong />
                </div>
              </div>
            </Card>

            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Payment details</p>
                <h2 className="mt-2 text-xl font-bold text-text">Payment</h2>
              </div>
              <div className="space-y-2 text-sm font-medium text-muted">
                <Row label="Payment status" value={liveOrder.paymentStatus} />
                <Row label="Method" value={liveOrder.paymentMethod} />
                <Row label="Reference" value={liveOrder.paymentReference} />
                <Row label="Status" value={liveOrder.status} />
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

        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Support section</p>
            <h2 className="mt-2 text-xl font-bold text-text">Help</h2>
          </div>
          <OrderSupportLinks />
        </section>

        <div className="space-y-6">
          <ProductShowcase
            title="Recently Viewed"
            subtitle="Quick access to products you recently browsed in this shopping session."
            products={recommendedProducts.slice(0, 4)}
            viewAllHref="/products"
            badge="Recently Viewed"
          />
          <ProductShowcase
            title="Frequently Bought Together"
            subtitle="Useful add-on products that pair well with this order."
            products={[]}
            viewAllHref="/products"
            badge="Frequently Bought Together"
          />
          <ProductShowcase
            title="Recommended Products"
            subtitle="More options from the UniqueShopee catalog."
            products={[]}
            viewAllHref="/products"
            badge="Recommended"
          />
        </div>
      </motion.main>

      <div className="sticky inset-x-0 bottom-0 z-40 border-t border-border/70 bg-white/92 px-4 py-3 shadow-[0_-8px_30px_-20px_rgba(16,33,58,0.45)] backdrop-blur-sm lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/orders/${liveOrder.id}#timeline`}>
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Timeline
            </Link>
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="w-full"
            onClick={() => toast({ title: "Invoice download", description: "Download will be wired in a future phase." })}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Invoice
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full border border-border/70 bg-white/75"
            onClick={() => toast({ title: "Support", description: "Support contact is ready for future integration." })}
          >
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Help
          </Button>
        </div>
      </div>
    </OrdersPageShell>
  );
}

function OrderedProductCard({ item }: { item: OrderItem }) {
  const savePercent =
    item.compareAtPrice && item.compareAtPrice > item.price
      ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)
      : null;

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-white/95 shadow-[var(--shadow-sm)]">
      <div className="grid gap-3 p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <Link
          href={`/product/${item.slug}`}
          className="block overflow-hidden rounded-[1rem] bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="relative aspect-square w-full">
            <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 50vw, 7rem" className="object-cover" />
          </div>
        </Link>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{item.brand}</p>
              <Link href={`/product/${item.slug}`} className="block">
                <h3 className="line-clamp-2 text-sm font-bold leading-5 text-text">{item.name}</h3>
              </Link>
            </div>
            {savePercent ? <Badge variant="success">Save {savePercent}%</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-text">{formatPrice(item.price)}</span>
            <Badge variant="neutral" className="text-[10px]">
              Qty {item.quantity}
            </Badge>
            <Badge variant="accent" className="text-[10px]">
              {item.variant}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast({ title: "Buy again", description: `Reorder for ${item.name} is ready for future wiring.` })}
            >
              Buy Again
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="border border-border/70 bg-white/75"
              onClick={() => toast({ title: "Write review", description: "Review submission is UI-only for now." })}
            >
              Write Review
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="border border-border/70 bg-white/75"
              onClick={() => toast({ title: "Return item", description: "Return flow will connect in the next phase.", variant: "warning" })}
            >
              Return
            </Button>
          </div>
        </div>
      </div>
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
