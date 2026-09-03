"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadUnreadNotificationCount, subscribeToUserNotifications } from "@/lib/account-service";

function NotificationBell({ className = "" }: { className?: string }) {
  const { profile, user } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !userId) { setCount(0); return; }
    let active = true;
    const refresh = async () => {
      const result = await loadUnreadNotificationCount(client, userId);
      if (active) setCount(result.count);
    };
    void refresh();
    const unsubscribe = subscribeToUserNotifications(client, userId, () => { void refresh(); });
    return () => { active = false; unsubscribe(); };
  }, [userId]);

  return <Link href="/notifications" className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white/90 text-text shadow-[var(--shadow-sm)] ${className}`} aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}><Bell className="h-5 w-5" aria-hidden="true" />{count > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{count > 99 ? "99+" : count}</span>}</Link>;
}

export { NotificationBell };
