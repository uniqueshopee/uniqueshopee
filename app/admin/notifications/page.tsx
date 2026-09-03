import type { Metadata } from "next";
import { NotificationsAdminPage } from "@/components/admin/notifications-admin-page";

export const metadata: Metadata = { title: "Notifications Admin | UniqueShopee", description: "Create customer notifications." };

export default function AdminNotificationsRoute() { return <NotificationsAdminPage />; }
