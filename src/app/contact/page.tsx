import type { Metadata } from "next";
import { ContactPage } from "@/components/support/support-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contact | UniqueShopee",
    description: "Reach UniqueShopee customer support by phone, email, office details, or the contact form.",
  };
}

export default function ContactRoute() {
  return (
    <main>
      <ContactPage />
    </main>
  );
}
