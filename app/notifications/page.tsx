import type { Metadata } from "next";
import { NotificationsPage } from "@/components/notifications/notifications-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Notifications | UniqueShopee",
    description: "Track your orders, offers, wishlist updates, and account alerts in a premium notifications center.",
  };
}

export default function NotificationsRoute() {
  return (
    <main>
      <NotificationsPage />
    </main>
  );
}
