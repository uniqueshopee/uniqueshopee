import type { Metadata } from "next";
import { CategoriesAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Categories Admin | UniqueShopee",
    description: "Create, edit, and organize product categories from the admin console.",
  };
}

export default function AdminCategoriesRoute() {
  return <CategoriesAdminPage />;
}
