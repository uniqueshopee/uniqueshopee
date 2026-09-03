"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gift,
  Heart,
  Lock,
  Megaphone,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  ShieldAlert,
  Tag,
  Trash2,
  Truck,
  WalletCards,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteNotification as deleteNotificationRow, loadLiveNotificationsResult, markAllNotificationsRead, markNotificationRead, subscribeToUserNotifications, type LiveNotification } from "@/lib/account-service";

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
        "overflow-hidden rounded-[1.45rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]",
        !item.unread && "opacity-90",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] sm:h-14 sm:w-14",
              meta.tone === "success" && "bg-success/10 text-success",
              meta.tone === "warning" && "bg-warning/15 text-warning",
              meta.tone === "danger" && "bg-danger/10 text-danger",
              meta.tone === "accent" && "bg-accent/10 text-accent",
              meta.tone === "neutral" && "bg-background-secondary text-text",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.unread && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" aria-label="Unread notification" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-base font-bold leading-6 text-text sm:text-lg">{item.title}</h3>
              <span className="shrink-0 pt-0.5 text-xs font-medium text-muted sm:text-sm">{item.timestamp}</span>
            </div>
            <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-6 text-muted sm:text-base">{item.description}</p>
            <button type="button" onClick={onToggleExpanded} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-text transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm">
              {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              {expanded ? "Hide details" : "View details"}
            </button>
            {!expanded && item.actionLabel && (
              <Button type="button" variant="ghost" size="sm" className="ml-3 mt-1 border border-border/70 bg-white/75" onClick={onPrimaryAction}>
                {item.actionLabel}
              </Button>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {item.unread && <Button type="button" variant="outline" size="sm" onClick={onMarkRead}><CheckCheck className="h-4 w-4" aria-hidden="true" />Mark as Read</Button>}
              <Button type="button" variant="ghost" size="sm" className="border border-border/70 bg-white/75" onClick={onDelete}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 rounded-[1.1rem] border border-border/70 bg-background-secondary/35 p-3.5 sm:p-4">
            <p className="text-sm font-medium leading-6 text-text">{item.message}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                {item.previewTitle && <p className="text-sm font-bold text-text">{item.previewTitle}</p>}
                {item.previewSubtitle && <p className="text-xs font-medium text-muted">{item.previewSubtitle}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.actionLabel && <Button type="button" variant="accent" size="sm" onClick={onPrimaryAction}>{item.ctaLabel ?? item.actionLabel}</Button>}
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
    <section className="min-h-[60vh] bg-background px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-52" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => <NotificationSkeletonCard key={index} />)}
        </div>
      </div>
    </section>
  );
}

function NotificationsEmptyState() {
  return <p className="rounded-[1.35rem] border border-border/60 bg-white/80 px-5 py-8 text-center text-sm font-medium text-muted">No notifications yet.</p>;
}

function NotificationsPage() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { profile, user } = useAuth();
  const accountId = profile?.id ?? user?.id ?? null;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = async (activeAccountId: string): Promise<LiveNotification[]> => {
    const result = await loadLiveNotificationsResult(getSupabaseBrowserClient(), activeAccountId);
    setItems(result.data.map((item) => ({ id: item.id, type: item.type, category: item.category, title: item.title, description: item.previewSubtitle ?? item.message, message: item.message, timestamp: item.timestamp, createdAt: item.createdAt, unread: item.unread, icon: undefined, previewTitle: item.previewTitle, previewSubtitle: item.previewSubtitle, actionLabel: item.actionLabel ? (item.actionLabel as NotificationAction) : undefined, ctaLabel: item.actionLabel ?? undefined, actionUrl: item.actionUrl })));
    setError(result.error);
    return result.data as LiveNotification[];
  };

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void refreshNotifications(accountId).then((nextItems) => {
      if (!active) {
        return;
      }
      setExpandedId((current) => current ?? nextItems[0]?.id ?? null);
      setLoading(false);
    }).catch(() => { if (active) { setError("Unable to load notifications."); setLoading(false); } });

    return () => {
      active = false;
    };
  }, [accountId]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) return;
    const unsubscribe = subscribeToUserNotifications(client, accountId, () => { void refreshNotifications(accountId); });
    return unsubscribe;
  }, [accountId]);

  const filteredItems = items;

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

    const result = await markAllNotificationsRead(client, accountId);
    if (result.error) {
      toast({ title: "Notification sync failed", description: result.error, variant: "danger" });
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, unread: false })));
    toast({
      title: "All notifications marked as read",
      description: "Your notification feed is now in sync.",
      variant: "success",
    });
  };
  void markAllAsRead;

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
    <motion.main
      className="min-h-[60vh] bg-background px-5 py-10 sm:px-8 sm:py-14"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="mx-auto max-w-3xl">
        <motion.h1 variants={itemVariants} className="text-3xl font-black tracking-tight text-text sm:text-4xl">Notifications</motion.h1>
        {error ? <div role="alert" className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm font-semibold text-danger"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={() => accountId && void refreshNotifications(accountId)}>Retry</Button></div> : null}
        <div className="mt-7 space-y-4">
          {filteredItems.length === 0 ? (
            <NotificationsEmptyState />
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
    </motion.main>
  );
}

export { NotificationsPage, NotificationsSkeleton };
