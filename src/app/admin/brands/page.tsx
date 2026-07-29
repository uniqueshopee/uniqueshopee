import type { Metadata } from "next";
import { BrandsAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Brands Admin | UniqueShopee",
    description: "Manage brand logos, status, and product counts in the UniqueShopee admin dashboard.",
  };
}

export default function AdminBrandsRoute() {
  return <BrandsAdminPage />;
}
