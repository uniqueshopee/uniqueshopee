"use client";

import Link from "next/link";
import { Mail, MessageCircleMore, Phone } from "lucide-react";
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

function FaqPage() {
  return <SupportPageShell title="FAQ" subtitle="Frequently asked questions will be published here when verified help content is available."><UnavailableCard title="No FAQs available" description="Please contact support for help with your order, payment, delivery, returns, or account." /></SupportPageShell>;
}

function SupportTicketPage() {
  return <SupportPageShell title="Support Ticket" subtitle="Online ticket tracking and replies are not available in this app yet."><UnavailableCard title="Ticket tracking unavailable" description="Use the available support channels to contact UniqueShopee. Keep your order number ready." /></SupportPageShell>;
}

function SupportSkeleton() {
  return <section className="border-b border-border bg-background py-8"><div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6"><Skeleton className="h-40 rounded-[1.6rem]" /><Skeleton className="h-72 rounded-[1.6rem]" /></div></section>;
}

export { HelpCenterPage, ContactPage, FaqPage, SupportTicketPage, SupportSkeleton };
