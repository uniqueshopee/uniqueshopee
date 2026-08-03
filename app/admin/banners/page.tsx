import type { Metadata } from "next";
import { BannersAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Banners Admin | UniqueShopee",
    description: "Manage promotional banners and placement visibility from the admin console.",
  };
}

export default function AdminBannersRoute() {
  return <BannersAdminPage />;
}
