import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";

export const metadata: Metadata = {
  title: "Account | UniqueShopee",
  description: "Manage shopping activity, saved items, addresses, and account shortcuts.",
};

export default function AccountRoute() {
  return (
    <main>
      <AccountPage />
    </main>
  );
}
