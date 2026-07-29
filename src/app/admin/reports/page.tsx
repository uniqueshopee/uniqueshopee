import type { Metadata } from "next";
import { ReportsAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Reports Admin | UniqueShopee",
    description: "View revenue summaries and charts from the admin reporting hub.",
  };
}

export default function AdminReportsRoute() {
  return <ReportsAdminPage />;
}
