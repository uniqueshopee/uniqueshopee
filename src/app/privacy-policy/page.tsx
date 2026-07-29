import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircleMore, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT_DETAILS } from "@/lib/support-data";

export const metadata: Metadata = {
  title: "Privacy Policy | UniqueShopee",
  description: "Read how UniqueShopee collects, uses, and protects customer information.",
};

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";
const CALL_URL = SUPPORT_PHONE_DIGITS ? `tel:${SUPPORT_PHONE_DIGITS}` : `tel:${CONTACT_DETAILS.customerCare.replace(/\s+/g, "")}`;
const EMAIL_URL = CONTACT_DETAILS.supportEmail ? `mailto:${CONTACT_DETAILS.supportEmail}` : "mailto:";

const SECTIONS = [
  {
    title: "Information We Collect",
    body:
      "We collect account details, order history, saved addresses, payment-related metadata, device information, and support messages when you use UniqueShopee.",
  },
  {
    title: "How We Use Information",
    body:
      "We use your information to process orders, manage deliveries, provide customer support, send service updates, improve the store, and personalize your experience.",
  },
  {
    title: "Sharing",
    body:
      "We only share information with trusted service providers needed to run the store, such as payment, logistics, analytics, and communication partners.",
  },
  {
    title: "Retention and Security",
    body:
      "We retain data only as long as needed for service, compliance, and support. We use reasonable technical and organizational safeguards to protect it.",
  },
  {
    title: "Your Choices",
    body:
      "You can update profile details, addresses, and communication preferences from your account. You may also contact support for deletion or correction requests.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="relative overflow-hidden bg-background-secondary/30">
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <Card className="rounded-[2rem] border-white/80 bg-white/95 p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Legal</p>
            <h1 className="text-3xl font-black tracking-tight text-text sm:text-4xl">Privacy Policy</h1>
            <p className="max-w-2xl text-sm font-medium leading-7 text-muted sm:text-base">
              This page explains how UniqueShopee handles personal information across the website and app.
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
            <h2 className="text-lg font-black text-text">Contact Us</h2>
            <p className="mt-2 text-sm font-medium leading-7 text-muted">
              For privacy questions, reach us using the options below.
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
            <Link href="/terms" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Terms & Conditions
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
