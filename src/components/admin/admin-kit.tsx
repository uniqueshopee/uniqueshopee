"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FileText,
  Mail,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Megaphone,
  Factory,
  Menu,
  Package,
  PenSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Store,
  Tag,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Warehouse,
  X,
  SlidersHorizontal,
  RefreshCcw,
  Truck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadCloudinaryImage } from "@/lib/cloudinary";
import { getCurrentUserRoleKey } from "@/lib/supabase/auth";
import { cn, formatPrice } from "@/lib/utils";
import type { Json } from "@/lib/supabase/types";
import { isQaBypassEnabled } from "@/lib/qa-mode";
import {
  loadAdminBannerRows,
  loadAdminCouponRows,
  loadAdminCustomerRows,
  loadAdminDashboardData,
  loadAdminOrdersRows,
  loadAdminReturnRows,
  loadAdminReviewRows,
  loadAdminSettingsRows,
  upsertAdminSetting,
  type AdminDashboardData,
  type AdminSettingRow,
  type AdminBannerRow,
  type AdminCouponRow,
  type AdminCustomerRow,
  type AdminOrdersRow,
  type AdminReturnRow,
  type AdminReviewRow,
} from "@/lib/admin-service";
import { ORDER_MUTABLE_STATUS_OPTIONS } from "@/lib/orders-data";
import { updateOrderStatus } from "@/lib/order-service";
import { FREE_DELIVERY_SETTING_KEY, DEFAULT_FREE_DELIVERY_THRESHOLD, parseFreeDeliveryConfig } from "@/lib/delivery-service";

type AdminStat = {
  label: string;
  value: string;
  delta: string;
  note: string;
  tone: "accent" | "success" | "warning" | "neutral";
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Departments", href: "/admin/departments", icon: Factory },
  { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
  { label: "Brands", href: "/admin/brands", icon: Store },
  { label: "Shades", href: "/admin/shades", icon: Sparkles },
  { label: "Paint Bases", href: "/admin/paint-bases", icon: Sparkles },
  { label: "Paint Compatibility", href: "/admin/paint-compatibility", icon: SlidersHorizontal },
  { label: "Shade Pricing", href: "/admin/shade-pricing", icon: Tag },
  { label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { label: "Returns", href: "/admin/returns", icon: RefreshCcw },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "Offers", href: "/admin/offers", icon: Sparkles },
  { label: "Banners", href: "/admin/banners", icon: Megaphone },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Reports", href: "/admin/reports", icon: LineChart },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
  { label: "Delivery Pincodes", href: "/admin/delivery-pincodes", icon: Truck },
];

const NAV_META = {
  "/admin": { title: "Dashboard", subtitle: "Overview and performance" },
  "/admin/products": { title: "Products", subtitle: "Catalog management" },
  "/admin/departments": { title: "Departments", subtitle: "Department structure" },
  "/admin/categories": { title: "Categories", subtitle: "Hierarchy and structure" },
  "/admin/brands": { title: "Brands", subtitle: "Brand directory" },
  "/admin/shades": { title: "Shades", subtitle: "Shade catalog" },
  "/admin/paint-bases": { title: "Paint Bases", subtitle: "Tinting base management" },
  "/admin/paint-compatibility": { title: "Paint Compatibility", subtitle: "Product and finish shade mapping" },
  "/admin/shade-pricing": { title: "Shade Pricing", subtitle: "Paint pricing rules" },
  "/admin/orders": { title: "Orders", subtitle: "Order operations" },
  "/admin/returns": { title: "Returns", subtitle: "Return request management" },
  "/admin/inventory": { title: "Inventory", subtitle: "Stock control" },
  "/admin/customers": { title: "Customers", subtitle: "Customer records" },
  "/admin/reviews": { title: "Reviews", subtitle: "Moderation queue" },
  "/admin/coupons": { title: "Coupons", subtitle: "Offer management" },
  "/admin/offers": { title: "Offers", subtitle: "Exclusive product promotions" },
  "/admin/banners": { title: "Banners", subtitle: "Promo placements" },
  "/admin/notifications": { title: "Notifications", subtitle: "Customer notification delivery" },
  "/admin/reports": { title: "Reports", subtitle: "Sales and insights" },
  "/admin/settings": { title: "Settings", subtitle: "Store configuration" },
  "/admin/delivery-pincodes": { title: "Delivery Pincodes", subtitle: "Manage serviceable delivery areas" },
} as const;

const ACTION_LABELS = {
  edit: "Edit",
  delete: "Delete",
  duplicate: "Duplicate",
  view: "View",
  approve: "Approve",
  reject: "Reject",
  adjust: "Adjust Quantity",
} as const;

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

function statusVariant(status: string) {
  const value = status.toLowerCase();
  if (value.includes("draft") || value.includes("pending")) {
    return "warning" as const;
  }
  if (value.includes("inactive")) {
    return "warning" as const;
  }
  if (value.includes("deleted") || value.includes("archived")) {
    return "danger" as const;
  }
  if (value.includes("out") || value.includes("rejected") || value.includes("expired")) {
    return "danger" as const;
  }
  if (value.includes("disabled")) {
    return "warning" as const;
  }
  if (value.includes("active") || value.includes("approved") || value.includes("healthy") || value.includes("in stock")) {
    return "success" as const;
  }
  return "neutral" as const;
}

function AdminStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

function parseConsultationSummary(comment: string) {
  const lines = comment.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const getValue = (label: string) => {
    const line = lines.find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(label.length + 1).trim() : "";
  };

  return {
    name: getValue("Name"),
    phone: getValue("Phone"),
    slot: getValue("Preferred slot"),
    notes: getValue("Notes"),
  };
}

function toMutableOrderStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return ORDER_MUTABLE_STATUS_OPTIONS.find((option) => option.toLowerCase() === normalized) ?? "Pending";
}

function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
}: {
  crumbs: Array<{ label: string; href?: string }>;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
          {crumbs.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-2">
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-text focus-visible:text-text">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={index === crumbs.length - 1 ? "page" : undefined} className={index === crumbs.length - 1 ? "text-text" : undefined}>
                  {crumb.label}
                </span>
              )}
              {index < crumbs.length - 1 && <span aria-hidden="true">/</span>}
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="accent" className="eyebrow-font w-fit">
            Admin Console
          </Badge>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
      </div>
    </div>
  );
}

