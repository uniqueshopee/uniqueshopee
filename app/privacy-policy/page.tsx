import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircleMore, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT_DETAILS } from "@/lib/support-data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy | UniqueShopee",
  description: "Read how UniqueShopee collects, uses, and protects customer information.",
  pathname: "/privacy-policy",
});

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";
const CALL_URL = SUPPORT_PHONE_DIGITS ? `tel:${SUPPORT_PHONE_DIGITS}` : `tel:${CONTACT_DETAILS.customerCare.replace(/\s+/g, "")}`;
const EMAIL_URL = CONTACT_DETAILS.supportEmail ? `mailto:${CONTACT_DETAILS.supportEmail}` : "mailto:";
const LAST_UPDATED = "September 6, 2026";

type PolicySection = { title: string; body?: string; bullets?: string[] };

const SECTIONS: PolicySection[] = [
  {
    title: "About This Policy",
    body: "This policy applies to the UniqueShopee website and Android app. It describes the personal information processed when you browse, create an account, use our tools, place an order, contact support, or request account deletion.",
  },
  {
    title: "Information We Collect",
    bullets: [
      "Account and identity details such as your name, email address, phone number, account ID, profile status, and internal account role. Authentication is provided through Supabase; the app does not expose your password to us in readable form.",
      "Shopping and service information such as cart and wishlist items, saved addresses, delivery PIN code, order items, selected product options, coupon usage, reviews, consultations, support tickets, notifications, and return-related information.",
      "Payment and checkout information such as amount, currency, payment method, order identifiers, payment status, and the identifiers/signature data needed to verify a Razorpay payment. We do not claim to store card numbers, CVV, UPI credentials, or bank passwords.",
      "Tool information such as paint-calculator values and room-visualizer selections. A room image selected for the visualizer is used for the in-session preview; the website uses a temporary browser object URL and does not upload that image through the visualizer.",
      "Technical and preference information needed to operate the service, including session state, language preferences, guest-cart state, browser/app information, and search or navigation activity. We have not identified an advertising, analytics, or crash-reporting SDK in the reviewed application paths.",
    ],
  },
  {
    title: "How We Use Information",
    bullets: [
      "To create and secure accounts, authenticate sign-ins, and provide account features.",
      "To process carts, orders, delivery serviceability checks, cancellations, returns, refunds, support requests, and customer communications.",
      "To provide product browsing, search, wishlist, notifications, paint tools, room-visualizer previews, and a consistent experience across the website and app.",
      "To prevent fraud, abuse, duplicate or suspicious orders, unauthorized access, and other security incidents; to resolve disputes; and to meet applicable legal or regulatory obligations.",
    ],
  },
  {
    title: "Service Providers and Sharing",
    bullets: [
      "Supabase hosts the application data and authentication services used for accounts, commerce, support, and related records.",
      "Razorpay processes online payment checkout. UniqueShopee receives the payment and verification metadata needed to confirm and fulfil an order.",
      "2Factor is used by the website for phone OTP delivery and verification, including the deletion-specific phone verification flow, when that flow is used.",
      "Cloudinary is used for certain catalogue, category, brand, or banner images managed by authorised administrators. The reviewed customer room-visualizer flow does not upload room images to Cloudinary.",
      "We may share information with delivery, technology, communications, professional, legal, or regulatory parties when needed to provide the service, protect users, investigate misuse, resolve disputes, or comply with law. We do not sell personal information for advertising.",
    ],
  },
  {
    title: "Android Permissions and Optional Features",
    bullets: [
      "The Android app requests microphone permission only for speech-to-text product search. The resulting text is used as a search query; the reviewed app does not store a microphone recording.",
      "The reviewed Android manifest does not request location, contacts, SMS, or camera permission. Delivery PIN code is entered by the user rather than collected from device location.",
      "Choosing a room image for the visualizer is optional. Notifications, saved shopping information, and account features are used when you choose to use those features or create an account.",
    ],
  },
  {
    title: "Retention and Security",
    body: "We retain information for as long as reasonably needed to provide the service, maintain required business and transaction records, prevent fraud and abuse, resolve disputes, provide support, and meet legal or regulatory obligations. We use reasonable technical and organisational safeguards, but no internet service can guarantee absolute security.",
  },
  {
    title: "Account Deletion and Retained Records",
    body: "You can start deletion in the website or app account settings, or use our public account deletion page. Email/password accounts require current-password confirmation; phone accounts require a deletion-specific one-time code. When deletion completes, we remove addresses, cart items, wishlist items, notifications, paint calculations, room visualizations, profile roles, phone-auth credentials, and authenticated-user-scoped objects in the applicable users and room-visualizer storage locations.",
    bullets: [
      "Order history, order items, reviews, support records, consultations, coupon usage, and certain verification records may be retained where necessary for legal, security, fraud prevention, dispute resolution, or regulatory purposes.",
      "Temporary account-deletion authentication challenges are removed as part of account deletion. Documents and support storage, together with required order history, snapshots, notes, and related records, may remain where needed for those purposes.",
      "Retained records are not used to maintain your deleted account. See the detailed process at /account-deletion.",
    ],
  },
  {
    title: "Your Choices and Rights",
    bullets: [
      "You can review or update available profile and address information through your account, and you can contact support about privacy questions or account requests.",
      "You may decline optional features such as speech search or the room visualizer, although doing so may limit those features.",
      "Depending on applicable law, you may have rights to request access, correction, deletion, or information about processing. We may need to verify your identity and may retain information where a lawful exception applies.",
    ],
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
              Effective and last updated: {LAST_UPDATED}. This page explains how UniqueShopee handles personal information across the website and app.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {SECTIONS.map((section) => (
              <div key={section.title} className="rounded-[1.4rem] border border-border/70 bg-background-secondary/30 p-5">
                <h2 className="text-lg font-black text-text">{section.title}</h2>
                {section.body && <p className="mt-2 text-sm font-medium leading-7 text-muted">{section.body}</p>}
                {section.bullets && (
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm font-medium leading-7 text-muted">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
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
            <Link href="/account-deletion" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Account Deletion
            </Link>
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
