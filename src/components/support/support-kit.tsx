"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Clock3,
  HelpCircle,
  MessageSquareText,
  Mail,
  MapPin,
  Phone,
  Search,
  Send,
  Ticket,
  RotateCcw,
  Headphones,
  MessageCircleMore,
  CheckCircle2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FAQS, HELP_CATEGORIES, POPULAR_TOPICS, SUPPORT_TICKET, CONTACT_DETAILS, type FaqItem, type HelpCategory, type QuickAction } from "@/lib/support-data";

type SupportActionConfig = {
  title: string;
  description: string;
  icon: typeof HelpCircle;
  tone: "accent" | "neutral" | "success" | "warning";
  cta: string;
};

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
};

const QUICK_ACTIONS: SupportActionConfig[] = [
  { title: "Live Chat", description: "Placeholder for chat integration", icon: MessageCircleMore, tone: "accent", cta: "Open Chat" },
  { title: "WhatsApp", description: "Send a message on WhatsApp", icon: MessageSquareText, tone: "success", cta: "Open WhatsApp" },
  { title: "Call Support", description: "Reach support by phone", icon: Phone, tone: "neutral", cta: "Call Now" },
  { title: "Email Support", description: "Send a support email", icon: Mail, tone: "accent", cta: "Compose Email" },
  { title: "Raise Ticket", description: "Create a new support ticket", icon: Ticket, tone: "warning", cta: "Create Ticket" },
  { title: "Track Existing Ticket", description: "Check progress of a support ticket", icon: ClipboardList, tone: "neutral", cta: "Track Ticket" },
];

function supportToneClass(tone: SupportActionConfig["tone"]) {
  switch (tone) {
    case "success":
      return "bg-success/10 text-success";
    case "warning":
      return "bg-warning/15 text-warning";
    case "neutral":
      return "bg-background-secondary text-text";
    case "accent":
    default:
      return "bg-accent/10 text-accent";
  }
}

function quickBadgeVariant(tone: SupportActionConfig["tone"]) {
  switch (tone) {
    case "success":
      return "success" as const;
    case "warning":
      return "warning" as const;
    case "neutral":
      return "neutral" as const;
    case "accent":
    default:
      return "accent" as const;
  }
}

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";
const CALL_URL = SUPPORT_PHONE_DIGITS ? `tel:${SUPPORT_PHONE_DIGITS}` : `tel:${CONTACT_DETAILS.customerCare.replace(/\s+/g, "")}`;
const SUPPORT_EMAIL_URL = CONTACT_DETAILS.supportEmail ? `mailto:${CONTACT_DETAILS.supportEmail}` : "mailto:";

function SupportHeader({
  title,
  subtitle,
  countLabel,
  countValue,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  subtitle: string;
  countLabel: string;
  countValue: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-text focus-visible:text-text">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-text">
              {title}
            </span>
          </li>
        </ol>
      </nav>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="accent" className="eyebrow-font w-fit">
            Support Hub
          </Badge>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background-secondary px-3 py-1.5 text-sm font-semibold text-text">
            <HelpCircle className="h-4 w-4 text-accent" aria-hidden="true" />
            {countValue} {countLabel}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  );
}

function NoFaqState({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      title="No FAQs Found"
      description="Try a different category or search term to reveal more help articles."
      actionLabel="Reset Filters"
      onAction={onAction}
    />
  );
}

function NoTicketsState({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      title="No Tickets"
      description="You do not have any open support tickets in this frontend demo yet."
      actionLabel="Create Ticket"
      onAction={onAction}
    />
  );
}

function NoSearchState({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      title="No Search Results"
      description="Try a more specific keyword or browse by category."
      actionLabel="Clear Search"
      onAction={onAction}
    />
  );
}

function SupportSkeleton() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-[1.25rem]" />
          <Skeleton className="h-40 w-full rounded-[1.5rem]" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 rounded-[1.5rem]" />
            <Skeleton className="h-48 rounded-[1.5rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQAccordionItem({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden rounded-[1.35rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-text sm:text-base">{item.question}</h3>
            <Badge variant="neutral">{item.category}</Badge>
          </div>
          <p className="text-xs font-medium text-muted">{item.tags.join(" · ")}</p>
        </div>
        {open ? <ChevronUp className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" /> : <ChevronDown className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-border/70 bg-background-secondary/25 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-text">{item.answer}</p>
        </div>
      )}
    </Card>
  );
}

