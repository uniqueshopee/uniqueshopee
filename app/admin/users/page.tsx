import type { Metadata } from "next";
import { CustomersAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Users Admin | UniqueShopee",
    description: "Search customer records and review order activity in the admin console.",
  };
}

export default function AdminUsersRoute() {
  return <CustomersAdminPage />;
}
