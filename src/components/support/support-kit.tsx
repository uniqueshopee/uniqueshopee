"use client";

import Link from "next/link";
import { ChevronDown, Mail, MessageCircleMore, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTACT_DETAILS } from "@/lib/support-data";

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE_DIGITS}`;
const CALL_URL = `tel:${SUPPORT_PHONE_DIGITS}`;
const SUPPORT_EMAIL_URL = `mailto:${CONTACT_DETAILS.supportEmail}`;

function SupportPageShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="border-b border-border bg-background py-8 sm:py-12"><div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6"><div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6"><nav aria-label="Breadcrumb" className="text-sm font-medium text-muted"><Link href="/" className="hover:text-text">Home</Link> <span aria-hidden="true">/</span> <span className="text-text">{title}</span></nav><Badge variant="accent" className="eyebrow-font mt-4 w-fit">Support</Badge><h1 className="mt-3 text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p></div>{children}</div></section>;
}

function ContactLinks() {
  return <div className="grid gap-3 sm:grid-cols-3"><Button asChild variant="accent" size="md"><a href={SUPPORT_EMAIL_URL}><Mail className="h-4 w-4" aria-hidden="true" />Email Support</a></Button><Button asChild variant="outline" size="md"><a href={CALL_URL}><Phone className="h-4 w-4" aria-hidden="true" />Call Support</a></Button><Button asChild variant="outline" size="md"><a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><MessageCircleMore className="h-4 w-4" aria-hidden="true" />WhatsApp</a></Button></div>;
}

function ContactDetailsCard() {
  return <Card className="space-y-4 rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Contact information</p><h2 className="mt-2 text-xl font-black text-text">Reach UniqueShopee support</h2><p className="mt-2 text-sm font-medium leading-6 text-muted">Use phone, email, or WhatsApp for assistance. Keep your order number ready when contacting support.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border/70 bg-background-secondary/35 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Customer care</p><a className="mt-1 block text-sm font-semibold text-text" href={CALL_URL}>{CONTACT_DETAILS.customerCare}</a></div><div className="rounded-xl border border-border/70 bg-background-secondary/35 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Support email</p><a className="mt-1 block text-sm font-semibold text-text" href={SUPPORT_EMAIL_URL}>{CONTACT_DETAILS.supportEmail}</a></div><div className="rounded-xl border border-border/70 bg-background-secondary/35 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Working hours</p><p className="mt-1 text-sm font-semibold text-text">{CONTACT_DETAILS.workingHours}</p></div><div className="rounded-xl border border-border/70 bg-background-secondary/35 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Office address</p><p className="mt-1 text-sm font-semibold text-text">{CONTACT_DETAILS.officeAddress}</p></div></div><ContactLinks /></Card>;
}

function UnavailableCard({ title, description }: { title: string; description: string }) {
  return <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6"><h2 className="text-xl font-black text-text">{title}</h2><p className="mt-2 text-sm font-medium leading-6 text-muted">{description}</p><div className="mt-5"><Button asChild type="button" variant="accent" size="md"><Link href="/contact">Contact Support</Link></Button></div></Card>;
}

function HelpCenterPage() {
  return <SupportPageShell title="Help Center" subtitle="Help articles are not available yet. Contact UniqueShopee support for assistance."><ContactDetailsCard /></SupportPageShell>;
}

function ContactPage() {
  return <SupportPageShell title="Contact" subtitle="Reach UniqueShopee support through phone, email, WhatsApp, and working hours."><ContactDetailsCard /></SupportPageShell>;
}

type HelpFaq = { category: string; question: string; answer: string };

const ANDROID_FAQS: HelpFaq[] = [
  { category: "ORDERS", question: "How can I track my order?", answer: "Open Orders from your account, select the order, and choose Track Order. A tracking number is shown when the carrier reference is available." },
  { category: "ORDERS", question: "My order has not arrived. What should I do?", answer: "Check the order status and expected delivery information first. If the order is delayed or marked delivered incorrectly, contact support with the order number." },
  { category: "ORDERS", question: "I received the wrong or damaged product.", answer: "Keep the product and packaging details available and contact support with your order number. Returns or refunds are subject to the applicable order and product policy." },
  { category: "PAYMENTS", question: "What if my payment failed?", answer: "Confirm that your payment method has not been blocked and try again. Do not retry repeatedly if your bank shows a pending debit; contact support with the order and payment status." },
  { category: "PAYMENTS", question: "Payment was deducted but my order is not confirmed.", answer: "Allow payment verification to complete, then check Orders. If the order is still missing or pending, contact support with the payment reference. Never share card or authentication details." },
  { category: "PAYMENTS", question: "Which payment methods are available?", answer: "Available methods are shown during checkout. Razorpay payments are confirmed by the backend before an order is finalized; Cash on Delivery is handled separately when available." },
  { category: "DELIVERY", question: "What do the delivery statuses mean?", answer: "Pending and confirmed indicate order processing. Packed means preparation is complete, shipped means the parcel has left the seller, and delivered means the delivery was recorded." },
  { category: "DELIVERY", question: "Where can I find my tracking number?", answer: "Open order details or Track Order. A tracking number appears only when the backend has received one; full carrier history may not be available." },
  { category: "DELIVERY", question: "Can I change my delivery address after ordering?", answer: "Orders use the address snapshot captured at checkout. Contact support as soon as possible, but address changes are not guaranteed after processing begins." },
  { category: "RETURNS_REFUNDS", question: "How do returns and refunds work?", answer: "Review the applicable product and order policy and contact support with the order number. The Android app does not claim a return or refund until a real support/backend process confirms it." },
  { category: "RETURNS_REFUNDS", question: "How long does a refund take?", answer: "Refund timing depends on verified payment and the return decision. Support can provide the current status after reviewing the order; never share payment credentials." },
  { category: "ACCOUNT", question: "I cannot sign in to my account.", answer: "Check the email address and password, verify your email if requested, and use Forgot Password. Contact support if the issue continues." },
  { category: "ACCOUNT", question: "How do I manage my addresses?", answer: "Open Profile and choose Addresses. Checkout uses the selected address and stores an immutable order address snapshot." },
  { category: "ACCOUNT", question: "Where are my order notifications?", answer: "Open Notifications from Profile. Notifications are loaded from your authenticated customer account and can be marked as read." },
  { category: "CART_CHECKOUT", question: "Why cannot I complete checkout?", answer: "Confirm that your cart, address, pricing, and payment details are valid. If verification fails, retry after checking your connection or contact support." },
  { category: "CART_CHECKOUT", question: "How do I update my cart?", answer: "Open Cart to change quantities or remove items. Product availability and checkout pricing are validated by the backend." },
];

const FAQ_CATEGORIES = ["ALL", "ORDERS", "PAYMENTS", "DELIVERY", "RETURNS_REFUNDS", "ACCOUNT", "CART_CHECKOUT"];

function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ANDROID_FAQS.filter((faq) => {
      const categoryMatch = category === "ALL" || faq.category === category;
      const searchMatch = !normalized || `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase().includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [category, query]);

  return (
    <SupportPageShell title="HELP & SUPPORT" subtitle="Answers for orders, payments, delivery, returns, and your account.">
      <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <label className="relative block" htmlFor="faq-search">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <span className="sr-only">Search help</span>
          <input id="faq-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help" className="h-12 w-full rounded-2xl border border-border bg-white pl-11 pr-4 text-sm font-medium text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
        </label>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted">HELP TOPICS</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Help topics">
          {FAQ_CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setExpandedQuestion(null); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${category === item ? "bg-accent text-white" : "border border-border bg-white text-accent hover:border-accent"}`}>{item.replace("_", " ")}</button>)}
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-muted">FREQUENTLY ASKED QUESTIONS</p>
        <div className="mt-3 space-y-3">
          {filteredFaqs.map((faq) => {
            const expanded = expandedQuestion === faq.question;
            return <div key={faq.question} className="rounded-2xl border border-border/70 bg-white"><button type="button" aria-expanded={expanded} onClick={() => setExpandedQuestion(expanded ? null : faq.question)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-bold text-text"><span>{faq.question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button>{expanded ? <p className="border-t border-border/60 px-4 py-4 text-sm font-medium leading-7 text-muted">{faq.answer}</p> : null}</div>;
          })}
        </div>
        {filteredFaqs.length === 0 ? <p className="py-8 text-center text-sm font-medium text-muted">No help articles match your search.</p> : null}
      </Card>
      <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6"><h2 className="text-xl font-black text-text">Need more help?</h2><p className="mt-2 text-sm font-medium leading-6 text-muted">There is no support-ticket or live-chat destination configured in this app yet. Keep your order number ready for the support channel provided by UniqueShopee.</p><div className="mt-5"><Button asChild type="button" variant="accent" size="md"><Link href="/contact">CONTACT SUPPORT</Link></Button></div></Card>
    </SupportPageShell>
  );
}

function SupportTicketPage() {
  return <SupportPageShell title="Support Ticket" subtitle="Online ticket tracking and replies are not available in this app yet."><UnavailableCard title="Ticket tracking unavailable" description="Use the available support channels to contact UniqueShopee. Keep your order number ready." /></SupportPageShell>;
}

function SupportSkeleton() {
  return <section className="border-b border-border bg-background py-8"><div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6"><Skeleton className="h-40 rounded-[1.6rem]" /><Skeleton className="h-72 rounded-[1.6rem]" /></div></section>;
}

export { HelpCenterPage, ContactPage, FaqPage, SupportTicketPage, SupportSkeleton };
