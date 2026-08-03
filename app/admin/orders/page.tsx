import type { Metadata } from "next";
import { OrdersAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Orders Admin | UniqueShopee",
    description: "Track order timelines, statuses, and invoice placeholders from the admin console.",
  };
}

export default function AdminOrdersRoute() {
  return <OrdersAdminPage />;
}
