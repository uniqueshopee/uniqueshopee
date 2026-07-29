"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gift,
  Heart,
  Info,
  Lock,
  Megaphone,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  Truck,
  WalletCards,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteNotification as deleteNotificationRow, loadLiveNotifications, markNotificationRead } from "@/lib/account-service";

type NotificationCategory = "Orders" | "Offers" | "Wishlist" | "Account" | "System";
type NotificationFilter = "All" | NotificationCategory;
type ReadFilter = "All" | "Unread" | "Read";
type SortFilter = "Newest" | "Oldest";
type NotificationAction = "View Order" | "View Product" | "Apply Coupon" | "Open Wishlist" | "Dismiss";
type NotificationItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  message: string;
  timestamp: string;
  createdAt: string;
  unread: boolean;
  icon?: typeof Bell;
  previewTitle?: string | null;
  previewSubtitle?: string | null;
  actionLabel?: NotificationAction;
  ctaLabel?: string;
  actionUrl?: string | null;
};

const CATEGORY_TABS: Array<NotificationFilter> = ["All", "Orders", "Offers", "Wishlist", "Account", "System"];
const READ_FILTERS: ReadFilter[] = ["All", "Unread", "Read"];
const SORT_FILTERS: SortFilter[] = ["Newest", "Oldest"];

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

function getCategoryVariant(category: NotificationCategory) {
  switch (category) {
    case "Orders":
      return "accent" as const;
    case "Offers":
      return "warning" as const;
    case "Wishlist":
      return "neutral" as const;
    case "Account":
      return "success" as const;
    case "System":
    default:
      return "neutral" as const;
  }
}

function getNotificationMeta(type: string) {
  switch (type) {
    case "Order Confirmed":
      return { tone: "success", icon: CheckCheck };
    case "Order Packed":
      return { tone: "accent", icon: PackageOpen };
    case "Order Shipped":
      return { tone: "accent", icon: Truck };
    case "Out for Delivery":
      return { tone: "warning", icon: Clock3 };
    case "Delivered":
      return { tone: "success", icon: PackageCheck };
    case "Cancelled":
      return { tone: "danger", icon: Trash2 };
    case "Refund Initiated":
      return { tone: "warning", icon: RefreshCcw };
    case "Price Drop":
      return { tone: "warning", icon: Tag };
    case "Wishlist Item Back in Stock":
      return { tone: "success", icon: Heart };
    case "Coupon Available":
      return { tone: "accent", icon: Gift };
    case "Flash Sale":
      return { tone: "accent", icon: Megaphone };
    case "Reward Points Earned":
      return { tone: "success", icon: WalletCards };
    case "Account Login":
      return { tone: "neutral", icon: Lock };
    case "Password Changed":
      return { tone: "neutral", icon: ShieldAlert };
    case "Security Alert":
    default:
      return { tone: "danger", icon: ShieldAlert };
  }
}

function NotificationBadge({ category }: { category: string }) {
  return <Badge variant={getCategoryVariant(category as NotificationCategory)}>{category}</Badge>;
}

