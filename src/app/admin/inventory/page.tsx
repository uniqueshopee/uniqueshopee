import type { Metadata } from "next";
import { InventoryAdminLivePage } from "@/components/admin/inventory-admin-live-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Inventory Admin | UniqueShopee",
    description: "Monitor stock, low stock alerts, and adjustment actions from the admin dashboard.",
  };
}

export default function AdminInventoryRoute() {
  return <InventoryAdminLivePage />;
}
