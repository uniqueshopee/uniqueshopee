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
const LAST_UPDATED = "September 6, 2026";

const SECTIONS = [
  {
    title: "Acceptance",
    body:
      "By using UniqueShopee, you agree to these terms, our privacy policy, and any product-specific policies shown at checkout or on support pages.",
  },
  {
    title: "Products and Pricing",
    body: "Product names, descriptions, shades, images, coverage information, pack sizes, prices, stock, taxes, and offers are intended to be helpful but may contain errors or change. Paint shades can look different depending on a screen, lighting, surface, and application. Final availability, applicable charges, and pricing are confirmed during checkout.",
  },
  {
    title: "Orders and Payments",
    body: "Adding an item to a cart does not guarantee stock or create a contract. An order is subject to inventory, address/serviceability, and payment checks. We may refuse or cancel an order that is unavailable, duplicated, suspicious, affected by an obvious pricing error, or otherwise cannot be fulfilled. Online payments use Razorpay; UniqueShopee receives the payment and verification metadata needed to process the order. Cash on delivery, where offered, is recorded as the selected payment method and remains subject to order confirmation and delivery rules.",
  },
  {
    title: "Shipping and Delivery",
    body: "Delivery is available only where the entered PIN code and current service configuration permit it. Checkout shows the applicable delivery charge or free-delivery condition and the available delivery estimate. Timelines are estimates and can vary with location, stock, product type, carrier conditions, weather, and events outside our control. You are responsible for providing an accurate delivery address and reachable contact details.",
  },
  {
    title: "Returns, Cancellations, and Warranty",
    body: "A customer cancellation is available only while the order is in an eligible early status shown by the service. For eligible products, a return request can be made after delivery within 5 days, provided the product is marked returnable, the order belongs to the requesting account, and no return has already been opened. A return request requires a reason and pickup option/location and is reviewed through support. Delivery charges are non-refundable for the implemented return flow. Any product-specific warranty or replacement terms shown with the product also apply; do not use a return process for a warranty issue unless instructed by support.",
  },
  { title: "Refunds", body: "Approved refunds are handled according to the order and payment review and, where applicable, returned through the relevant payment method or processor. Bank or payment-provider processing times may vary. A refund is not promised merely because a request has been submitted; support may need information or evidence to review the request." },
  { title: "Coupons and Offers", body: "Coupons, promotions, discounts, and free-delivery offers may have eligibility, product, quantity, account, date, or minimum-order conditions displayed in the service. They may not be combined unless expressly allowed, have no cash value unless stated, and may be withdrawn or corrected where misuse, expiry, unavailability, or an obvious error is identified." },
  { title: "Accounts and Security", body: "You are responsible for keeping account credentials and one-time codes confidential and for activity under your account. Do not share passwords or verification codes. You must provide information that is accurate enough to process orders and support requests and must promptly report suspected unauthorized access." },
  { title: "Reviews, Wishlist, Cart, and Tools", body: "You are responsible for content submitted in reviews or support requests and must not submit unlawful, abusive, misleading, infringing, or malicious content. Wishlist and cart contents are convenience features and are not a reservation of stock. Paint calculators and the room visualizer provide planning estimates and previews, not guarantees of coverage, colour outcome, quantity, or project cost; verify measurements and product-label information before buying." },
  { title: "Acceptable Use and Intellectual Property", body: "You may use UniqueShopee only for lawful shopping and support purposes. Do not interfere with the service, probe or bypass security, scrape or copy protected content without permission, misuse payment or coupon systems, impersonate another person, or upload content that violates another person's rights. UniqueShopee and its content, branding, software, and catalogue presentation remain protected by applicable intellectual-property rights." },
  { title: "Service Availability and Liability", body: "We aim to keep the website and app available and accurate, but features may be changed, suspended, or unavailable for maintenance, security, supplier, carrier, network, or other operational reasons. To the extent permitted by applicable law, UniqueShopee is not responsible for indirect or consequential loss arising from use of the service, delays outside our reasonable control, or reliance on estimates and previews. Nothing here limits rights or remedies that cannot lawfully be limited." },
  { title: "Account Deletion and Privacy", body: "Our Privacy Policy explains personal-information handling. You may request account deletion in the website or app settings or through the public account deletion page. Some order, support, review, consultation, coupon, verification, document, storage, and related records may be retained where necessary for legal, security, fraud prevention, dispute resolution, or regulatory purposes and are not used to maintain a deleted account." },
  { title: "Changes and Contact", body: "We may update these terms when the service, law, or policies change. The effective/updated date at the top of this page indicates the current version; continued use after an update means you accept the revised terms where permitted by law. Questions can be sent through the contact options below. These terms do not specify a governing law or exclusive jurisdiction; any such provision should be confirmed by UniqueShopee and its legal adviser before being added." },
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
              Effective and last updated: {LAST_UPDATED}. These terms explain how to use UniqueShopee and what to expect when shopping with us.
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
            <Link href="/account-deletion" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Account Deletion
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