function NotificationCard({
  item,
  expanded,
  onToggleExpanded,
  onMarkRead,
  onDelete,
  onPrimaryAction,
}: {
  item: NotificationItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onPrimaryAction: () => void;
}) {
  const meta = getNotificationMeta(item.type);
  const Icon = item.icon ?? meta.icon;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[1.45rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]",
        item.unread && "border-accent/20",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem]",
              meta.tone === "success" && "bg-success/10 text-success",
              meta.tone === "warning" && "bg-warning/15 text-warning",
              meta.tone === "danger" && "bg-danger/10 text-danger",
              meta.tone === "accent" && "bg-accent/10 text-accent",
              meta.tone === "neutral" && "bg-background-secondary text-text",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-text">{item.title}</h3>
                  {item.unread && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="Unread notification" />}
                </div>
                <p className="text-sm font-medium text-muted">{item.description}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background-secondary px-2.5 py-1 text-[11px] font-semibold text-muted">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {item.timestamp}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <NotificationBadge category={item.category} />
              <Badge variant={item.unread ? "accent" : "neutral"}>{item.type}</Badge>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={onToggleExpanded} className="w-full sm:w-auto">
                {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                {expanded ? "Hide Details" : "View Details"}
              </Button>
              {item.actionLabel && (
                <Button type="button" variant="ghost" size="sm" className="w-full border border-border/70 bg-white/75 sm:w-auto" onClick={onPrimaryAction}>
                  {item.actionLabel}
                </Button>
              )}
              <Button type="button" variant={item.unread ? "accent" : "outline"} size="sm" onClick={onMarkRead} className="w-full sm:w-auto">
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Mark as Read
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full border border-border/70 bg-white/75 sm:w-auto" onClick={onDelete}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
            <p className="text-sm font-medium leading-6 text-text">{item.message}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                {item.previewTitle && <p className="text-sm font-bold text-text">{item.previewTitle}</p>}
                {item.previewSubtitle && <p className="text-xs font-medium text-muted">{item.previewSubtitle}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="accent" size="sm" onClick={onPrimaryAction}>
                  {item.ctaLabel ?? item.actionLabel ?? "Open"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onToggleExpanded}>
                  Collapse
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function NotificationSkeletonCard() {
  return (
    <Card className="overflow-hidden rounded-[1.45rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
      <div className="space-y-4 p-5">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-[1rem]" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-40 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function NotificationsSkeleton() {
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
              <Skeleton className="h-5 w-72" />
              <div className="flex gap-2">
                <Skeleton className="h-12 w-40 rounded-full" />
                <Skeleton className="h-12 w-40 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-[1.4rem]" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-[1.1rem]" />
            ))}
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <NotificationSkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NotificationsEmptyState({ onHome }: { onHome: () => void }) {
  return (
    <EmptyState
      title="No Notifications Yet"
      description="You are all caught up. New order updates, offers, and account alerts will appear here."
      actionLabel="Return to Home"
      onAction={onHome}
    />
  );
}

function NotificationsPage() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { profile, user } = useAuth();
  const accountId = profile?.id ?? user?.id ?? null;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationFilter>("All");
  const [readFilter, setReadFilter] = useState<ReadFilter>("All");
  const [sortFilter, setSortFilter] = useState<SortFilter>("Newest");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void loadLiveNotifications(client, accountId).then((nextItems) => {
      if (!active) {
        return;
      }
      setItems(
        nextItems.map((item) => ({
          id: item.id,
          type: item.type,
          category: item.category,
          title: item.title,
          description: item.previewSubtitle ?? item.message,
          message: item.message,
          timestamp: item.timestamp,
          createdAt: item.createdAt,
          unread: item.unread,
          icon: undefined,
          previewTitle: item.previewTitle,
          previewSubtitle: item.previewSubtitle,
          actionLabel: item.actionLabel ? (item.actionLabel as NotificationAction) : undefined,
          ctaLabel: item.actionLabel ?? undefined,
          actionUrl: item.actionUrl,
        })),
      );
      setExpandedId(nextItems[0]?.id ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [accountId]);

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...items]
      .filter((item) => (activeTab === "All" ? true : item.category === activeTab))
      .filter((item) => {
        if (readFilter === "Unread") return item.unread;
        if (readFilter === "Read") return !item.unread;
        return true;
      })
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [item.title, item.description, item.message, item.type, item.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const diff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        return sortFilter === "Newest" ? -diff : diff;
      });
  }, [activeTab, items, query, readFilter, sortFilter]);

  const markAsRead = async (id: string) => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      return;
    }

    const result = await markNotificationRead(client, accountId, id);
    if (result.error) {
      toast({ title: "Notification not updated", description: result.error, variant: "danger" });
      return;
    }

    setItems((current) => current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
    toast({
      title: "Notification updated",
      description: "The notification was marked as read.",
      variant: "success",
    });
  };

  const markAllAsRead = async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      return;
    }

    const unreadIds = items.filter((item) => item.unread).map((item) => item.id);
    if (unreadIds.length === 0) {
      toast({ title: "Nothing to update", description: "All notifications are already read.", variant: "success" });
      return;
    }

    const results = await Promise.all(unreadIds.map((id) => markNotificationRead(client, accountId, id)));
    const failed = results.find((result) => result.error)?.error ?? null;
    if (failed) {
      toast({ title: "Notification sync failed", description: failed, variant: "danger" });
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, unread: false })));
    toast({
      title: "All notifications marked as read",
      description: "Your notification feed is now in sync.",
      variant: "success",
    });
  };

  const deleteNotification = async (id: string) => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      return;
    }

    const result = await deleteNotificationRow(client, accountId, id);
    if (result.error) {
      toast({ title: "Notification not deleted", description: result.error, variant: "danger" });
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setExpandedId((current) => (current === id ? null : current));
    toast({
      title: "Notification deleted",
      description: "The notification was removed from your account.",
      variant: "warning",
    });
  };

  const triggerAction = (item: NotificationItem) => {
    if (item.actionUrl) {
      router.push(item.actionUrl);
      return;
    }

    toast({
      title: item.actionLabel ?? "Action opened",
      description: `${item.title} is ready.`,
      variant: "success",
    });
  };

  const markAsReadAndTrigger = async (item: NotificationItem) => {
    if (item.unread) {
      await markAsRead(item.id);
    }
    triggerAction(item);
  };

  if (loading) {
    return <NotificationsSkeleton />;
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
          <motion.div variants={itemVariants} className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
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
                    Notifications
                  </span>
                </li>
              </ol>
            </nav>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge variant="accent" className="eyebrow-font w-fit">
                  Updates Center
                </Badge>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">Notifications</h1>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base">
                    Keep track of orders, offers, wishlist changes, and account alerts from one place.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background-secondary px-3 py-1.5 text-sm font-semibold text-text">
                    <Bell className="h-4 w-4 text-accent" aria-hidden="true" />
                    {unreadCount} unread
                  </div>
                  <Badge variant="neutral">{items.length} total</Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" size="md" onClick={() => void markAllAsRead()} className="w-full sm:w-auto">
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  Mark All as Read
                </Button>
                <Button type="button" variant="accent" size="md" className="w-full sm:w-auto">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  Notification Settings
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
            <FormField label="Search notifications" htmlFor="notification-search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  id="notification-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, product, order, or message"
                  className="h-12 pl-11"
                  aria-label="Search notifications"
                />
              </div>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              {READ_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setReadFilter(filter)}
                  aria-pressed={readFilter === filter}
                  className={cn(
                    "rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    readFilter === filter
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  activeTab === tab
                    ? "border-transparent bg-accent text-accent-foreground shadow-[var(--shadow-sm)]"
                    : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                )}
              >
                {tab}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2">
              {SORT_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSortFilter(filter)}
                  aria-pressed={sortFilter === filter}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    sortFilter === filter
                      ? "border-transparent bg-background-primary text-primary-foreground"
                      : "border-border/70 bg-white/85 text-muted hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <NotificationsEmptyState onHome={() => (window.location.href = "/")} />
            ) : (
              filteredItems.map((item) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <NotificationCard
                    item={item}
                    expanded={expandedId === item.id}
                    onToggleExpanded={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                    onMarkRead={() => void markAsRead(item.id)}
                    onDelete={() => void deleteNotification(item.id)}
                    onPrimaryAction={() => void markAsReadAndTrigger(item)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export { NotificationsPage, NotificationsSkeleton };
