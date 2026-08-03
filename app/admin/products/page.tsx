import type { Metadata } from "next";
import { ProductsAdminPage } from "@/components/admin/products-admin-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Products Admin | UniqueShopee",
    description: "Manage the product catalog with filters, bulk actions, and row-level controls.",
  };
}

export default function AdminProductsRoute() {
  return <ProductsAdminPage />;
}
