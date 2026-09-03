import type { Metadata } from "next";
import { DeliveryPincodesAdminPage } from "@/components/admin/delivery-pincodes-admin-page";

export const metadata: Metadata = { title: "Delivery Pincodes Admin | UniqueShopee", description: "Manage serviceable delivery pincodes." };

export default function AdminDeliveryPincodesRoute() {
  return <DeliveryPincodesAdminPage />;
}
