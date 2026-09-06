import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircleMore, Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT_DETAILS } from "@/lib/support-data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Account Deletion | UniqueShopee",
  description: "Learn how to request UniqueShopee account deletion and what information may need to be retained.",
  pathname: "/account-deletion",
 });

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";
const CALL_URL = SUPPORT_PHONE_DIGITS ? `tel:${SUPPORT_PHONE_DIGITS}` : `tel:${CONTACT_DETAILS.customerCare.replace(/\s+/g, "")}`;
const EMAIL_URL = CONTACT_DETAILS.supportEmail ? `mailto:${CONTACT_DETAILS.supportEmail}` : "mailto:";

const INFORMATION = [
  {
    title: "What can be requested",
    body: "You can contact UniqueShopee to request account deletion or correction of account information. We will verify the request before taking action.",
  },
  {
    title: "Information that may be retained",
    body: "Order history, order items, reviews, support records, consultations, coupon usage, and certain verification records may be retained where necessary for legal, security, fraud prevention, dispute resolution, or regulatory purposes. These records are not used to maintain your deleted account.",
  },
  {
    title: "Open matters",
    body: "An open order, return, refund, dispute, support case, or consultation may need to be resolved before account-related deletion can be completed.",
  },
];

export default function AccountDeletionPage() {
  return (
    <main className="relative overflow-hidden bg-background-secondary/30">
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <Card className="rounded-[2rem] border-white/80 bg-white/95 p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-700">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Account controls</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-text sm:text-4xl">Account deletion</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-muted sm:text-base">
                Email/password customers can request account deletion after confirming their current password. Phone customers can request a deletion-specific one-time code. Google sign-in is not offered by UniqueShopee.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {INFORMATION.map((item) => (
              <div key={item.title} className="rounded-[1.4rem] border border-border/70 bg-background-secondary/30 p-5">
                <h2 className="text-lg font-black text-text">{item.title}</h2>
                <p className="mt-2 text-sm font-medium leading-7 text-muted">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-white p-5">
            <h2 className="text-lg font-black text-text">Contact support</h2>
            <p className="mt-2 text-sm font-medium leading-7 text-muted">
              Please do not send passwords, one-time codes, or service-role credentials in a support message.
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
