import type { Metadata } from "next";
import { CouponsAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Coupons Admin | UniqueShopee",
    description: "Create and manage coupons, status, and expiry in the admin dashboard.",
  };
}

export default function AdminCouponsRoute() {
  return <CouponsAdminPage />;
}
