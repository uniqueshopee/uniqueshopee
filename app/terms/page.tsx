import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircleMore, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT_DETAILS } from "@/lib/support-data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms & Conditions | UniqueShopee",
  description: "Read the UniqueShopee terms and conditions for shopping, orders, payments, shipping, and support.",
  pathname: "/terms",
});

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";
const CALL_URL = SUPPORT_PHONE_DIGITS ? `tel:${SUPPORT_PHONE_DIGITS}` : `tel:${CONTACT_DETAILS.customerCare.replace(/\s+/g, "")}`;
const EMAIL_URL = CONTACT_DETAILS.supportEmail ? `mailto:${CONTACT_DETAILS.supportEmail}` : "mailto:";

const SECTIONS = [
  {
    title: "Acceptance",
    body:
      "By using UniqueShopee, you agree to these terms, our privacy policy, and any product-specific policies shown at checkout or on support pages.",
  },
  {
    title: "Products and Pricing",
    body:
      "We work to keep product information accurate, but prices, availability, and offers may change. Final pricing is confirmed at checkout.",
  },
  {
    title: "Orders and Payments",
    body:
      "Orders are subject to confirmation, inventory checks, and payment verification. We may cancel suspicious, duplicate, or unavailable orders.",
  },
  {
    title: "Shipping and Delivery",
    body:
      "Delivery timelines are estimates and can vary by location, product type, carrier conditions, and stock availability.",
  },
  {
    title: "Returns, Cancellations, and Warranty",
    body:
      "Returns, cancellations, and warranty coverage depend on product type and the rules shown in our help center or product detail pages.",
  },
  {
    title: "Accounts and Security",
    body:
      "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
  },
];

export default function TermsPage() {
  return (
    <main className="relative overflow-hidden bg-background-secondary/30">
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <Card className="rounded-[2rem] border-white/80 bg-white/95 p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Legal</p>
            <h1 className="text-3xl font-black tracking-tight text-text sm:text-4xl">Terms & Conditions</h1>
            <p className="max-w-2xl text-sm font-medium leading-7 text-muted sm:text-base">
              These terms explain how to use UniqueShopee and what to expect when shopping with us.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {SECTIONS.map((section) => (
              <div key={section.title} className="rounded-[1.4rem] border border-border/70 bg-background-secondary/30 p-5">
                <h2 className="text-lg font-black text-text">{section.title}</h2>
                <p className="mt-2 text-sm font-medium leading-7 text-muted">{section.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-white p-5">
            <h2 className="text-lg font-black text-text">Need help with an order?</h2>
            <p className="mt-2 text-sm font-medium leading-7 text-muted">
              Our support team is ready to help if you have questions about an order or account action.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Button asChild variant="outline" size="md" className="w-full">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" size="md" className="w-full">
                <a href={CALL_URL}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call
                </a>
              </Button>
              <Button asChild variant="accent" size="md" className="w-full">
                <a href={EMAIL_URL}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm font-medium text-muted">
              Email: <a className="font-semibold text-text underline-offset-4 hover:underline" href={EMAIL_URL}>{CONTACT_DETAILS.supportEmail}</a>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/privacy-policy" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/contact" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Contact Page
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
