import type { Metadata } from "next";
import { DashboardAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin Dashboard | UniqueShopee",
    description: "Monitor sales, orders, products, customers, and store performance from the UniqueShopee admin console.",
  };
}

export default function AdminDashboardRoute() {
  return <DashboardAdminPage />;
}
