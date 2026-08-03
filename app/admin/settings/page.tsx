import type { Metadata } from "next";
import { SettingsAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Settings Admin | UniqueShopee",
    description: "Configure store details, business information, tax, shipping, email, and theme settings.",
  };
}

export default function AdminSettingsRoute() {
  return <SettingsAdminPage />;
}
