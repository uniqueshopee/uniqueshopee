import type { Metadata } from "next";
import { DepartmentsAdminPage } from "@/components/admin/departments-admin-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Departments Admin | UniqueShopee",
    description: "Create, edit, and organize departments from the UniqueShopee admin console.",
  };
}

export default function AdminDepartmentsRoute() {
  return <DepartmentsAdminPage />;
}
