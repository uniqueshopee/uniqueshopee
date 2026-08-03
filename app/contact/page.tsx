import type { Metadata } from "next";
import { ContactPage } from "@/components/support/support-kit";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact | UniqueShopee",
  description: "Reach UniqueShopee customer support by phone, email, office details, or the contact form.",
  pathname: "/contact",
});

export default function ContactRoute() {
  return (
    <main>
      <ContactPage />
    </main>
  );
}
