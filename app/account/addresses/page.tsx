import type { Metadata } from "next";
import { AddressManagementPage } from "@/components/address/address-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Manage Addresses | UniqueShopee",
    description: "Save and manage delivery addresses in a premium account experience built for faster checkout.",
  };
}

export default function AccountAddressesRoute() {
  return (
    <main>
      <AddressManagementPage />
    </main>
  );
}