function HelpCenterPage() {
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory | "All">("All");
  const [openId, setOpenId] = useState<string | null>(FAQS[0]?.id ?? null);
  const [actionModal, setActionModal] = useState<QuickAction | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return FAQS.filter((faq) => {
      if (activeCategory !== "All" && faq.category !== activeCategory) return false;
      if (!normalized) return true;
      return [faq.question, faq.answer, faq.category, faq.tags.join(" ")].join(" ").toLowerCase().includes(normalized);
    });
  }, [activeCategory, query]);

  const openPlaceholderAction = (action: QuickAction) => {
    setActionModal(action);
  };

  const openSupportAction = (action: QuickAction) => {
    if (action === "WhatsApp") {
      window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
      return;
    }

    if (action === "Call Support") {
      window.location.href = CALL_URL;
      return;
    }

    if (action === "Email Support") {
      window.location.href = SUPPORT_EMAIL_URL;
      return;
    }

    openPlaceholderAction(action);
  };

  const closeAction = () => setActionModal(null);

  const actionMeta: Record<QuickAction, SupportActionConfig> = {
    "Live Chat": { title: "Live Chat", description: "Placeholder for chat integration", icon: MessageCircleMore, tone: "accent", cta: "Open Chat" },
    WhatsApp: { title: "WhatsApp", description: "Send a message on WhatsApp", icon: MessageSquareText, tone: "success", cta: "Open WhatsApp" },
    "Call Support": { title: "Call Support", description: "Reach support by phone", icon: Phone, tone: "neutral", cta: "Call Now" },
    "Email Support": { title: "Email Support", description: "Send a support email", icon: Mail, tone: "accent", cta: "Compose Email" },
    "Raise Ticket": { title: "Raise Ticket", description: "Create a new support ticket", icon: Ticket, tone: "warning", cta: "Create Ticket" },
    "Track Existing Ticket": { title: "Track Existing Ticket", description: "Check progress of a support ticket", icon: ClipboardList, tone: "neutral", cta: "Track Ticket" },
  };

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <SupportHeader
              title="Help Center"
              subtitle="Find answers, connect with support, and raise a ticket from one premium support hub."
              countLabel="popular topics"
              countValue={String(POPULAR_TOPICS.length)}
              primaryAction={
                <Button type="button" variant="accent" size="md" className="w-full sm:w-auto" onClick={() => openPlaceholderAction("Raise Ticket")}>
                  <Ticket className="h-4 w-4" aria-hidden="true" />
                  Raise Ticket
                </Button>
              }
              secondaryAction={
                <Button type="button" variant="outline" size="md" className="w-full sm:w-auto" onClick={() => openPlaceholderAction("Live Chat")}>
                  <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                  Live Chat
                </Button>
              }
            />
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <FormField label="Search help" htmlFor="help-search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  id="help-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search help, FAQs, and support topics"
                  className="h-12 pl-11"
                  aria-label="Search help"
                />
              </div>
            </FormField>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {["WhatsApp", "Call Support", "Email Support", "Track Existing Ticket"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => openSupportAction(label as QuickAction)}
                  className="rounded-[1.1rem] border border-border/70 bg-white/85 px-4 py-3 text-sm font-semibold text-text transition-all hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Popular topics</p>
                  <h2 className="mt-2 text-xl font-black text-text">Quick Actions</h2>
                </div>
                <Badge variant="neutral">Live support ready</Badge>
              </div>
              <div className="mt-4 grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.title}
                      type="button"
                      onClick={() => openSupportAction(action.title as QuickAction)}
                      className="group rounded-[1.3rem] border border-border/70 bg-background-secondary/35 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn("flex h-11 w-11 items-center justify-center rounded-[1rem]", supportToneClass(action.tone))}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <Badge variant={quickBadgeVariant(action.tone)}>{action.cta}</Badge>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-text">{action.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-6 text-muted">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Popular categories</p>
                    <h2 className="mt-2 text-xl font-black text-text">Browse by topic</h2>
                  </div>
                  <Badge variant="neutral">{HELP_CATEGORIES.length} categories</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {HELP_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      aria-pressed={activeCategory === category}
                      className={cn(
                        "rounded-[1.1rem] border px-4 py-3 text-left text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        activeCategory === category
                          ? "border-transparent bg-accent text-accent-foreground"
                          : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Popular topics</p>
                    <h2 className="mt-2 text-xl font-black text-text">Start here</h2>
                  </div>
                  <Badge variant="accent">Helpful shortcuts</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {POPULAR_TOPICS.map((topic) => (
                    <Link
                      key={topic.title}
                      href={topic.href}
                      className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-text">{topic.title}</p>
                        <p className="text-xs font-medium text-muted">{topic.description}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">FAQ</p>
                  <h2 className="mt-2 text-xl font-black text-text">Search and expand answers</h2>
                </div>
                <Badge variant="neutral">{filteredFaqs.length} results</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {["All", ...HELP_CATEGORIES].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category as HelpCategory | "All")}
                    aria-pressed={activeCategory === category}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      activeCategory === category
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {query && filteredFaqs.length === 0 ? (
                  <NoSearchState onAction={() => setQuery("")} />
                ) : filteredFaqs.length === 0 ? (
                  <NoFaqState onAction={() => {
                    setQuery("");
                    setActiveCategory("All");
                  }} />
                ) : (
                  filteredFaqs.map((item) => (
                    <FAQAccordionItem
                      key={item.id}
                      item={item}
                      open={openId === item.id}
                      onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                    />
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <Modal
        open={Boolean(actionModal)}
        onOpenChange={(next) => {
          if (!next) closeAction();
        }}
        title={actionModal ?? "Support action"}
        description={actionModal ? actionMeta[actionModal].description : "Support action"}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium leading-6 text-text">
            This is a frontend placeholder for {actionModal?.toLowerCase() ?? "this support"} and is ready for later integration.
          </p>
          <Button type="button" variant="accent" size="md" className="w-full" onClick={closeAction}>
            {actionModal ? actionMeta[actionModal].cta : "Close"}
          </Button>
        </div>
      </Modal>
    </motion.section>
  );
}

function ContactPage() {
  const shouldReduceMotion = useReducedMotion();
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = () => {
    setSubmitted(true);
    toast({
      title: "Message sent",
      description: "Your contact form has been saved as a frontend-only interaction.",
      variant: "success",
    });
  };

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <SupportHeader
              title="Contact"
              subtitle="Reach UniqueShopee support through phone, email, working hours, and the contact form below."
              countLabel="support channels"
              countValue="6"
              primaryAction={
                <Button asChild variant="accent" size="md" className="w-full sm:w-auto">
                  <a href={SUPPORT_EMAIL_URL}>
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Email Support
                  </a>
                </Button>
              }
              secondaryAction={
                <Button asChild variant="outline" size="md" className="w-full sm:w-auto">
                  <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                    <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                    WhatsApp
                  </a>
                </Button>
              }
            />
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <motion.div variants={itemVariants} className="space-y-4">
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <h2 className="text-xl font-black text-text">Support details</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Customer Care Number", value: CONTACT_DETAILS.customerCare, icon: Phone },
                    { label: "Business Email", value: CONTACT_DETAILS.businessEmail, icon: Mail },
                    { label: "Support Email", value: CONTACT_DETAILS.supportEmail, icon: Headphones },
                    { label: "Working Hours", value: CONTACT_DETAILS.workingHours, icon: Clock3 },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isPhone = item.label === "Customer Care Number";
                    const isEmail = item.label === "Business Email" || item.label === "Support Email";
                    return (
                      <div key={item.label} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                            {isPhone ? (
                              <a href={CALL_URL} className="mt-1 block text-sm font-semibold text-text underline-offset-4 hover:underline">
                                {item.value}
                              </a>
                            ) : isEmail ? (
                              <a href={SUPPORT_EMAIL_URL} className="mt-1 block text-sm font-semibold text-text underline-offset-4 hover:underline">
                                {item.value}
                              </a>
                            ) : (
                              <p className="mt-1 text-sm font-semibold text-text">{item.value}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Office Address</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-text">{CONTACT_DETAILS.officeAddress}</p>
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-text">Google Maps</h2>
                  <Badge variant="neutral">Placeholder</Badge>
                </div>
                <div className="mt-4 flex min-h-56 items-center justify-center rounded-[1.4rem] border border-dashed border-border bg-background-secondary/25 px-6 text-center">
                  <div className="space-y-3">
                    <MapPin className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                    <p className="text-sm font-semibold text-text">Map preview will be embedded here later.</p>
                    <p className="text-xs font-medium text-muted">Ready for Google Maps integration.</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <h2 className="text-xl font-black text-text">Quick Contact</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "WhatsApp", href: WHATSAPP_URL, external: true, icon: MessageCircleMore },
                    { label: "Call", href: CALL_URL, icon: Phone },
                    { label: "Mail", href: SUPPORT_EMAIL_URL, icon: Mail },
                  ].map(({ label, href, external, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      className="rounded-[1.1rem] border border-border/70 bg-background-secondary/35 px-4 py-3 text-sm font-semibold text-text transition-all hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Contact form</p>
                    <h2 className="mt-2 text-xl font-black text-text">Send us a message</h2>
                  </div>
                  <Badge variant="accent">Support ready</Badge>
                </div>

                {submitted ? (
                  <div className="mt-4">
                    <EmptyState title="Message submitted" description="We captured your request in the frontend-only contact form." actionLabel="Send another message" onAction={() => setSubmitted(false)} />
                  </div>
                ) : (
                  <form
                    className="mt-4 space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onSubmit();
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Name" htmlFor="contact-name">
                        <Input id="contact-name" name="name" placeholder="Your name" autoComplete="name" />
                      </FormField>
                      <FormField label="Email" htmlFor="contact-email">
                        <Input id="contact-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
                      </FormField>
                      <FormField label="Phone" htmlFor="contact-phone">
                        <Input id="contact-phone" name="phone" placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel" />
                      </FormField>
                      <FormField label="Subject" htmlFor="contact-subject">
                        <Input id="contact-subject" name="subject" placeholder="How can we help?" />
                      </FormField>
                    </div>
                    <FormField label="Message" htmlFor="contact-message">
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={6}
                        className={cn(
                          "flex w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text",
                          "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        )}
                        placeholder="Tell us about your issue"
                      />
                    </FormField>
                    <Button type="submit" variant="accent" size="lg" className="w-full">
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Submit
                    </Button>
                  </form>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FaqPage() {
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "All">("All");
  const [openId, setOpenId] = useState<string | null>(FAQS[0]?.id ?? null);

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return FAQS.filter((faq) => {
      if (category !== "All" && faq.category !== category) return false;
      if (!normalized) return true;
      return [faq.question, faq.answer, faq.tags.join(" "), faq.category].join(" ").toLowerCase().includes(normalized);
    });
  }, [category, query]);

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <SupportHeader
              title="FAQ"
              subtitle="Browse answers by category or search for the question that matches your issue."
              countLabel="answers"
              countValue={String(FAQS.length)}
              primaryAction={
                <Button type="button" variant="accent" size="md" className="w-full sm:w-auto" onClick={() => setQuery("")}>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search Help
                </Button>
              }
              secondaryAction={
                <Button type="button" variant="outline" size="md" className="w-full sm:w-auto" onClick={() => setCategory("All")}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset
                </Button>
              }
            />
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <FormField label="Search FAQs" htmlFor="faq-search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  id="faq-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search questions and answers"
                  className="h-12 pl-11"
                  aria-label="Search FAQs"
                />
              </div>
            </FormField>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {["All", ...HELP_CATEGORIES].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item as HelpCategory | "All")}
                  aria-pressed={category === item}
                  className={cn(
                    "rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    category === item
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border/70 bg-white/85 text-text hover:border-accent/20 hover:bg-white",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            {filteredFaqs.length === 0 ? (
              query ? (
                <NoSearchState onAction={() => setQuery("")} />
              ) : (
                <NoFaqState
                  onAction={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                />
              )
            ) : (
              filteredFaqs.map((item) => (
                <FAQAccordionItem
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                />
              ))
            )}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function SupportTicketPage() {
  const shouldReduceMotion = useReducedMotion();
  const [ticketNumber, setTicketNumber] = useState(SUPPORT_TICKET.ticketNumber);
  const [ticketReply, setTicketReply] = useState("");
  const [openTicket, setOpenTicket] = useState(true);

  const ticket = openTicket && ticketNumber.trim() === SUPPORT_TICKET.ticketNumber ? SUPPORT_TICKET : null;

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={containerVariants}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <SupportHeader
              title="Support Ticket"
              subtitle="Track an existing support ticket, review its timeline, and send a reply without leaving this page."
              countLabel="ticket status"
              countValue={ticket ? ticket.status : "0"}
              primaryAction={
                <Button type="button" variant="accent" size="md" className="w-full sm:w-auto" onClick={() => setOpenTicket(true)}>
                  <Ticket className="h-4 w-4" aria-hidden="true" />
                  Load Ticket
                </Button>
              }
              secondaryAction={
                <Button type="button" variant="outline" size="md" className="w-full sm:w-auto" onClick={() => setOpenTicket(false)}>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Close Preview
                </Button>
              }
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
                <FormField label="Ticket Number" htmlFor="ticket-number">
                  <Input
                    id="ticket-number"
                    value={ticketNumber}
                    onChange={(event) => setTicketNumber(event.target.value)}
                    placeholder="Enter ticket number"
                    className="h-12"
                  />
                </FormField>
                <Button type="button" variant="accent" size="lg" className="w-full self-end" onClick={() => toast({ title: "Ticket lookup ready", description: "This will connect to future support ticket data.", variant: "success" })}>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Track Ticket
                </Button>
              </div>
            </Card>
          </motion.div>

          {ticket ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <motion.div variants={itemVariants}>
                <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Ticket details</p>
                      <h2 className="mt-2 text-xl font-black text-text">{ticket.ticketNumber}</h2>
                    </div>
                    <Badge variant={ticket.status === "Resolved" ? "success" : ticket.status === "Closed" ? "neutral" : "warning"}>{ticket.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Issue Category", value: ticket.issueCategory, icon: Ticket },
                      { label: "Priority", value: ticket.priority, icon: AlertTriangle },
                      { label: "Status", value: ticket.status, icon: CheckCircle2 },
                      { label: "Attachments", value: `${ticket.attachments.length} files`, icon: Paperclip },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                              <p className="mt-1 text-sm font-semibold text-text">{item.value}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-background-secondary/35 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Description</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-text">{ticket.description}</p>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-dashed border-border bg-white/75 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Attachments placeholder</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.attachments.map((file) => (
                        <Badge key={file} variant="neutral">
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button type="button" variant="accent" size="md" className="w-full" onClick={() => toast({ title: "Reply sent", description: "The ticket reply box is a frontend placeholder.", variant: "success" })}>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Reply
                    </Button>
                    <Button type="button" variant="outline" size="md" className="w-full" onClick={() => setOpenTicket(false)}>
                      Close Ticket
                    </Button>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-4">
                <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Conversation timeline</p>
                      <h2 className="mt-2 text-xl font-black text-text">Support updates</h2>
                    </div>
                    <Clock3 className="h-5 w-5 text-muted" aria-hidden="true" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {ticket.timeline.map((item, index) => (
                      <div key={item.id} className="flex gap-3 rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <span className="text-[11px] font-black">{index + 1}</span>
                          </div>
                          {index < ticket.timeline.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-text">{item.title}</p>
                            <Badge variant="neutral">{item.time}</Badge>
                          </div>
                          <p className="text-xs font-medium leading-6 text-muted">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Reply box</p>
                      <h2 className="mt-2 text-xl font-black text-text">Send a response</h2>
                    </div>
                    <MessageSquare className="h-5 w-5 text-muted" aria-hidden="true" />
                  </div>
                  <FormField label="Your reply" htmlFor="ticket-reply">
                    <textarea
                      id="ticket-reply"
                      value={ticketReply}
                      onChange={(event) => setTicketReply(event.target.value)}
                      rows={5}
                      className={cn(
                        "flex w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text",
                        "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      )}
                      placeholder="Type your reply here"
                    />
                  </FormField>
                  <Button type="button" variant="accent" size="md" className="mt-4 w-full" onClick={() => toast({ title: "Reply saved", description: "The support reply is stored as frontend-only content.", variant: "success" })}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send Reply
                  </Button>
                </Card>
              </motion.div>
            </div>
          ) : (
            <NoTicketsState onAction={() => setOpenTicket(true)} />
          )}
        </div>
      </div>
    </motion.section>
  );
}

export { HelpCenterPage, ContactPage, FaqPage, SupportTicketPage, SupportSkeleton };
