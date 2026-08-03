import type { Metadata } from "next";
import { ExclusiveOffersAdminPage } from "@/components/admin/exclusive-offers-admin-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Exclusive Offers Admin | UniqueShopee",
    description: "Manage exclusive product promotions that appear on the home page.",
  };
}

export default function AdminOffersRoute() {
  return <ExclusiveOffersAdminPage />;
}
