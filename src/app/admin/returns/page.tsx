import type { Metadata } from "next";
import { ReturnsAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Returns Admin | UniqueShopee",
    description: "Review return tickets and pickup notes from the admin console.",
  };
}

export default function AdminReturnsRoute() {
  return <ReturnsAdminPage />;
}