function AdminStatCard({ stat }: { stat: AdminStat }) {
  const toneClass =
    stat.tone === "accent"
      ? "bg-accent/10 text-accent"
      : stat.tone === "success"
        ? "bg-success/10 text-success"
        : stat.tone === "warning"
          ? "bg-warning/15 text-warning"
          : "bg-background-secondary text-text";

  return (
    <Card className="rounded-[1.35rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{stat.label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-text">{stat.value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", toneClass)}>
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Badge variant={stat.tone === "neutral" ? "neutral" : stat.tone}>{stat.delta}</Badge>
        <p className="text-xs font-medium text-muted">{stat.note}</p>
      </div>
    </Card>
  );
}

function AdminSectionCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-text">{title}</h2>
          {description ? <p className="mt-1 text-sm font-medium text-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

function AdminActionButton({
  children,
  variant = "outline",
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  variant?: "outline" | "accent";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant={variant} size="sm" onClick={onClick} disabled={disabled} className="w-full sm:w-auto">
      {children}
    </Button>
  );
}

function AdminLoadingView({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <Skeleton className="h-44 rounded-[1.6rem]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-[1.35rem]" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-[1.6rem]" />
      <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-5 w-80" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-[1.2rem]" />
          <Skeleton className="h-28 rounded-[1.2rem]" />
        </div>
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</div>
    </section>
  );
}

function ReturnRequestsTable({
  rows,
  loading,
}: {
  rows: AdminReturnRow[];
  loading: boolean;
}) {
  return loading ? (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-[1.2rem]" />
      ))}
    </div>
  ) : rows.length === 0 ? (
    <Card className="rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-5">
      <p className="text-sm font-medium text-muted">No return requests yet.</p>
    </Card>
  ) : (
    <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
      <table className="min-w-full divide-y divide-border/70">
        <thead className="bg-background-secondary/35">
          <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Pickup</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70 bg-white/80">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <div className="font-semibold text-text">{row.ticketNumber}</div>
                <div className="text-xs text-muted">{row.createdAt}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-text">{row.orderNumber}</div>
              </td>
              <td className="px-4 py-3 text-sm text-muted">{row.customer}</td>
              <td className="px-4 py-3 text-sm text-muted">
                <div className="max-w-[18rem]">
                  <p className="font-medium text-text">{row.product}</p>
                  <p className="mt-1 text-xs text-muted">{row.reason}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <AdminStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-sm text-muted">
                <div className="space-y-1">
                  <p className="font-medium text-text">{row.pickupOption}</p>
                  <p className="text-xs">{row.pickupLocation}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/orders/${row.orderId}`}>
                      <Eye className="h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast({
                        title: "Delivery charge note",
                        description: row.deliveryChargeNote,
                        variant: "success",
                      })
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Note
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, isAuthenticated, loading: authLoading, profile, role, user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    setProfileOpen(false);
    setDrawerOpen(false);
    await signOut();
    router.replace("/");
    router.refresh();
  };
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || role === "customer")) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isAuthenticated, pathname, role, router]);

  if (authLoading || !isAuthenticated || role === "customer") {
    return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm font-semibold text-muted">Verifying admin access…</div>;
  }

  const meta = NAV_META[(Object.keys(NAV_META) as Array<keyof typeof NAV_META>).find((key) => pathname === key || pathname.startsWith(`${key}/`)) ?? "/admin"];
  const mobileTitle = meta?.title ?? "Dashboard";

  const adminNavLinks = (
    <nav className="space-y-1" aria-label="Admin navigation">
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              "group flex items-center gap-3 rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-accent text-accent-foreground shadow-[var(--shadow-sm)]" : "text-text hover:bg-background-secondary",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          </Link>
        );
      })}
      <button
        type="button"
        className="mt-2 flex w-full items-center gap-3 rounded-[1rem] px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => void handleLogout()}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Logout
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,250,244,0.95),rgba(255,255,255,0.96))] text-text">
      <div className="relative">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border/70 bg-white/92 px-4 py-5 shadow-[var(--shadow-sm)] backdrop-blur-xl lg:block">
          <div className="flex h-full flex-col">
            <Link href="/admin" className="flex items-center gap-3 rounded-[1rem] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-accent via-[#fb923c] to-[#fdba74] text-white shadow-[var(--shadow-md)]">
                <Store className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">UniqueShopee Admin</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Professional SaaS Dashboard</p>
              </div>
            </Link>

            <div className="mt-5 rounded-[1.4rem] border border-border/70 bg-background-secondary/40 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Quick Search</p>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin" className="h-11 pl-9" aria-label="Quick search" />
              </div>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto pr-1">{adminNavLinks}</div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open admin navigation"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-text hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Admin Panel</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black text-text">{mobileTitle}</h2>
                  {isQaBypassEnabled() ? (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-warning">
                      QA Mode
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="hidden max-w-lg flex-1 lg:block">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, orders, customers..." className="h-11 pl-11" aria-label="Admin quick search" />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-text hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Notifications"
                  onClick={() => router.push("/admin/notifications")}
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hidden rounded-full border border-border/70 bg-white/80 px-4 py-2 text-sm font-semibold text-text hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:inline-flex"
                  onClick={() => setProfileOpen(true)}
                >
                  Admin Profile
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
            <motion.div
              className="mx-auto max-w-7xl space-y-6"
              initial={shouldReduceMotion ? false : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              variants={containerVariants}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      <Modal
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Admin Navigation"
        description="Browse dashboard sections"
        className="left-0 top-0 h-[100dvh] w-[min(90vw,20rem)] max-w-xs translate-x-0 translate-y-0 rounded-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex h-full flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-black text-text">UniqueShopee Admin</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Control Panel</p>
            </div>
            <button
              type="button"
              aria-label="Close admin navigation"
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-background-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mb-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin" aria-label="Search admin drawer" />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">{adminNavLinks}</div>
        </div>
      </Modal>

      <Modal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title="Admin Profile"
        description="Profile and store controls"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
            <p className="text-sm font-bold text-text">{profile?.full_name?.trim() || user?.email || "Admin"}</p>
            <p className="text-xs font-medium capitalize text-muted">{role || "Admin"}</p>
          </div>
          <div className="grid gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => { setProfileOpen(false); router.push("/admin/notifications"); }}>Notifications</Button>
            <Button type="button" variant="danger" size="md" onClick={() => void handleLogout()}>
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DashboardAdminPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError(null);

      const client = getSupabaseBrowserClient();
      if (!client) {
        if (active) {
          setDashboardError("Supabase is not configured for this environment.");
          setDashboardLoading(false);
        }
        return;
      }

      try {
        const nextDashboard = await loadAdminDashboardData(client);
        if (!active) return;
        setDashboard(nextDashboard);
      } catch (error) {
        if (!active) return;
        setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard data.");
      } finally {
        if (active) setDashboardLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stats = dashboard?.stats ?? [];
  const recentOrders = dashboard?.recentOrders ?? [];
  const topProducts = dashboard?.topProducts ?? [];
  const topCategories = dashboard?.topCategories ?? [];
  const recentReviews = dashboard?.recentReviews ?? [];
  const quickActions = [
    { label: "Create Product", href: "/admin/products", icon: Plus },
    { label: "Review Orders", href: "/admin/orders", icon: ClipboardList },
    { label: "Adjust Inventory", href: "/admin/inventory", icon: Warehouse },
    { label: "Launch Banner", href: "/admin/banners", icon: Megaphone },
  ];

  if (dashboardLoading) {
    return <AdminLoadingView title="Dashboard" />;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Dashboard" }]}
        title="Dashboard"
        subtitle="Monitor sales, orders, products, customers, and the latest store activity from one premium control center."
        actions={
          <>
            <AdminActionButton variant="accent" onClick={() => router.push("/admin/products")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Product
            </AdminActionButton>
          </>
        }
      />

      {dashboardError ? (
        <Card className="rounded-[1.35rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load dashboard</p>
          <p className="mt-1 text-sm font-medium text-muted">{dashboardError}</p>
        </Card>
      ) : null}

      <AdminSectionCard
        title="Quick Actions"
        description="Fast links for the most common mobile admin tasks."
        actions={<Badge variant="neutral" className="hidden sm:inline-flex">Mobile friendly</Badge>}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {quickActions.slice(0, 2).map((action) => {
            const Icon = action.icon;
            return (
              <Button asChild key={action.label} variant={action.label === "Create Product" ? "accent" : "outline"} size="md" className="w-full justify-between">
                <Link href={action.href}>
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            );
          })}
        </div>
      </AdminSectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <AdminSectionCard title="Quick Actions" description="Common admin shortcuts.">
          <div className="grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button asChild key={action.label} variant={action.label === "Create Product" ? "accent" : "outline"} size="md" className="w-full justify-between">
                  <Link href={action.href}>
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {action.label}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              );
            })}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSectionCard title="Recent Orders" description="Latest fulfilment activity." actions={<Badge variant="neutral">{recentOrders.length} orders</Badge>}>
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="text-sm">
                    <td className="px-4 py-3 font-semibold text-text">{order.id}</td>
                    <td className="px-4 py-3 text-muted">
                      <div className="font-semibold text-text">{order.customer}</div>
                      <div className="text-xs text-muted">{order.date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-text">{formatPrice(order.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Top Products" description="Best sellers by revenue.">
          <div className="space-y-3">
            {topProducts.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-[1.2rem] border border-border/70 bg-background-secondary/35 px-4 py-3">
                <div>
                  <p className="font-semibold text-text">{item.name}</p>
                  <p className="text-xs text-muted">{item.sales} orders</p>
                </div>
                <Badge variant="accent">{formatPrice(item.revenue)}</Badge>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSectionCard title="Top Categories" description="Category performance snapshot.">
          <div className="space-y-3">
            {topCategories.map((item) => (
              <div key={item.name} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-text">{item.name}</p>
                  <Badge variant="neutral">{item.share}%</Badge>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-gradient-to-r from-accent to-[#fdba74]" style={{ width: `${item.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Recent Reviews" description="Latest feedback awaiting moderation.">
          <div className="space-y-3">
            {recentReviews.map((review) => (
              <div key={review.customer} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{review.customer}</p>
                    <p className="text-xs text-muted">{review.product}</p>
                  </div>
                  <Badge variant={review.status.toLowerCase() === "pending" ? "warning" : "success"}>{review.status}</Badge>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/80 px-3 py-1 text-xs font-semibold text-text">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                  {review.rating.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </section>
  );
}

type CategoryRecord = {
  id: string;
  department_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DepartmentRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type CategoryFormState = {
  name: string;
  slug: string;
  departmentId: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
};

const CATEGORY_PAGE_SIZE = 6;

const CATEGORY_FORM_INITIAL: CategoryFormState = {
  name: "",
  slug: "",
  departmentId: "",
  description: "",
  imageUrl: "",
  isActive: true,
  sortOrder: "0",
};

function slugifyCategory(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function CategoriesAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "name" | "department">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(CATEGORY_FORM_INITIAL);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Pick<CategoryFormState, "name" | "slug" | "departmentId">, string>>>({});

  const departmentNameById = useMemo(() => new Map(departments.map((department) => [department.id, department.name])), [departments]);

  const loadCategories = async () => {
    setIsLoading(true);
    setLoadError(null);

    const client = getSupabaseBrowserClient();

    if (!client) {
      setLoadError("Supabase is not configured for this environment.");
      setIsLoading(false);
      return;
    }

    const [categoriesResult, departmentsResult] = await Promise.all([
      client
        .from("categories")
        .select("id, department_id, slug, name, description, image_url, is_active, sort_order, created_at, updated_at, deleted_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      client
        .from("departments")
        .select("id, name, slug, is_active, deleted_at")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (categoriesResult.error) {
      setLoadError(categoriesResult.error.message);
    } else {
      setCategories((categoriesResult.data ?? []) as CategoryRecord[]);
    }

    if (departmentsResult.error) {
      setLoadError(departmentsResult.error.message);
    } else {
      setDepartments((departmentsResult.data ?? []) as DepartmentRecord[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, sortDirection]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = categories.filter((category) => {
      if (!term) return true;
      const departmentName = departmentNameById.get(category.department_id) ?? "";
      return [category.name, category.slug, category.description ?? "", departmentName].join(" ").toLowerCase().includes(term);
    });

    const compareValues = {
      name: (left: CategoryRecord, right: CategoryRecord) => left.name.localeCompare(right.name),
      created_at: (left: CategoryRecord, right: CategoryRecord) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      updated_at: (left: CategoryRecord, right: CategoryRecord) => new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime(),
      department: (left: CategoryRecord, right: CategoryRecord) =>
        (departmentNameById.get(left.department_id) ?? "").localeCompare(departmentNameById.get(right.department_id) ?? ""),
    } satisfies Record<typeof sortBy, (left: CategoryRecord, right: CategoryRecord) => number>;

    return [...rows].sort((left, right) => {
      const result = compareValues[sortBy](left, right);
      return sortDirection === "asc" ? result : -result;
    });
  }, [categories, departmentNameById, search, sortBy, sortDirection]);

  const totalCategories = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalCategories / CATEGORY_PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleCategories = filteredCategories.slice((visiblePage - 1) * CATEGORY_PAGE_SIZE, visiblePage * CATEGORY_PAGE_SIZE);
  const activeCount = categories.filter((category) => category.is_active).length;
  const inactiveCount = categories.length - activeCount;
  const imageCount = categories.filter((category) => Boolean(category.image_url)).length;

  const resetForm = () => {
    setEditingCategory(null);
    setForm(CATEGORY_FORM_INITIAL);
    setFieldErrors({});
    setSlugTouched(false);
    setUploading(false);
  };

  const openCreateCategory = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditCategory = (category: CategoryRecord) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      departmentId: category.department_id,
      description: category.description ?? "",
      imageUrl: category.image_url ?? "",
      isActive: category.is_active,
      sortOrder: String(category.sort_order ?? 0),
    });
    setSlugTouched(true);
    setFieldErrors({});
    setDialogOpen(true);
  };

  const updateForm = (patch: Partial<CategoryFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugifyCategory(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    updateForm({ slug: value });
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    const result = await uploadCloudinaryImage(file);
    setUploading(false);

    if (result.error) {
      toast({ title: "Image upload failed", description: result.error, variant: "danger" });
      return;
    }

    updateForm({ imageUrl: result.url ?? "" });
    toast({ title: "Image uploaded", description: "Cloudinary URL is ready to save with the category.", variant: "success" });
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof Pick<CategoryFormState, "name" | "slug" | "departmentId">, string>> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required";
    }

    const normalizedSlug = slugifyCategory(form.slug || form.name);

    if (!normalizedSlug) {
      nextErrors.slug = "Slug is required";
    }

    if (!form.departmentId) {
      nextErrors.departmentId = "Department is required";
    }

    setFieldErrors(nextErrors);

    return { valid: Object.keys(nextErrors).length === 0, normalizedSlug };
  };

  const handleSubmit = async () => {
    if (!canManage) {
      toast({ title: "Permission denied", description: "Only admins and managers can manage categories.", variant: "danger" });
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      toast({ title: "Fix the highlighted fields", description: "Name, slug, and department are required.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Add the Supabase environment variables to enable category management.", variant: "danger" });
      return;
    }

    setSaving(true);

    try {
      const slugQuery = client.from("categories").select("id").eq("slug", validation.normalizedSlug).is("deleted_at", null);
      if (editingCategory) {
        slugQuery.neq("id", editingCategory.id);
      }

      const { data: duplicateRows, error: duplicateError } = await slugQuery.limit(1);
      if (duplicateError) {
        throw duplicateError;
      }

      if ((duplicateRows ?? []).length > 0) {
        setFieldErrors((current) => ({ ...current, slug: "Slug must be unique" }));
        toast({ title: "Duplicate slug", description: "Choose a different slug for this category.", variant: "warning" });
        setSaving(false);
        return;
      }

      const payload = {
        department_id: form.departmentId,
        name: form.name.trim(),
        slug: validation.normalizedSlug,
        description: form.description.trim() || null,
        image_url: form.imageUrl || null,
        is_active: form.isActive,
        sort_order: Number.parseInt(form.sortOrder, 10) || 0,
      };

      const operation = editingCategory
        ? client.from("categories").update(payload).eq("id", editingCategory.id)
        : client.from("categories").insert([payload]);

      const { error } = await operation;
      if (error) {
        throw error;
      }

      toast({
        title: editingCategory ? "Category updated" : "Category created",
        description: `${form.name.trim()} is now synced with Supabase.`,
        variant: "success",
      });

      setDialogOpen(false);
      resetForm();
      await loadCategories();
    } catch (error) {
      toast({
        title: editingCategory ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving the category.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category: CategoryRecord) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update category state right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("categories").update({ is_active: !category.is_active }).eq("id", category.id);

    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "danger" });
      return;
    }

    toast({
      title: category.is_active ? "Category deactivated" : "Category activated",
      description: category.name,
      variant: "success",
    });
    await loadCategories();
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot delete this category right now.", variant: "danger" });
      return;
    }

    const { error } = await client
      .from("categories")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", deleteTarget.id);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Category deleted", description: `${deleteTarget.name} was archived safely.`, variant: "success" });
    setDeleteTarget(null);
    await loadCategories();
  };

  const categoryStats = [
    { label: "Total Categories", value: String(categories.length), delta: `${totalCategories} visible`, note: "From Supabase", tone: "accent" as const },
    { label: "Active", value: String(activeCount), delta: `${Math.round((activeCount / Math.max(categories.length, 1)) * 100)}%`, note: "Live categories", tone: "success" as const },
    { label: "Inactive", value: String(inactiveCount), delta: "Needs review", note: "Disabled categories", tone: "warning" as const },
    { label: "With Images", value: String(imageCount), delta: "Cloudinary", note: "Image URLs saved", tone: "neutral" as const },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Categories" }]}
        title="Categories"
        subtitle="Create, edit, toggle, search, and delete catalog categories using live Supabase data."
        actions={
          <Button variant="accent" size="md" onClick={openCreateCategory} disabled={!canManage}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Category
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categoryStats.map((stat) => (
          <AdminStatCard
            key={stat.label}
            stat={{
              label: stat.label,
              value: stat.value,
              delta: stat.delta,
              note: stat.note,
              tone: stat.tone,
            }}
          />
        ))}
      </div>

      <AdminSectionCard
        title="Category Management"
        description="Search, sort, paginate, and manage categories in real time."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
            >
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={loadCategories} loading={isLoading}>
              Retry
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" aria-label="Search categories" />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Sort categories"
          >
            <option value="created_at">Newest</option>
            <option value="updated_at">Recently Updated</option>
            <option value="name">Name</option>
            <option value="department">Department</option>
          </select>
          <Button variant="accent" size="md" onClick={openCreateCategory} disabled={!canManage} className="w-full lg:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New
          </Button>
        </div>
      </AdminSectionCard>

      {loadError ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-text">Unable to load categories</p>
              <p className="mt-1 text-sm font-medium text-muted">{loadError}</p>
            </div>
            <Button variant="outline" size="md" onClick={loadCategories}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[1.4rem]" />
          ))}
        </div>
      ) : visibleCategories.length > 0 ? (
        <>
          <div className="grid gap-4 md:hidden">
            {visibleCategories.map((category) => {
              const departmentName = departmentNameById.get(category.department_id) ?? "Unknown department";

              return (
                <Card key={category.id} className="overflow-hidden rounded-[1.4rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
                  <div className="aspect-[16/10] bg-background-secondary/40">
                    {category.image_url ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${category.image_url}')` }}
                        role="img"
                        aria-label={category.name}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(255,246,236,0.8))] text-accent">
                        <LayoutGrid className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-text">{category.name}</p>
                        <p className="text-xs font-medium text-muted">{departmentName}</p>
                      </div>
                      <AdminStatusBadge status={category.is_active ? "Active" : "Inactive"} />
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-muted">{category.description || "No description provided."}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
                      <Badge variant="neutral">/{category.slug}</Badge>
                      <Badge variant="neutral">Sort {category.sort_order ?? 0}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditCategory(category)} disabled={!canManage}>
                        <PenSquare className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button variant={category.is_active ? "outline" : "accent"} size="sm" onClick={() => void toggleCategory(category)} disabled={!canManage}>
                        {category.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(category)} disabled={!canManage}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toast({ title: "Copy slug", description: `/${category.slug}`, variant: "success" })}>
                        Copy
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-[1.4rem] border border-border/70 bg-white/90 shadow-[var(--shadow-sm)] md:block">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {visibleCategories.map((category) => {
                  const departmentName = departmentNameById.get(category.department_id) ?? "Unknown department";

                  return (
                    <tr key={category.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-background-secondary/40">
                            {category.image_url ? (
                              <div
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url('${category.image_url}')` }}
                                role="img"
                                aria-label={category.name}
                              />
                            ) : (
                              <LayoutGrid className="h-5 w-5 text-accent" aria-hidden="true" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-text">{category.name}</p>
                            <p className="text-xs text-muted">{category.description || "No description"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{departmentName}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text">/{category.slug}</td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge status={category.is_active ? "Active" : "Inactive"} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{new Date(category.updated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditCategory(category)} disabled={!canManage}>
                            <PenSquare className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button variant={category.is_active ? "outline" : "accent"} size="sm" onClick={() => void toggleCategory(category)} disabled={!canManage}>
                            {category.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(category)} disabled={!canManage}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-[1.4rem] border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted">
              Showing {visibleCategories.length} of {totalCategories} categories
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1}>
                Prev
              </Button>
              <Badge variant="neutral">
                Page {visiblePage} of {totalPages}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={visiblePage >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
            <LayoutGrid className="h-9 w-9" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-2xl font-black text-text">No Categories Yet</h3>
          <p className="mt-2 text-sm font-medium text-muted">Create the first category to start organizing your catalog in Supabase.</p>
          <Button variant="accent" size="md" className="mt-6" onClick={openCreateCategory} disabled={!canManage}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Category
          </Button>
        </Card>
      )}

      <Modal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title={editingCategory ? "Edit Category" : "Create Category"}
        description="Save categories directly to Supabase with Cloudinary image URLs."
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="category-name" error={fieldErrors.name}>
              <Input id="category-name" value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Category name" />
            </FormField>
            <FormField label="Slug" htmlFor="category-slug" error={fieldErrors.slug}>
              <Input id="category-slug" value={form.slug} onChange={(event) => handleSlugChange(event.target.value)} placeholder="category-slug" />
            </FormField>
          </div>

          <FormField label="Department" htmlFor="category-department" error={fieldErrors.departmentId}>
            <select
              id="category-department"
              value={form.departmentId}
              onChange={(event) => updateForm({ departmentId: event.target.value })}
              className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Description" htmlFor="category-description" hint="Used for admin organization and future storefront placement.">
            <textarea
              id="category-description"
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              rows={4}
              className="min-h-28 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Category description"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <FormField label="Image" htmlFor="category-image">
              <div className="space-y-3 rounded-[1.2rem] border border-dashed border-border/70 bg-background-secondary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-white/85">
                    {form.imageUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${form.imageUrl}')` }}
                        role="img"
                        aria-label={form.name || "Category preview"}
                      />
                    ) : (
                      <LayoutGrid className="h-6 w-6 text-accent" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text">Upload a category image</p>
                    <p className="text-xs font-medium text-muted">Cloudinary stores the file and Supabase keeps the returned URL.</p>
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border/80 bg-white/85 px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-accent/25 hover:bg-white">
                  <span>{uploading ? "Uploading..." : "Choose Image"}</span>
                  <input
                    id="category-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
                    aria-label="Upload category image"
                  />
                </label>
              </div>
            </FormField>

            <div className="space-y-4">
              <FormField label="Image URL" htmlFor="category-image-url" hint="Stored in Supabase after Cloudinary upload completes.">
                <Input
                  id="category-image-url"
                  value={form.imageUrl}
                  onChange={(event) => updateForm({ imageUrl: event.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                />
              </FormField>

              <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm({ isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                Active category
              </label>

              <FormField label="Sort Order" htmlFor="category-sort-order" hint="Optional ordering for future admin usage.">
                <Input
                  id="category-sort-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm({ sortOrder: event.target.value })}
                  placeholder="0"
                />
              </FormField>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="accent" size="md" loading={saving} onClick={() => void handleSubmit()} disabled={!canManage}>
              {editingCategory ? "Update Category" : "Save Category"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Category"
        description="This will archive the category by setting a deleted timestamp."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted">
            {deleteTarget ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-text">{deleteTarget.name}</span>?
              </>
            ) : null}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="md" onClick={() => void confirmDeleteCategory()} disabled={!canManage}>
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

type BrandRecord = {
  id: string;
  department_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type BrandFormState = {
  name: string;
  slug: string;
  departmentId: string;
  categoryId: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  isActive: boolean;
  isFeatured: boolean;
};

const BRAND_PAGE_SIZE = 6;

const BRAND_FORM_INITIAL: BrandFormState = {
  name: "",
  slug: "",
  departmentId: "",
  categoryId: "",
  description: "",
  logoUrl: "",
  websiteUrl: "",
  isActive: true,
  isFeatured: false,
};

function slugifyBrand(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function BrandsAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "deleted">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "name" | "department" | "category" | "featured" | "status">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<BrandFormState>(BRAND_FORM_INITIAL);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "slug" | "departmentId" | "categoryId" | "websiteUrl", string>>>({});

  const departmentNameById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.department_id === form.departmentId && category.deleted_at === null),
    [categories, form.departmentId],
  );

  const loadBrands = async () => {
    setIsLoading(true);
    setLoadError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setLoadError("Supabase is not configured for this environment.");
      setIsLoading(false);
      return;
    }

    const [brandsResult, departmentsResult, categoriesResult] = await Promise.all([
      client
        .from("brands")
        .select("id, department_id, category_id, name, slug, description, logo_url, website_url, is_featured, is_active, created_at, updated_at, deleted_at")
        .order("created_at", { ascending: false }),
      client
        .from("departments")
        .select("id, name, slug, is_active, deleted_at")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      client
        .from("categories")
        .select("id, department_id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at, deleted_at")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (brandsResult.error) {
      setLoadError(brandsResult.error.message);
    } else {
      setBrands((brandsResult.data ?? []) as BrandRecord[]);
    }

    if (departmentsResult.error) {
      setLoadError(departmentsResult.error.message);
    } else {
      setDepartments((departmentsResult.data ?? []) as DepartmentRecord[]);
    }

    if (categoriesResult.error) {
      setLoadError(categoriesResult.error.message);
    } else {
      setCategories((categoriesResult.data ?? []) as CategoryRecord[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadBrands();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, sortDirection, statusFilter]);

  useEffect(() => {
    if (form.categoryId && !availableCategories.some((category) => category.id === form.categoryId)) {
      setForm((current) => ({ ...current, categoryId: "" }));
    }
  }, [availableCategories, form.categoryId]);

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = brands.filter((brand) => {
      const status = brand.deleted_at ? "deleted" : brand.is_active ? "active" : "inactive";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!term) return true;

      const departmentName = departmentNameById.get(brand.department_id) ?? "";
      const categoryName = brand.category_id ? categoryById.get(brand.category_id)?.name ?? "" : "";
      return [brand.name, brand.slug, brand.description ?? "", brand.website_url ?? "", departmentName, categoryName].join(" ").toLowerCase().includes(term);
    });

    const compareValues = {
      name: (left: BrandRecord, right: BrandRecord) => left.name.localeCompare(right.name),
      created_at: (left: BrandRecord, right: BrandRecord) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      updated_at: (left: BrandRecord, right: BrandRecord) => new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime(),
      department: (left: BrandRecord, right: BrandRecord) =>
        (departmentNameById.get(left.department_id) ?? "").localeCompare(departmentNameById.get(right.department_id) ?? ""),
      category: (left: BrandRecord, right: BrandRecord) =>
        (left.category_id ? categoryById.get(left.category_id)?.name ?? "" : "").localeCompare(right.category_id ? categoryById.get(right.category_id)?.name ?? "" : ""),
      featured: (left: BrandRecord, right: BrandRecord) => Number(left.is_featured) - Number(right.is_featured),
      status: (left: BrandRecord, right: BrandRecord) => {
        const leftStatus = left.deleted_at ? 2 : left.is_active ? 0 : 1;
        const rightStatus = right.deleted_at ? 2 : right.is_active ? 0 : 1;
        return leftStatus - rightStatus;
      },
    } satisfies Record<typeof sortBy, (left: BrandRecord, right: BrandRecord) => number>;

    return [...rows].sort((left, right) => {
      const result = compareValues[sortBy](left, right);
      return sortDirection === "asc" ? result : -result;
    });
  }, [brands, categoryById, departmentNameById, search, sortBy, sortDirection, statusFilter]);

  const totalBrands = filteredBrands.length;
  const totalPages = Math.max(1, Math.ceil(totalBrands / BRAND_PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleBrands = filteredBrands.slice((visiblePage - 1) * BRAND_PAGE_SIZE, visiblePage * BRAND_PAGE_SIZE);
  const activeCount = brands.filter((brand) => !brand.deleted_at && brand.is_active).length;
  const inactiveCount = brands.filter((brand) => !brand.deleted_at && !brand.is_active).length;
  const featuredCount = brands.filter((brand) => !brand.deleted_at && brand.is_featured).length;
  const deletedCount = brands.filter((brand) => Boolean(brand.deleted_at)).length;

  const resetForm = () => {
    setEditingBrand(null);
    setForm(BRAND_FORM_INITIAL);
    setFieldErrors({});
    setSlugTouched(false);
    setUploading(false);
  };

  const openCreateBrand = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditBrand = (brand: BrandRecord) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      departmentId: brand.department_id,
      categoryId: brand.category_id ?? "",
      description: brand.description ?? "",
      logoUrl: brand.logo_url ?? "",
      websiteUrl: brand.website_url ?? "",
      isActive: brand.is_active,
      isFeatured: brand.is_featured,
    });
    setSlugTouched(true);
    setFieldErrors({});
    setDialogOpen(true);
  };

  const updateForm = (patch: Partial<BrandFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugifyBrand(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    updateForm({ slug: value });
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    const result = await uploadCloudinaryImage(file);
    setUploading(false);

    if (result.error) {
      toast({ title: "Logo upload failed", description: result.error, variant: "danger" });
      return;
    }

    updateForm({ logoUrl: result.url ?? "" });
    toast({ title: "Logo uploaded", description: "Cloudinary URL is ready to save with the brand.", variant: "success" });
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<"name" | "slug" | "departmentId" | "categoryId" | "websiteUrl", string>> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Brand name is required";
    }

    const normalizedSlug = slugifyBrand(form.slug || form.name);
    if (!normalizedSlug) {
      nextErrors.slug = "Slug is required";
    }

    if (!form.departmentId) {
      nextErrors.departmentId = "Department is required";
    }

    if (!form.categoryId) {
      nextErrors.categoryId = "Category is required";
    }

    if (form.websiteUrl.trim()) {
      try {
        void new URL(form.websiteUrl.trim());
      } catch {
        nextErrors.websiteUrl = "Enter a valid website URL";
      }
    }

    setFieldErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, normalizedSlug };
  };

  const handleSubmit = async () => {
    if (!canManage) {
      toast({ title: "Permission denied", description: "Only admins and managers can manage brands.", variant: "danger" });
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      toast({ title: "Fix the highlighted fields", description: "Brand name, slug, department, and category are required.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Add Supabase environment variables to enable brand management.", variant: "danger" });
      return;
    }

    setSaving(true);

    try {
      const slugQuery = client.from("brands").select("id").eq("slug", validation.normalizedSlug).is("deleted_at", null);
      if (editingBrand) {
        slugQuery.neq("id", editingBrand.id);
      }

      const { data: duplicateRows, error: duplicateError } = await slugQuery.limit(1);
      if (duplicateError) throw duplicateError;

      if ((duplicateRows ?? []).length > 0) {
        setFieldErrors((current) => ({ ...current, slug: "Slug must be unique" }));
        toast({ title: "Duplicate slug", description: "Choose a different slug for this brand.", variant: "warning" });
        setSaving(false);
        return;
      }

      const payload = {
        department_id: form.departmentId,
        category_id: form.categoryId || null,
        name: form.name.trim(),
        slug: validation.normalizedSlug,
        description: form.description.trim() || null,
        logo_url: form.logoUrl || null,
        website_url: form.websiteUrl.trim() || null,
        is_featured: form.isFeatured,
        is_active: form.isActive,
        deleted_at: null,
      };

      const operation = editingBrand
        ? client.from("brands").update(payload).eq("id", editingBrand.id)
        : client.from("brands").insert([payload]);

      const { error } = await operation;
      if (error) throw error;

      toast({
        title: editingBrand ? "Brand updated" : "Brand created",
        description: `${form.name.trim()} is now synced with Supabase.`,
        variant: "success",
      });

      setDialogOpen(false);
      resetForm();
      await loadBrands();
    } catch (error) {
      toast({
        title: editingBrand ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving the brand.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleBrandActive = async (brand: BrandRecord) => {
    if (brand.deleted_at) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update brand state right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("brands").update({ is_active: !brand.is_active }).eq("id", brand.id);
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "danger" });
      return;
    }

    toast({
      title: brand.is_active ? "Brand deactivated" : "Brand activated",
      description: brand.name,
      variant: "success",
    });
    await loadBrands();
  };

  const toggleBrandFeatured = async (brand: BrandRecord) => {
    if (brand.deleted_at) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update featured state right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("brands").update({ is_featured: !brand.is_featured }).eq("id", brand.id);
    if (error) {
      toast({ title: "Featured update failed", description: error.message, variant: "danger" });
      return;
    }

    toast({
      title: brand.is_featured ? "Featured removed" : "Brand featured",
      description: brand.name,
      variant: "success",
    });
    await loadBrands();
  };

  const softDeleteBrand = async () => {
    if (!deleteTarget) return;

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot delete this brand right now.", variant: "danger" });
      return;
    }

    const { error } = await client
      .from("brands")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", deleteTarget.id);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Brand deleted", description: `${deleteTarget.name} was archived safely.`, variant: "success" });
    setDeleteTarget(null);
    await loadBrands();
  };

  const restoreBrand = async (brand: BrandRecord) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot restore this brand right now.", variant: "danger" });
      return;
    }

    const { error } = await client
      .from("brands")
      .update({ deleted_at: null, is_active: true })
      .eq("id", brand.id);

    if (error) {
      toast({ title: "Restore failed", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Brand restored", description: `${brand.name} is live again.`, variant: "success" });
    await loadBrands();
  };

  const statusLabel = (brand: BrandRecord) => {
    if (brand.deleted_at) return "Deleted";
    return brand.is_active ? "Active" : "Inactive";
  };

  const categoryNameFor = (brand: BrandRecord) => (brand.category_id ? categoryById.get(brand.category_id)?.name ?? "Unknown category" : "No category");

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Brands" }]}
        title="Brands"
        subtitle="Manage brand records, logos, featured state, and category relationships with live Supabase data."
        actions={
          <Button variant="accent" size="md" onClick={openCreateBrand} disabled={!canManage}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Brand
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard stat={{ label: "Total Brands", value: String(brands.length), delta: `${totalBrands} visible`, note: "From Supabase", tone: "accent" }} />
        <AdminStatCard stat={{ label: "Active", value: String(activeCount), delta: `${inactiveCount} inactive`, note: "Visible brands", tone: "success" }} />
        <AdminStatCard stat={{ label: "Featured", value: String(featuredCount), delta: "Curated", note: "Homepage-ready", tone: "neutral" }} />
        <AdminStatCard stat={{ label: "Deleted", value: String(deletedCount), delta: "Restore available", note: "Soft deleted only", tone: "warning" }} />
      </div>

      <AdminSectionCard
        title="Brand Management"
        description="Search, sort, page, and manage brands in one place."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}>
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={loadBrands} loading={isLoading}>
              Retry
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search brands" aria-label="Search brands" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Filter brands by status"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Sort brands"
          >
            <option value="created_at">Newest</option>
            <option value="updated_at">Recently Updated</option>
            <option value="name">Name</option>
            <option value="department">Department</option>
            <option value="category">Category</option>
            <option value="featured">Featured</option>
            <option value="status">Status</option>
          </select>
          <Button variant="accent" size="md" onClick={openCreateBrand} disabled={!canManage} className="w-full lg:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New
          </Button>
        </div>
      </AdminSectionCard>

      {loadError ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-text">Unable to load brands</p>
              <p className="mt-1 text-sm font-medium text-muted">{loadError}</p>
            </div>
            <Button variant="outline" size="md" onClick={loadBrands}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-60 rounded-[1.4rem]" />
          ))}
        </div>
      ) : visibleBrands.length > 0 ? (
        <>
          <div className="grid gap-4 md:hidden">
            {visibleBrands.map((brand) => {
              const departmentName = departmentNameById.get(brand.department_id) ?? "Unknown department";
              const status = statusLabel(brand);

              return (
                <Card key={brand.id} className="overflow-hidden rounded-[1.4rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
                  <div className="aspect-[16/10] bg-background-secondary/40">
                    {brand.logo_url ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${brand.logo_url}')` }}
                        role="img"
                        aria-label={brand.name}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(255,246,236,0.8))] text-accent">
                        <Store className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-text">{brand.name}</p>
                        <p className="text-xs font-medium text-muted">{departmentName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <AdminStatusBadge status={status} />
                        {brand.is_featured ? <Badge variant="accent">Featured</Badge> : null}
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-muted">{brand.description || "No description provided."}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
                      <Badge variant="neutral">/{brand.slug}</Badge>
                      <Badge variant="neutral">{categoryNameFor(brand)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditBrand(brand)} disabled={!canManage || Boolean(brand.deleted_at)}>
                        <PenSquare className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button variant={brand.deleted_at ? "outline" : "accent"} size="sm" onClick={() => void (brand.deleted_at ? restoreBrand(brand) : toggleBrandActive(brand))} disabled={!canManage}>
                        {brand.deleted_at ? "Restore" : brand.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void toggleBrandFeatured(brand)} disabled={!canManage || Boolean(brand.deleted_at)}>
                        {brand.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(brand)} disabled={!canManage || Boolean(brand.deleted_at)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-[1.4rem] border border-border/70 bg-white/90 shadow-[var(--shadow-sm)] md:block">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {visibleBrands.map((brand) => {
                  const departmentName = departmentNameById.get(brand.department_id) ?? "Unknown department";
                  const status = statusLabel(brand);

                  return (
                    <tr key={brand.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-background-secondary/40">
                            {brand.logo_url ? (
                              <div
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url('${brand.logo_url}')` }}
                                role="img"
                                aria-label={brand.name}
                              />
                            ) : (
                              <Store className="h-5 w-5 text-accent" aria-hidden="true" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-text">{brand.name}</p>
                            <p className="text-xs text-muted">{brand.description || "No description"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{departmentName}</td>
                      <td className="px-4 py-3 text-sm text-muted">{categoryNameFor(brand)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text">/{brand.slug}</td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">{brand.is_featured ? <Badge variant="accent">Featured</Badge> : <Badge variant="neutral">No</Badge>}</td>
                      <td className="px-4 py-3 text-sm text-muted">{new Date(brand.updated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditBrand(brand)} disabled={!canManage || Boolean(brand.deleted_at)}>
                            <PenSquare className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button variant={brand.deleted_at ? "outline" : "accent"} size="sm" onClick={() => void (brand.deleted_at ? restoreBrand(brand) : toggleBrandActive(brand))} disabled={!canManage}>
                            {brand.deleted_at ? "Restore" : brand.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void toggleBrandFeatured(brand)} disabled={!canManage || Boolean(brand.deleted_at)}>
                            {brand.is_featured ? "Unfeature" : "Feature"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(brand)} disabled={!canManage || Boolean(brand.deleted_at)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-[1.4rem] border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted">
              Showing {visibleBrands.length} of {totalBrands} brands
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1}>
                Prev
              </Button>
              <Badge variant="neutral">
                Page {visiblePage} of {totalPages}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={visiblePage >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Store className="h-9 w-9" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-2xl font-black text-text">No Brands Yet</h3>
          <p className="mt-2 text-sm font-medium text-muted">Create the first brand to start organizing your catalog in Supabase.</p>
          <Button variant="accent" size="md" className="mt-6" onClick={openCreateBrand} disabled={!canManage}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Brand
          </Button>
        </Card>
      )}

      <Modal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title={editingBrand ? "Edit Brand" : "Create Brand"}
        description="Save brand details directly to Supabase with a Cloudinary logo URL."
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Brand Name" htmlFor="brand-name" error={fieldErrors.name}>
              <Input id="brand-name" value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Brand name" />
            </FormField>
            <FormField label="Slug" htmlFor="brand-slug" error={fieldErrors.slug}>
              <Input id="brand-slug" value={form.slug} onChange={(event) => handleSlugChange(event.target.value)} placeholder="brand-slug" />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department" htmlFor="brand-department" error={fieldErrors.departmentId}>
              <select
                id="brand-department"
                value={form.departmentId}
                onChange={(event) => updateForm({ departmentId: event.target.value, categoryId: "" })}
                className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Category" htmlFor="brand-category" error={fieldErrors.categoryId}>
              <select
                id="brand-category"
                value={form.categoryId}
                onChange={(event) => updateForm({ categoryId: event.target.value })}
                disabled={!form.departmentId}
                className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{form.departmentId ? "Select category" : "Choose department first"}</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Description" htmlFor="brand-description" hint="Optional brand story or positioning copy.">
            <textarea
              id="brand-description"
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              rows={4}
              className="min-h-28 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Brand description"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <FormField label="Logo" htmlFor="brand-logo">
              <div className="space-y-3 rounded-[1.2rem] border border-dashed border-border/70 bg-background-secondary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-white/85">
                    {form.logoUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${form.logoUrl}')` }}
                        role="img"
                        aria-label={form.name || "Brand logo preview"}
                      />
                    ) : (
                      <Store className="h-6 w-6 text-accent" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text">Upload a brand logo</p>
                    <p className="text-xs font-medium text-muted">Cloudinary stores the file and Supabase keeps the returned URL.</p>
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border/80 bg-white/85 px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-accent/25 hover:bg-white">
                  <span>{uploading ? "Uploading..." : "Choose Logo"}</span>
                  <input
                    id="brand-logo"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleLogoUpload(event.target.files?.[0] ?? null)}
                    aria-label="Upload brand logo"
                  />
                </label>
              </div>
            </FormField>

            <div className="space-y-4">
              <FormField label="Logo URL" htmlFor="brand-logo-url" hint="Stored in Supabase after Cloudinary upload completes.">
                <Input id="brand-logo-url" value={form.logoUrl} onChange={(event) => updateForm({ logoUrl: event.target.value })} placeholder="https://res.cloudinary.com/..." />
              </FormField>

              <FormField label="Website" htmlFor="brand-website" error={fieldErrors.websiteUrl} hint="Optional brand website URL.">
                <Input
                  id="brand-website"
                  value={form.websiteUrl}
                  onChange={(event) => updateForm({ websiteUrl: event.target.value })}
                  placeholder="https://example.com"
                />
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateForm({ isActive: event.target.checked })}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  Active brand
                </label>
                <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) => updateForm({ isFeatured: event.target.checked })}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  Featured brand
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="accent" size="md" loading={saving} onClick={() => void handleSubmit()} disabled={!canManage}>
              {editingBrand ? "Update Brand" : "Save Brand"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Brand"
        description="This will archive the brand by setting a deleted timestamp."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted">
            {deleteTarget ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-text">{deleteTarget.name}</span>?
              </>
            ) : null}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="md" onClick={() => void softDeleteBrand()} disabled={!canManage}>
              Delete Brand
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function AdminOrderShadeSwatch({ item }: { item: AdminOrdersRow["items"][number] }) {
  const [open, setOpen] = useState(false);
  const hasShade = Boolean(item.shadeName || item.shadeCode || item.shadeFamily || item.shadeHexColor || item.finish || item.packSize);

  if (!hasShade) {
    return null;
  }

  return (
    <div className="relative flex min-w-0 items-start gap-2">
      <button type="button" className="h-6 w-6 rounded-full border-2 border-white shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ backgroundColor: item.shadeHexColor || "#cbd5e1" }} onClick={() => setOpen((current) => !current)} aria-label={`View shade ${item.shadeName || item.shadeCode || "details"}`} aria-expanded={open} />
      <span className="min-w-0 text-xs font-semibold text-text">
        <span className="block truncate">{item.shadeName || item.productName} {item.shadeCode ? `· ${item.shadeCode}` : ""}</span>
        <span className="block truncate font-medium text-muted">{[item.packSize, item.finish].filter(Boolean).join(" · ") || `Qty ${item.quantity}`} · Qty {item.quantity}</span>
      </span>
      {open ? (
        <div className="absolute left-0 top-8 z-30 w-48 rounded-xl border border-border/70 bg-white p-3 text-xs shadow-[var(--shadow-lg)]">
          <p className="font-bold text-text">{item.shadeName || "Selected shade"}</p>
          {item.shadeCode ? <p className="mt-0.5 font-medium text-muted">{item.shadeCode}</p> : null}
          {item.shadeFamily ? <p className="mt-1 font-medium text-muted">Colour: {item.shadeFamily}</p> : null}
          {item.shadeHexColor ? <p className="font-medium text-muted">HEX: {item.shadeHexColor}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function OrdersAdminPage() {
  const [rows, setRows] = useState<AdminOrdersRow[]>([]);
  const [returnRows, setReturnRows] = useState<AdminReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      const [nextRows, nextReturnRows] = await Promise.all([loadAdminOrdersRows(client, 50), loadAdminReturnRows(client, 50)]);
      setRows(nextRows);
      setReturnRows(nextReturnRows);
      setStatusDrafts(
        Object.fromEntries(nextRows.map((row) => [row.id, toMutableOrderStatus(row.status)])),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const channel = client
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void loadRows();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          void loadRows();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadRows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const term = search.trim().toLowerCase();
        if (term && ![row.orderNumber, row.customer, row.status, row.paymentStatus, row.trackingNumber, ...row.items.flatMap((item) => [item.productName, item.shadeName, item.shadeCode, item.shadeFamily])].filter(Boolean).join(" ").toLowerCase().includes(term)) return false;
        if (status !== "All" && row.status !== status) return false;
        return true;
      }),
    [rows, search, status],
  );
  const filteredReturnRows = useMemo(
    () =>
      returnRows.filter((row) => {
        const term = search.trim().toLowerCase();
        if (term && ![row.ticketNumber, row.orderNumber, row.customer, row.product, row.status, row.pickupOption, row.pickupLocation].join(" ").toLowerCase().includes(term)) return false;
        return true;
      }),
    [returnRows, search],
  );

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const paidCount = rows.filter((row) => row.paymentStatus === "paid").length;
  const returnCount = returnRows.length;

  const handleOrderStatusUpdate = async (row: AdminOrdersRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Status update failed", description: "Supabase is not configured.", variant: "danger" });
      return;
    }

    const roleKey = await getCurrentUserRoleKey(client);
    const nextStatus = toMutableOrderStatus(statusDrafts[row.id] ?? row.status);
    const { error: updateError } = await updateOrderStatus(client, row.id, nextStatus, { roleKey });

    if (updateError) {
      toast({ title: "Status update failed", description: updateError, variant: "danger" });
      return;
    }

    toast({ title: "Order updated", description: `${row.orderNumber} marked as ${nextStatus}.`, variant: "success" });
    await loadRows();
  };

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Orders" }]}
        title="Orders"
        subtitle="Track order status, payment state, customer details, and fulfilment notes from live Supabase data."
        actions={<AdminActionButton variant="outline" onClick={() => void loadRows()}><Download className="h-4 w-4" />Refresh</AdminActionButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard stat={{ label: "Orders", value: String(rows.length), delta: `${filteredRows.length} visible`, note: "Live order records", tone: "accent" }} />
        <AdminStatCard stat={{ label: "Pending", value: String(pendingCount), delta: "Needs attention", note: "Status = pending", tone: "warning" }} />
        <AdminStatCard stat={{ label: "Paid", value: String(paidCount), delta: "Collected", note: "Payment complete", tone: "success" }} />
        <AdminStatCard stat={{ label: "Returns", value: String(returnCount), delta: `${filteredReturnRows.length} visible`, note: "Return tickets", tone: "neutral" }} />
      </div>

      <AdminSectionCard title="Search & Filters" description="Search by order number, customer, tracking number, or status.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.6fr)_auto]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" aria-label="Search orders" />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Order status filter"
          >
            <option value="All">All</option>
            {Array.from(new Set(rows.map((row) => row.status))).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="md" onClick={() => void loadRows()} loading={loading} className="w-full lg:w-auto">
            Reload
          </Button>
        </div>
      </AdminSectionCard>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load orders</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
          <Button variant="outline" size="md" className="mt-4" onClick={() => void loadRows()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <AdminSectionCard title="Order Table" description="Real order records with payment and fulfilment details.">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[1.2rem]" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Products / Shades</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{row.orderNumber || row.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-muted">{row.placedAt}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{row.customer}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[22rem] space-y-2">
                        {row.items.length > 0 ? row.items.map((item, index) => (
                          <div key={`${row.id}-${item.productName}-${item.shadeCode ?? index}`} className="flex items-center gap-2 text-xs">
                            <AdminOrderShadeSwatch item={item} />
                            <span className="min-w-0 font-semibold text-text"><span className="block truncate">{item.productName}</span></span>
                          </div>
                        )) : <span className="text-xs font-medium text-muted">Items unavailable</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.status} /></td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.paymentStatus} /></td>
                    <td className="px-4 py-3 font-semibold text-text">{formatPrice(row.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <select
                          value={statusDrafts[row.id] ?? toMutableOrderStatus(row.status)}
                          onChange={(event) =>
                            setStatusDrafts((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                          className="h-10 rounded-[var(--radius-md)] border border-border bg-background px-3 text-xs font-semibold uppercase tracking-[0.12em] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          aria-label={`Update status for ${row.orderNumber}`}
                        >
                          {ORDER_MUTABLE_STATUS_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(row.orderNumber || row.id)}>
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/orders/${row.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        {row.trackingNumber ? (
                          <Button variant="outline" size="sm" onClick={() => toast({ title: "Tracking number", description: row.trackingNumber, variant: "success" })}>
                            <FileText className="h-4 w-4" />
                            Track
                          </Button>
                        ) : null}
                        <Button variant="accent" size="sm" onClick={() => void handleOrderStatusUpdate(row)}>
                          Update
                        </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Return Requests" description="Delivered order returns with pickup options and non-refundable delivery charge notes.">
        <ReturnRequestsTable rows={filteredReturnRows} loading={loading} />
      </AdminSectionCard>
    </section>
  );
}

function ReturnsAdminPage() {
  const [rows, setRows] = useState<AdminReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      setRows(await loadAdminReturnRows(client, 100));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load return requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const term = search.trim().toLowerCase();
        if (term && ![row.ticketNumber, row.orderNumber, row.customer, row.product, row.status, row.pickupOption, row.pickupLocation].join(" ").toLowerCase().includes(term)) return false;
        return true;
      }),
    [rows, search],
  );

  const pendingCount = rows.filter((row) => row.status.toLowerCase().includes("pending")).length;

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Returns" }]}
        title="Returns"
        subtitle="Review return tickets, pickup preferences, and delivery-charge notes from live Supabase data."
        actions={<AdminActionButton variant="outline" onClick={() => void loadRows()}><Download className="h-4 w-4" />Refresh</AdminActionButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard stat={{ label: "Returns", value: String(rows.length), delta: `${filteredRows.length} visible`, note: "Return tickets", tone: "neutral" }} />
        <AdminStatCard stat={{ label: "Pending", value: String(pendingCount), delta: "Needs review", note: "Waiting on admin action", tone: "warning" }} />
        <AdminStatCard stat={{ label: "Resolved", value: String(rows.length - pendingCount), delta: "Completed", note: "Processed returns", tone: "success" }} />
        <AdminStatCard stat={{ label: "Search", value: filteredRows.length ? "Active" : "None", delta: "Filtered list", note: "Search results", tone: "accent" }} />
      </div>

      <AdminSectionCard title="Search & Filters" description="Search by ticket, order number, customer, product, pickup option, or status.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_auto]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search returns" aria-label="Search returns" />
          <Button type="button" variant="outline" size="md" onClick={() => void loadRows()} loading={loading} className="w-full lg:w-auto">
            Reload
          </Button>
        </div>
      </AdminSectionCard>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load return requests</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
          <Button variant="outline" size="md" className="mt-4" onClick={() => void loadRows()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <AdminSectionCard title="Return Requests" description="Delivered order returns with pickup options and non-refundable delivery charge notes.">
        <ReturnRequestsTable rows={filteredRows} loading={loading} />
      </AdminSectionCard>
    </section>
  );
}

function CustomersAdminPage() {
  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      setRows(await loadAdminCustomerRows(client, 100));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((row) => [row.name, row.email, row.status].join(" ").toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  return (
    <section className="space-y-6">
      <PageHeader crumbs={[{ label: "Admin", href: "/admin" }, { label: "Customers" }]} title="Customers" subtitle="Search customer accounts and review order activity from live profiles." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard stat={{ label: "Customers", value: String(rows.length), delta: `${filteredRows.length} visible`, note: "Live profiles", tone: "accent" }} />
        <AdminStatCard stat={{ label: "Active Search", value: String(filteredRows.length), delta: "Matched rows", note: "Filtered customers", tone: "neutral" }} />
        <AdminStatCard stat={{ label: "Recent Join", value: rows[0]?.joined ?? "-", delta: "Latest profile", note: "Newest record", tone: "success" }} />
        <AdminStatCard stat={{ label: "Status", value: rows[0]?.status ?? "-", delta: "Latest", note: "Most recent customer", tone: "warning" }} />
      </div>

      <AdminSectionCard title="Customer Search" description="Quickly find customer records.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers" aria-label="Search customers" />
          <Button type="button" variant="outline" size="md" onClick={() => void loadRows()} loading={loading}>
            Reload
          </Button>
        </div>
      </AdminSectionCard>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load customers</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
        </Card>
      ) : null}

      <AdminSectionCard title="Customer Table" description="Order count, joined date, and status.">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[1.2rem]" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{row.name}</div>
                      <div className="text-xs text-muted">{row.email}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-text">{row.orders}</td>
                    <td className="px-4 py-3 text-sm text-muted">{row.joined}</td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => void window.open(`mailto:${row.email}`, "_blank")}>
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </section>
  );
}

function ReviewsAdminPage() {
  const [rows, setRows] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [kindFilter, setKindFilter] = useState<"all" | "reviews" | "consultations">("all");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      setRows(await loadAdminReviewRows(client, 50));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const channel = client
      .channel("admin-reviews-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => {
          void loadRows();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => {
          void loadRows();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadRows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const term = search.trim().toLowerCase();
        if (term && ![row.product, row.customer, row.comment, row.status].join(" ").toLowerCase().includes(term)) return false;
        if (status !== "All" && row.status !== status) return false;
        if (kindFilter === "reviews" && row.kind === "consultation") return false;
        if (kindFilter === "consultations" && row.kind !== "consultation") return false;
        return true;
      }),
    [kindFilter, rows, search, status],
  );

  const consultationCount = rows.filter((row) => row.kind === "consultation").length;
  const reviewCount = rows.length - consultationCount;

  const updateReview = async (row: AdminReviewRow, nextStatus: "approved" | "rejected" | "hidden") => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update reviews right now.", variant: "danger" });
      return;
    }

    const { error: updateError } = await client.from("reviews").update({ status: nextStatus }).eq("id", row.id);
    if (updateError) {
      toast({ title: "Review update failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({ title: "Review updated", description: `${row.customer} review marked as ${nextStatus}.`, variant: "success" });
    await loadRows();
  };

  const updateConsultation = async (row: AdminReviewRow, nextStatus: "contacted" | "completed" | "cancelled") => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update consultations right now.", variant: "danger" });
      return;
    }

    const { error: updateError } = await client.from("consultations").update({ status: nextStatus }).eq("id", row.id);
    if (updateError) {
      toast({ title: "Consultation update failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({ title: "Consultation updated", description: `${row.customer} marked as ${nextStatus}.`, variant: "success" });
    await loadRows();
  };

  return (
      <section className="space-y-6">
      <PageHeader crumbs={[{ label: "Admin", href: "/admin" }, { label: "Reviews" }]} title="Reviews" subtitle="Moderate live customer feedback and consultation requests from the admin console." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard stat={{ label: "All Entries", value: String(rows.length), delta: `${filteredRows.length} visible`, note: "Reviews + consultations", tone: "accent" }} />
        <AdminStatCard stat={{ label: "Consultations", value: String(consultationCount), delta: "Live leads", note: "Colour consultation requests", tone: "success" }} />
        <AdminStatCard stat={{ label: "Reviews", value: String(reviewCount), delta: "Product feedback", note: "Normal review rows", tone: "neutral" }} />
        <AdminStatCard stat={{ label: "Pending", value: String(rows.filter((row) => row.status === "Pending").length), delta: "Needs action", note: "Open moderation", tone: "warning" }} />
      </div>

      <AdminSectionCard title="Review Search" description="Filter by customer, product, comment, or status.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={kindFilter === "all" ? "accent" : "outline"} size="sm" onClick={() => setKindFilter("all")}>
              All
            </Button>
            <Button type="button" variant={kindFilter === "reviews" ? "accent" : "outline"} size="sm" onClick={() => setKindFilter("reviews")}>
              Reviews
            </Button>
            <Button type="button" variant={kindFilter === "consultations" ? "accent" : "outline"} size="sm" onClick={() => setKindFilter("consultations")}>
              Consultations
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)_auto]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews" aria-label="Search reviews" />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Review status filter"
          >
            <option value="All">All</option>
            {Array.from(new Set(rows.map((row) => row.status))).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="md" onClick={() => void loadRows()} loading={loading}>
            Reload
          </Button>
          </div>
        </div>
      </AdminSectionCard>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load reviews</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
        </Card>
      ) : null}

      <AdminSectionCard title="Review Queue" description="Real review moderation queue.">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-[1.2rem]" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      {row.kind === "consultation" ? (
                        <Badge variant="accent" className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                          Consultation
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/85 px-3 py-1 text-sm font-semibold text-text">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                          {row.rating.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      <div className="font-semibold text-text">{row.product}</div>
                      <div className="text-xs text-muted">{row.createdAt}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      <div className="font-semibold text-text">{row.customer}</div>
                      {row.kind === "consultation" ? (
                        <div className="mt-2 space-y-1 rounded-[1rem] border border-accent/15 bg-accent/5 p-3 text-xs text-muted">
                          {(() => {
                            const details = parseConsultationSummary(row.comment);
                            return (
                              <>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
                                    Consultation Lead
                                  </Badge>
                                  <Badge variant="neutral" className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
                                    Live Review
                                  </Badge>
                                </div>
                                <p className="font-semibold text-text">{details.name || row.customer}</p>
                                <p>Phone: {details.phone || "Not provided"}</p>
                                <p>Preferred slot: {details.slot || "Not provided"}</p>
                                {details.notes ? <p className="line-clamp-2">Notes: {details.notes}</p> : null}
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {row.kind === "consultation" ? (
                        <div className="space-y-2">
                          <Badge variant="success" className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                            Consultation Request
                          </Badge>
                          <div className="rounded-[1rem] border border-border/70 bg-white/85 p-3 text-xs leading-5 text-muted">
                            {(() => {
                              const details = parseConsultationSummary(row.comment);
                              return (
                                <>
                                  <p className="font-semibold text-text">Name: {details.name || row.customer}</p>
                                  <p>Phone: {details.phone || "Not provided"}</p>
                                  <p>Slot: {details.slot || "Not provided"}</p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <span className="line-clamp-2 block max-w-[18rem] text-xs leading-5">{row.comment || "No comment"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.kind === "consultation" ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => void updateConsultation(row, "contacted")}>
                              <ShieldCheck className="h-4 w-4" />
                              Contacted
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void updateConsultation(row, "completed")}>
                              <Check className="h-4 w-4" />
                              Complete
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => void updateConsultation(row, "cancelled")}>
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => void updateReview(row, "approved")}>
                              <ShieldCheck className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void updateReview(row, "rejected")}>
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => void updateReview(row, "hidden")}>
                              <Trash2 className="h-4 w-4" />
                              Hide
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </section>
  );
}

function CouponsAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [rows, setRows] = useState<AdminCouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    couponType: "percentage",
    value: "",
    minimumOrder: "0",
    maximumDiscount: "0",
    usageLimit: "",
    perUserLimit: "1",
    startAt: "",
    expiryAt: "",
    status: "active",
    appliesTo: "{}",
  });

  const resetForm = () => {
    setForm({
      code: "",
      title: "",
      description: "",
      couponType: "percentage",
      value: "",
      minimumOrder: "0",
      maximumDiscount: "0",
      usageLimit: "",
      perUserLimit: "1",
      startAt: "",
      expiryAt: "",
      status: "active",
      appliesTo: "{}",
    });
  };

  const parseDateInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      setRows(await loadAdminCouponRows(client, 100));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        [row.code, row.title, row.status, row.description, row.discount, row.appliesTo].join(" ").toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const toggleCoupon = async (row: AdminCouponRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update coupon state.", variant: "danger" });
      return;
    }

    const nextStatus = row.status.toLowerCase() === "active" ? "inactive" : "active";
    const { error: updateError } = await client.from("coupons").update({ status: nextStatus }).eq("id", row.id);
    if (updateError) {
      toast({ title: "Coupon update failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({ title: "Coupon updated", description: `${row.code} is now ${nextStatus}.`, variant: "success" });
    await loadRows();
  };

  const deleteCoupon = async (row: AdminCouponRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const { error: updateError } = await client.from("coupons").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (updateError) {
      toast({ title: "Coupon delete failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({ title: "Coupon archived", description: row.code, variant: "warning" });
    await loadRows();
  };

  const createCoupon = async () => {
    if (!canManage) {
      toast({ title: "Permission denied", description: "Only admins and managers can create coupons.", variant: "danger" });
      return;
    }

    const code = form.code.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    const value = Number.parseFloat(form.value);
    const minimumOrder = Number.parseFloat(form.minimumOrder || "0");
    const maximumDiscount = Number.parseFloat(form.maximumDiscount || "0");
    const perUserLimit = Number.parseInt(form.perUserLimit || "1", 10);
    const usageLimitRaw = form.usageLimit.trim();
    const usageLimit = usageLimitRaw ? Number.parseInt(usageLimitRaw, 10) : null;

    if (!code || !title || !Number.isFinite(value)) {
      toast({ title: "Fix coupon details", description: "Code, title, and discount value are required.", variant: "warning" });
      return;
    }

    let appliesTo: Record<string, unknown> = {};
    try {
      appliesTo = form.appliesTo.trim() ? (JSON.parse(form.appliesTo) as Record<string, unknown>) : {};
    } catch {
      toast({ title: "Invalid applies-to JSON", description: "Please enter valid JSON in the applies to field.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot create coupons right now.", variant: "danger" });
      return;
    }

    setSaving(true);

    try {
      const { data: duplicateRows, error: duplicateError } = await client
        .from("coupons")
        .select("id")
        .eq("code", code)
        .is("deleted_at", null)
        .limit(1);

      if (duplicateError) {
        throw duplicateError;
      }

      if ((duplicateRows ?? []).length > 0) {
        toast({ title: "Duplicate code", description: "A live coupon with this code already exists.", variant: "warning" });
        setSaving(false);
        return;
      }

      const { error: insertError } = await client.from("coupons").insert([
        {
          code,
          title,
          description: description || null,
          coupon_type: form.couponType,
          value,
          minimum_order: Number.isFinite(minimumOrder) ? minimumOrder : 0,
          maximum_discount: Number.isFinite(maximumDiscount) ? maximumDiscount : 0,
          usage_limit: usageLimit,
          per_user_limit: Number.isFinite(perUserLimit) && perUserLimit > 0 ? perUserLimit : 1,
          start_at: parseDateInput(form.startAt),
          expiry_at: parseDateInput(form.expiryAt),
          status: form.status,
          applies_to: appliesTo as Json,
          deleted_at: null,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      toast({ title: "Coupon created", description: `${code} is now synced with Supabase.`, variant: "success" });
      setCreateOpen(false);
      resetForm();
      await loadRows();
    } catch (createError) {
      toast({
        title: "Create failed",
        description: createError instanceof Error ? createError.message : "Something went wrong while saving the coupon.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Coupons" }]}
        title="Coupons"
        subtitle="Manage promotional offers using live coupon rows from Supabase."
        actions={
          <AdminActionButton
            variant="accent"
            onClick={() => setCreateOpen(true)}
            disabled={!canManage}
          >
            <Plus className="h-4 w-4" />
            Create Coupon
          </AdminActionButton>
        }
      />

      <AdminSectionCard title="Coupon Search" description="Search by code, title, status, or discount.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search coupons" aria-label="Search coupons" />
          <Button type="button" variant="outline" size="md" onClick={() => void loadRows()} loading={loading}>
            Reload
          </Button>
        </div>
      </AdminSectionCard>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load coupons</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
        </Card>
      ) : null}

      <AdminSectionCard title="Coupon Table" description="Status, expiry, usage limits, and quick actions.">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[1.2rem]" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{row.code}</div>
                      <div className="text-xs text-muted">{row.title}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{row.discount}</td>
                    <td className="px-4 py-3"><AdminStatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted">{row.expiry}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(row.code)}>
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void toggleCoupon(row)}>
                          <Settings2 className="h-4 w-4" />
                          Toggle
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => void deleteCoupon(row)}>
                          <Trash2 className="h-4 w-4" />
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Coupon"
        description="Add a promotional offer directly to Supabase."
        className="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Code" htmlFor="coupon-code">
            <Input id="coupon-code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="WELCOME10" />
          </FormField>
          <FormField label="Title" htmlFor="coupon-title">
            <Input id="coupon-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Welcome Offer" />
          </FormField>
          <FormField label="Discount Type" htmlFor="coupon-type">
            <select
              id="coupon-type"
              value={form.couponType}
              onChange={(event) => setForm((current) => ({ ...current, couponType: event.target.value }))}
              className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat</option>
            </select>
          </FormField>
          <FormField label="Value" htmlFor="coupon-value">
            <Input id="coupon-value" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="10" inputMode="decimal" />
          </FormField>
          <FormField label="Minimum Order" htmlFor="coupon-minimum">
            <Input id="coupon-minimum" value={form.minimumOrder} onChange={(event) => setForm((current) => ({ ...current, minimumOrder: event.target.value }))} placeholder="0" inputMode="decimal" />
          </FormField>
          <FormField label="Maximum Discount" htmlFor="coupon-max">
            <Input id="coupon-max" value={form.maximumDiscount} onChange={(event) => setForm((current) => ({ ...current, maximumDiscount: event.target.value }))} placeholder="0" inputMode="decimal" />
          </FormField>
          <FormField label="Usage Limit" htmlFor="coupon-usage">
            <Input id="coupon-usage" value={form.usageLimit} onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="Unlimited" inputMode="numeric" />
          </FormField>
          <FormField label="Per User Limit" htmlFor="coupon-per-user">
            <Input id="coupon-per-user" value={form.perUserLimit} onChange={(event) => setForm((current) => ({ ...current, perUserLimit: event.target.value }))} placeholder="1" inputMode="numeric" />
          </FormField>
          <FormField label="Status" htmlFor="coupon-status">
            <select
              id="coupon-status"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </FormField>
          <FormField label="Start Date" htmlFor="coupon-start">
            <Input
              id="coupon-start"
              type="date"
              value={form.startAt}
              onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
            />
          </FormField>
          <FormField label="Expiry Date" htmlFor="coupon-expiry">
            <Input
              id="coupon-expiry"
              type="date"
              value={form.expiryAt}
              onChange={(event) => setForm((current) => ({ ...current, expiryAt: event.target.value }))}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description" htmlFor="coupon-description">
              <textarea
                id="coupon-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="Short description of the offer"
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Applies To JSON" htmlFor="coupon-applies">
              <textarea
                id="coupon-applies"
                value={form.appliesTo}
                onChange={(event) => setForm((current) => ({ ...current, appliesTo: event.target.value }))}
                rows={4}
                className="min-h-28 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder='{"department_ids":[],"category_ids":[],"brand_ids":[]}'
              />
            </FormField>
          </div>
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="accent" size="md" onClick={() => void createCoupon()} loading={saving} disabled={!canManage}>
              Save Coupon
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function BannersAdminPage() {
  type BannerFormState = {
    title: string;
    slug: string;
    subtitle: string;
    placement: string;
    imageUrl: string;
    mobileImageUrl: string;
    linkUrl: string;
    sortOrder: string;
    isActive: boolean;
  };

  const BANNER_FORM_INITIAL: BannerFormState = {
    title: "",
    slug: "",
    subtitle: "",
    placement: "home_hero",
    imageUrl: "",
    mobileImageUrl: "",
    linkUrl: "",
    sortOrder: "0",
    isActive: true,
  };

  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [rows, setRows] = useState<AdminBannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"title" | "slug" | "imageUrl", string>>>({});
  const [form, setForm] = useState<BannerFormState>(BANNER_FORM_INITIAL);

  const resetForm = () => {
    setForm(BANNER_FORM_INITIAL);
    setSlugTouched(false);
    setFieldErrors({});
    setUploading(false);
  };

  const openCreateBanner = () => {
    resetForm();
    setCreateOpen(true);
  };

  const updateForm = (patch: Partial<BannerFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const slugifyBanner = (value: string) =>
    value
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/['"]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : slugifyBanner(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    updateForm({ slug: value });
  };

  const handleImageUpload = async (file: File | null, field: "imageUrl" | "mobileImageUrl") => {
    if (!file) return;

    setUploading(true);
    const result = await uploadCloudinaryImage(file);
    setUploading(false);

    if (result.error) {
      toast({ title: "Image upload failed", description: result.error, variant: "danger" });
      return;
    }

    updateForm({ [field]: result.url ?? "" } as Partial<BannerFormState>);
    toast({
      title: "Image uploaded",
      description: field === "imageUrl" ? "Desktop banner image is ready to save." : "Mobile banner image is ready to save.",
      variant: "success",
    });
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<"title" | "slug" | "imageUrl", string>> = {};
    const normalizedSlug = slugifyBanner(form.slug || form.title);

    if (!form.title.trim()) {
      nextErrors.title = "Banner title is required";
    }

    if (!normalizedSlug) {
      nextErrors.slug = "Slug is required";
    }

    if (!form.imageUrl.trim()) {
      nextErrors.imageUrl = "Banner image is required";
    }

    setFieldErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, normalizedSlug };
  };

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      setRows(await loadAdminBannerRows(client, 100));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load banners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const createBanner = async () => {
    if (!canManage) {
      toast({ title: "Permission denied", description: "Only admins and managers can create banners.", variant: "danger" });
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      toast({ title: "Fix the highlighted fields", description: "Title, slug, and desktop image are required.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot create banners right now.", variant: "danger" });
      return;
    }

    setSaving(true);

    try {
      const { data: duplicateRows, error: duplicateError } = await client
        .from("banners")
        .select("id")
        .eq("slug", validation.normalizedSlug)
        .is("deleted_at", null)
        .limit(1);

      if (duplicateError) {
        throw duplicateError;
      }

      if ((duplicateRows ?? []).length > 0) {
        setFieldErrors((current) => ({ ...current, slug: "Slug must be unique" }));
        toast({ title: "Duplicate slug", description: "Choose a different banner slug.", variant: "warning" });
        return;
      }

      const sortOrder = Number.parseInt(form.sortOrder || "0", 10);
      const payload = {
        slug: validation.normalizedSlug,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        placement: form.placement.trim() || "home_hero",
        image_url: form.imageUrl.trim(),
        mobile_image_url: form.mobileImageUrl.trim() || null,
        link_url: form.linkUrl.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_active: form.isActive,
        deleted_at: null,
      };

      const { error: insertError } = await client.from("banners").insert([payload]);
      if (insertError) {
        throw insertError;
      }

      toast({ title: "Banner created", description: `${form.title.trim()} is now synced with Supabase.`, variant: "success" });
      setCreateOpen(false);
      resetForm();
      await loadRows();
    } catch (createError) {
      toast({
        title: "Create failed",
        description: createError instanceof Error ? createError.message : "Something went wrong while saving the banner.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleBanner = async (row: AdminBannerRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const nextActive = row.status.toLowerCase() !== "active";
    const { error: updateError } = await client.from("banners").update({ is_active: nextActive }).eq("id", row.id);
    if (updateError) {
      toast({ title: "Banner update failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({ title: "Banner updated", description: `${row.title} is now ${nextActive ? "active" : "inactive"}.`, variant: "success" });
    await loadRows();
  };

  const archiveBanner = async (row: AdminBannerRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const { error: updateError } = await client.from("banners").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (updateError) {
      toast({ title: "Banner archive failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({ title: "Banner archived", description: row.title, variant: "warning" });
    await loadRows();
  };

  const bannerFaqs = [
    {
      question: "How do I add a new banner?",
      answer: "Click Add Banner, fill in the title, slug, and desktop image, then save. You can optionally add a mobile image and link URL.",
    },
    {
      question: "What should I use for placement?",
      answer: "Use the placement value to group banners by where they will appear later in the storefront. Keep the same value for related promos.",
    },
    {
      question: "Why is the slug important?",
      answer: "The slug should be unique. It is the stable key used by the admin and frontend to identify the banner row.",
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Banners" }]}
        title="Banners"
        subtitle="Manage promotional banners and placements using live Supabase records."
        actions={
          <div className="flex items-center gap-2">
            <AdminActionButton variant="outline" onClick={() => void loadRows()}>
              <RefreshCcw className="h-4 w-4" />
              Reload
            </AdminActionButton>
            <AdminActionButton variant="accent" onClick={openCreateBanner} disabled={!canManage}>
              <Plus className="h-4 w-4" />
              Add Banner
            </AdminActionButton>
          </div>
        }
      />

      <AdminSectionCard
        title="Banner Quick Start"
        description="A short guide for creating the first promo banner without leaving this page."
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.2rem] border border-border/70 bg-background-secondary/25 p-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">How to add a banner</p>
            <ol className="mt-4 space-y-3 text-sm font-medium leading-6 text-muted">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">1</span>
                <span>Click <span className="font-semibold text-text">Add Banner</span> from the page header.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">2</span>
                <span>Enter a title, unique slug, placement, and upload the desktop image.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">3</span>
                <span>Add optional subtitle, mobile image, and destination URL, then save.</span>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">FAQ</p>
            {bannerFaqs.map((faq) => (
              <details key={faq.question} className="rounded-[1.2rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
                <summary className="cursor-pointer list-none text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm font-medium leading-6 text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </AdminSectionCard>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load banners</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-[1.6rem]" />)}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <AdminSectionCard key={row.id} title={row.title} description={row.subtitle || row.placement} actions={<AdminStatusBadge status={row.status} />}>
              <div className="space-y-3">
                <div className="flex min-h-40 items-center justify-center rounded-[1.2rem] border border-dashed border-border bg-[linear-gradient(135deg,rgba(255,247,235,0.85),rgba(255,255,255,0.96))]">
                  <Megaphone className="h-8 w-8 text-accent" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-muted">{row.linkUrl || "No destination link set."}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void toggleBanner(row)} disabled={!canManage}>
                    {row.status.toLowerCase() === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => void archiveBanner(row)} disabled={!canManage}>
                    Archive
                  </Button>
                </div>
              </div>
            </AdminSectionCard>
          ))}
        </div>
      ) : (
        <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Megaphone className="h-9 w-9" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-2xl font-black text-text">No Banners Yet</h3>
          <p className="mt-2 text-sm font-medium text-muted">Create the first banner to start promoting offers and placements.</p>
          <Button variant="accent" size="md" className="mt-6" onClick={openCreateBanner} disabled={!canManage}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Banner
          </Button>
        </Card>
      )}

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title="Create Banner"
        description="Add a promotional banner directly to Supabase."
        className="max-w-5xl"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Title" htmlFor="banner-title" error={fieldErrors.title}>
              <Input id="banner-title" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="Big Festival Sale" />
            </FormField>
            <FormField label="Slug" htmlFor="banner-slug" error={fieldErrors.slug}>
              <Input id="banner-slug" value={form.slug} onChange={(event) => handleSlugChange(event.target.value)} placeholder="big-festival-sale" />
            </FormField>
          </div>

          <FormField label="Subtitle" htmlFor="banner-subtitle" hint="Optional short message under the title.">
            <Input
              id="banner-subtitle"
              value={form.subtitle}
              onChange={(event) => updateForm({ subtitle: event.target.value })}
              placeholder="Up to 50% off selected paints"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Placement" htmlFor="banner-placement" hint="Controls where the banner is surfaced later.">
              <Input
                id="banner-placement"
                value={form.placement}
                onChange={(event) => updateForm({ placement: event.target.value })}
                placeholder="home_hero"
              />
            </FormField>
            <FormField label="Sort Order" htmlFor="banner-sort-order" hint="Lower numbers appear first in placement ordering.">
              <Input
                id="banner-sort-order"
                type="number"
                value={form.sortOrder}
                onChange={(event) => updateForm({ sortOrder: event.target.value })}
                placeholder="0"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <FormField label="Desktop Image" htmlFor="banner-image" error={fieldErrors.imageUrl}>
              <div className="space-y-3 rounded-[1.2rem] border border-dashed border-border/70 bg-background-secondary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-white/85">
                    {form.imageUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${form.imageUrl}')` }}
                        role="img"
                        aria-label={form.title || "Banner preview"}
                      />
                    ) : (
                      <Megaphone className="h-6 w-6 text-accent" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text">Upload a banner image</p>
                    <p className="text-xs font-medium text-muted">Cloudinary stores the file and Supabase keeps the URL.</p>
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border/80 bg-white/85 px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-accent/25 hover:bg-white">
                  <span>{uploading ? "Uploading..." : "Choose Image"}</span>
                  <input
                    id="banner-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null, "imageUrl")}
                    aria-label="Upload banner image"
                  />
                </label>
              </div>
            </FormField>

            <div className="space-y-4">
              <FormField label="Desktop Image URL" htmlFor="banner-image-url" hint="Stored after Cloudinary upload completes.">
                <Input
                  id="banner-image-url"
                  value={form.imageUrl}
                  onChange={(event) => updateForm({ imageUrl: event.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                />
              </FormField>

              <FormField label="Mobile Image URL" htmlFor="banner-mobile-image-url" hint="Optional image for compact layouts.">
                <Input
                  id="banner-mobile-image-url"
                  value={form.mobileImageUrl}
                  onChange={(event) => updateForm({ mobileImageUrl: event.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                />
              </FormField>

              <FormField label="Link URL" htmlFor="banner-link-url" hint="Optional click-through destination.">
                <Input
                  id="banner-link-url"
                  value={form.linkUrl}
                  onChange={(event) => updateForm({ linkUrl: event.target.value })}
                  placeholder="/products"
                />
              </FormField>

              <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm({ isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                Active banner
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="accent" size="md" loading={saving} onClick={() => void createBanner()} disabled={!canManage}>
              Save Banner
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function ReportsAdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      setDashboard(await loadAdminDashboardData(client));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReportData();
  }, []);

  const stats = dashboard?.stats ?? [];
  const topProducts = dashboard?.topProducts ?? [];
  const topCategories = dashboard?.topCategories ?? [];
  const recentOrders = dashboard?.recentOrders ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]}
        title="Reports"
        subtitle="Live sales, order, category, and product summaries for the production admin console."
        actions={<AdminActionButton variant="outline" onClick={() => void loadReportData()}><Download className="h-4 w-4" />Download</AdminActionButton>}
      />

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load reports</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading ? Array.from({ length: 4 }, (_, index) => ({ label: `Metric ${index + 1}`, value: "-", delta: "", note: "", tone: "neutral" as const })) : stats).map((stat) => (
          <AdminStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSectionCard title="Recent Orders" description="Latest operational snapshot.">
          <div className="space-y-3">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-[1.2rem] border border-border/70 bg-background-secondary/35 px-4 py-3">
                <div>
                  <p className="font-semibold text-text">{order.id}</p>
                  <p className="text-xs text-muted">{order.customer}</p>
                </div>
                <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Top Products" description="Revenue leaders from live order data.">
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-[1.2rem] border border-border/70 bg-background-secondary/35 px-4 py-3">
                <div>
                  <p className="font-semibold text-text">{item.name}</p>
                  <p className="text-xs text-muted">{item.sales} orders</p>
                </div>
                <Badge variant="accent">{formatPrice(item.revenue)}</Badge>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSectionCard title="Top Categories" description="Category performance snapshot.">
          <div className="space-y-3">
            {topCategories.slice(0, 5).map((item) => (
              <div key={item.name} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-text">{item.name}</p>
                  <Badge variant="neutral">{item.share}%</Badge>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-gradient-to-r from-accent to-[#fdba74]" style={{ width: `${item.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Report Notes" description="Live dashboard data ready for exports or BI integration.">
          <div className="grid gap-3">
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.label} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{stat.label}</p>
                <p className="mt-1 text-lg font-black text-text">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-muted">{stat.note}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </section>
  );
}

function SettingsAdminPage() {
  const [rows, setRows] = useState<AdminSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(true);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(String(DEFAULT_FREE_DELIVERY_THRESHOLD));
  const [freeDeliveryFlatRate, setFreeDeliveryFlatRate] = useState(99);
  const [freeDeliverySaving, setFreeDeliverySaving] = useState(false);

  const loadSettings = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const nextRows = await loadAdminSettingsRows(client);
    setRows(nextRows);
    const deliverySetting = nextRows.find((row) => row.key === FREE_DELIVERY_SETTING_KEY);
    const deliveryConfig = parseFreeDeliveryConfig(deliverySetting?.value);
    setFreeDeliveryEnabled(deliveryConfig.enabled);
    setFreeDeliveryThreshold(String(deliveryConfig.threshold));
    setFreeDeliveryFlatRate(deliveryConfig.flatRate);
    setLoading(false);
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveSetting = async (row: AdminSettingRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Settings unavailable", description: "Supabase is not configured for this environment.", variant: "danger" });
      return;
    }

    setSavingKey(row.key);
    const result = await upsertAdminSetting(client, row.key, row.value, row.description, row.isPublic);
    setSavingKey(null);

    if (result.error) {
      toast({ title: "Setting not saved", description: result.error, variant: "danger" });
      return;
    }

    toast({ title: "Setting saved", description: row.key, variant: "success" });
    await loadSettings();
  };

  const createSetting = async () => {
    const key = newKey.trim();
    if (!key) {
      toast({ title: "Key required", description: "Enter a unique setting key.", variant: "danger" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Settings unavailable", description: "Supabase is not configured for this environment.", variant: "danger" });
      return;
    }

    setSavingKey(key);
    const result = await upsertAdminSetting(client, key, newValue, newDescription, newIsPublic);
    setSavingKey(null);

    if (result.error) {
      toast({ title: "Setting not created", description: result.error, variant: "danger" });
      return;
    }

    setNewKey("");
    setNewValue("");
    setNewDescription("");
    setNewIsPublic(false);
    toast({ title: "Setting created", description: key, variant: "success" });
    await loadSettings();
  };

  const saveFreeDelivery = async () => {
    const threshold = Number(freeDeliveryThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      toast({ title: "Threshold required", description: "Enter a positive free-delivery threshold.", variant: "danger" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) return;
    setFreeDeliverySaving(true);
    const result = await upsertAdminSetting(
      client,
      FREE_DELIVERY_SETTING_KEY,
      { enabled: freeDeliveryEnabled, free_over: Math.round(threshold * 100) / 100, flat_rate: freeDeliveryFlatRate },
      "Free-delivery eligibility used by checkout shipping and the cart progress banner.",
      true,
    );
    setFreeDeliverySaving(false);
    if (result.error) {
      toast({ title: "Free delivery not saved", description: result.error, variant: "danger" });
      return;
    }
    toast({ title: "Free delivery saved", description: `Free delivery above ${formatPrice(threshold)}.`, variant: "success" });
    await loadSettings();
  };

  const deleteSetting = async (row: AdminSettingRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    setSavingKey(row.key);
    const { error } = await client.from("settings").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    setSavingKey(null);

    if (error) {
      toast({ title: "Setting not deleted", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Setting deleted", description: row.key, variant: "warning" });
    await loadSettings();
  };

  if (loading) {
    return <AdminLoadingView title="Settings" />;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
        title="Settings"
        subtitle="Manage the live configuration keys that power your store, support channels, shipping, and business details."
        actions={
          <AdminActionButton variant="accent" onClick={() => document.getElementById("settings-new-key")?.focus()}>
            <ShieldCheck className="h-4 w-4" />
            New Setting
          </AdminActionButton>
        }
      />

      <AdminSectionCard title="Free Delivery" description="Configure the same threshold used by checkout shipping and the customer cart banner.">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex items-center gap-3 rounded-[1.2rem] border border-border bg-background-secondary/35 px-4 py-3 text-sm font-semibold text-text">
            <input type="checkbox" checked={freeDeliveryEnabled} onChange={(event) => setFreeDeliveryEnabled(event.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
            Enable Free Delivery
          </label>
          <FormField label="Minimum order for free delivery" htmlFor="free-delivery-threshold">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-semibold text-muted">₹</span>
              <Input id="free-delivery-threshold" type="number" min="1" step="0.01" value={freeDeliveryThreshold} onChange={(event) => setFreeDeliveryThreshold(event.target.value)} className="pl-8" />
            </div>
          </FormField>
          <Button type="button" variant="accent" size="md" loading={freeDeliverySaving} onClick={() => void saveFreeDelivery()}>Save changes</Button>
        </div>
        <p className="mt-3 text-sm font-medium text-muted">{freeDeliveryEnabled ? `Free delivery above ${formatPrice(Number(freeDeliveryThreshold) || DEFAULT_FREE_DELIVERY_THRESHOLD)}.` : "Free delivery is currently disabled."}</p>
      </AdminSectionCard>

      <AdminSectionCard title="Add Setting" description="Create a new key/value setting in Supabase.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Input id="settings-new-key" value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="store_support_email" aria-label="Setting key" />
          <Input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Support email used across the app" aria-label="Setting description" />
          <textarea
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            rows={4}
            className="min-h-28 rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent xl:col-span-2"
            placeholder='Plain text or JSON value'
          />
          <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-background-secondary/35 px-4 py-3 text-sm font-semibold text-text">
            <input type="checkbox" checked={newIsPublic} onChange={(event) => setNewIsPublic(event.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
            Public setting
          </label>
          <div className="xl:col-span-2 flex justify-end">
            <Button type="button" variant="accent" size="md" onClick={() => void createSetting()}>
              <Plus className="h-4 w-4" />
              Save Setting
            </Button>
          </div>
        </div>
      </AdminSectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <AdminSectionCard key={row.id} title={row.key} description={row.description || "Live setting from Supabase"}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.isPublic ? "success" : "neutral"}>{row.isPublic ? "Public" : "Private"}</Badge>
                <Badge variant="neutral">key</Badge>
              </div>
              <textarea
                value={row.value}
                onChange={(event) => setRows((current) => current.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)))}
                rows={6}
                className="min-h-32 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="accent" size="md" className="w-full" loading={savingKey === row.key} onClick={() => void saveSetting(row)}>
                  Save
                </Button>
                <Button type="button" variant="outline" size="md" className="w-full" onClick={() => void deleteSetting(row)} disabled={savingKey === row.key}>
                  Delete
                </Button>
              </div>
            </div>
          </AdminSectionCard>
        ))}
      </div>
    </section>
  );
}

export {
  ADMIN_NAV,
  ACTION_LABELS,
  AdminActionButton,
  AdminLoadingView,
  AdminSectionCard,
  AdminShell,
  AdminStatCard,
  AdminStatusBadge,
  BannersAdminPage,
  BrandsAdminPage,
  CategoriesAdminPage,
  CouponsAdminPage,
  CustomersAdminPage,
  DashboardAdminPage,
  OrdersAdminPage,
  PageHeader,
  ReportsAdminPage,
  ReviewsAdminPage,
  SettingsAdminPage,
  ReturnsAdminPage,
};
