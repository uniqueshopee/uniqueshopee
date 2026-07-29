"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Bell,
  ChevronRight,
  CircleUserRound,
  Coins,
  FileText,
  HelpCircle,
  MapPin,
  Package,
  PenSquare,
  ShieldCheck,
  Share2,
  ShoppingCart,
  UserCircle2,
  LogOut,
  Trash2,
  Ticket,
  Waves,
  ShieldAlert,
  Calculator,
  SquareStack,
  Globe,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ComponentType, SVGProps } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input, FormField } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { softDeleteCurrentProfile } from "@/lib/account-service";

type MenuItem = {
  label: string;
  description?: string;
  icon: IconType;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  tone?: string;
  destructive?: boolean;
};

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const PROFILE_ACTIONS = [
  { label: "Orders", href: "/orders", icon: Package, tone: "bg-emerald-500/12 text-emerald-700" },
  { label: "Wishlist", href: "/wishlist", icon: Heart, tone: "bg-rose-500/12 text-rose-700" },
  { label: "Saved Cart", href: "/cart", icon: ShoppingCart, tone: "bg-sky-500/12 text-sky-700" },
  { label: "Offers", href: "/coupons", icon: Ticket, tone: "bg-amber-500/12 text-amber-700" },
];

function PaletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3C7.03 3 3 6.58 3 11c0 4.42 4.03 8 9 8h1.25a1.75 1.75 0 0 0 1.75-1.75c0-.97.78-1.75 1.75-1.75H16c2.21 0 4-1.79 4-4 0-4.42-4.03-8-8-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
      <circle cx="11" cy="8" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 4.5h2l1.2 3.4-1.5 1.2c1 2 2.6 3.6 4.6 4.6l1.2-1.5 3.4 1.2v2c0 1.1-.9 2-2 2C10.3 17.4 6.6 13.7 6.6 9c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PAINT_TOOLS: MenuItem[] = [
  { label: "Paint Calculator", description: "Estimate required quantity", icon: Calculator, href: "/tools/paint-calculator", badge: "NEW" },
  { label: "Colour Shade Finder", description: "Explore 2000+ shades", icon: PaletteIcon, disabled: true },
  { label: "Coverage Calculator", description: "Estimate paint coverage", icon: SquareStack, href: "/tools/paint-calculator" },
  { label: "Project Estimator", description: "Estimate total project cost", icon: PenSquare, href: "/tools/paint-calculator" },
  { label: "Waterproofing Guide", description: "Protect your home", icon: Waves, href: "/help" },
];

const ACCOUNT_MENU: MenuItem[] = [
  { label: "Personal Information", description: "Name, Email, Phone", icon: CircleUserRound, href: "/account" },
  { label: "Manage Addresses", description: "Delivery locations", icon: MapPin, href: "/account/addresses" },
  { label: "Login & Security", description: "Password & authentication", icon: ShieldCheck, href: "/reset-password" },
  { label: "Notifications", description: "Alerts and updates", icon: Bell, href: "/notifications" },
  { label: "Language", description: "English / Hindi", icon: Globe },
];

const REWARDS_MENU: MenuItem[] = [
  { label: "Coupons", description: "Available promo codes", icon: Ticket, href: "/coupons" },
  { label: "Reward Points", description: "Redeem points for discounts", icon: Coins, href: "/rewards" },
  { label: "Referral Program", description: "Invite & earn", icon: Share2 },
];

const HELP_MENU: MenuItem[] = [
  { label: "Contact Support", description: "Call, WhatsApp, or email us", icon: PhoneIcon, href: "/contact" },
  { label: "FAQs", description: "Common questions", icon: HelpCircle, href: "/faq" },
  { label: "Returns & Refunds", description: "Manage returns", icon: FileText, href: "/support-ticket" },
];

const ABOUT_MENU: MenuItem[] = [
  { label: "Privacy Policy", icon: ShieldAlert, href: "/privacy-policy" },
  { label: "Terms & Conditions", icon: FileText, href: "/terms" },
  { label: "Share App", icon: Share2 },
];

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

function AccountPage() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { signOut, profile, refresh, user } = useAuth();
  const displayName = profile?.full_name?.trim() || "Profile not available";
  const displayPhone = profile?.phone?.trim() || "Phone not set";
  const statusLabel = profile?.status?.trim() || "Account";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "?";
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name ?? "");
  const [editPhone, setEditPhone] = useState(profile?.phone ?? "");
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  const accountId = profile?.id ?? user?.id ?? null;
  const referralLink = useMemo(() => {
    if (!profile?.customer_code) {
      return "";
    }
    if (typeof window === "undefined") {
      return `https://uniqueshopee.com/register?ref=${encodeURIComponent(profile.customer_code)}`;
    }
    return `${window.location.origin}/register?ref=${encodeURIComponent(profile.customer_code)}`;
  }, [profile?.customer_code]);

  useEffect(() => {
    setEditName(profile?.full_name ?? "");
    setEditPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedLanguage = window.localStorage.getItem("account.language");
    if (savedLanguage === "Hindi") {
      setLanguage("Hindi");
    }
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    if (!accountId) {
      toast({ title: "Account unavailable", description: "Please sign in again to manage your account.", variant: "danger" });
      return;
    }

    const confirmed = window.confirm("Delete your account? This will soft-delete your profile and sign you out.");
    if (!confirmed) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Please try again after reconnecting.", variant: "danger" });
      return;
    }

    setDeleteBusy(true);
    const result = await softDeleteCurrentProfile(client, accountId);
    setDeleteBusy(false);

    if (result.error) {
      toast({ title: "Delete failed", description: result.error, variant: "danger" });
      return;
    }

    await signOut();
    router.replace("/");
    router.refresh();
    toast({ title: "Account deleted", description: "Your account was removed from this session.", variant: "success" });
  };

  const handleLanguageChange = (nextLanguage: "English" | "Hindi") => {
    setLanguage(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("account.language", nextLanguage);
    }
    toast({
      title: "Language updated",
      description: `App language set to ${nextLanguage}.`,
      variant: "success",
    });
    setLanguageOpen(false);
  };

  const handleReferralShare = async () => {
    if (!profile?.customer_code) {
      toast({ title: "Referral unavailable", description: "Your referral code is not ready yet.", variant: "warning" });
      return;
    }

    const message = `Join UniqueShopee using my referral code ${profile.customer_code}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "UniqueShopee referral", text: message, url: referralLink || window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(`${message} ${referralLink}`);
      toast({ title: "Referral copied", description: "Your referral text is ready to paste.", variant: "success" });
    } catch {
      toast({ title: "Share unavailable", description: "We could not open the share flow.", variant: "danger" });
    }
  };

  const handleShareApp = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://uniqueshopee.com";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "UniqueShopee",
          text: "Check out UniqueShopee for paints and plumbing essentials.",
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "App link copied", description: "The app link is ready to share.", variant: "success" });
    } catch {
      toast({ title: "Share unavailable", description: "We could not open the share flow.", variant: "danger" });
    }
  };

  const handleSaveProfile = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Profile unavailable", description: "Supabase is not configured in this session.", variant: "danger" });
      return;
    }

    if (!profile) {
      toast({ title: "Profile unavailable", description: "No live profile was found for this session.", variant: "danger" });
      return;
    }

    setSaveBusy(true);
    const { error } = await client
      .from("profiles")
      .update({
        full_name: editName.trim() || null,
        phone: editPhone.trim() || null,
      })
      .eq("id", profile.id);

    setSaveBusy(false);

    if (error) {
      toast({ title: "Profile update failed", description: error.message, variant: "danger" });
      return;
    }

    await refresh();
    setEditOpen(false);
    toast({ title: "Profile updated", description: "Your account details were saved successfully.", variant: "success" });
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
        <motion.div variants={itemVariants} className="space-y-4">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/94 p-4 shadow-[var(--shadow-lg)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
                  Profile
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm font-medium text-muted">{profile?.email ?? "Email not set"}</p>
                <p className="mt-1 text-sm font-medium text-muted">{displayPhone}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.6rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,247,235,0.92),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0e2744] to-[#173f6f] text-xl font-bold text-white shadow-[var(--shadow-md)]">
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-text">{displayName}</p>
                  <p className="mt-1 text-sm font-medium text-muted">{statusLabel}</p>
                </div>
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-muted shadow-[var(--shadow-sm)] sm:flex">
                  <UserCircle2 className="h-5 w-5" aria-hidden={true} />
                </div>
              </div>
              <Button variant="outline" size="lg" className="mt-4 w-full justify-center" onClick={() => setEditOpen(true)}>
                <PenSquare className="h-4 w-4" aria-hidden={true} />
                Edit Profile
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-6">
          <Card className="rounded-[1.6rem] border-white/80 bg-white/94 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted eyebrow-font">Quick actions</p>
            <h2 className="mt-1 text-base font-bold text-text">Quick Actions</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-4">
              {PROFILE_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group rounded-[1.35rem] border border-border/70 bg-background-secondary/35 p-3 text-center transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem]", action.tone)}>
                      <Icon className="h-5 w-5" aria-hidden={true} />
                    </div>
                    <span className="mt-2 block text-sm font-bold text-text">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <div className="mt-6 space-y-4">
          <MenuSection
            title="Account"
            items={ACCOUNT_MENU}
            actionLabels={{ Language: () => setLanguageOpen(true) }}
            badgeLabels={{ Language: language }}
          />
          <MenuSection title="Paint Tools" items={PAINT_TOOLS} />
          <MenuSection
            title="Rewards"
            items={REWARDS_MENU}
            actionLabels={{ "Referral Program": handleReferralShare }}
          />
          <MenuSection title="Support" items={HELP_MENU} />
          <MenuSection title="Legal" items={ABOUT_MENU} actionLabels={{ "Share App": handleShareApp }} />

          <Card className="rounded-[1.6rem] border-rose-200 bg-rose-50/70 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Danger zone</p>
            <h2 className="mt-1 text-base font-bold text-text">Danger Zone</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden={true} />
                Logout
              </Button>
              <Button variant="danger" size="lg" className="w-full justify-center" loading={deleteBusy} onClick={() => void handleDeleteAccount()}>
                <Trash2 className="h-4 w-4" aria-hidden={true} />
                Delete account
              </Button>
            </div>
          </Card>
        </div>

        <Modal
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Edit Profile"
          description="Update the live profile details stored in Supabase."
          className="max-w-lg"
        >
          <div className="space-y-4">
            <FormField label="Full Name" htmlFor="profile-name">
              <Input id="profile-name" value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Your name" />
            </FormField>
            <FormField label="Phone" htmlFor="profile-phone">
              <Input id="profile-phone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} placeholder="+91 98765 43210" inputMode="tel" />
            </FormField>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="accent" size="md" className="w-full" loading={saveBusy} onClick={() => void handleSaveProfile()}>
                Save Changes
              </Button>
              <Button type="button" variant="outline" size="md" className="w-full" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={languageOpen}
          onOpenChange={setLanguageOpen}
          title="Language"
          description="Choose your preferred app language."
          className="max-w-md"
        >
          <div className="space-y-3">
            {(["English", "Hindi"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleLanguageChange(option)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[1rem] border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  language === option ? "border-transparent bg-accent text-accent-foreground" : "border-border/70 bg-white text-text hover:bg-background-secondary",
                )}
              >
                <span>{option}</span>
                {language === option ? <span className="text-xs uppercase tracking-[0.2em]">Selected</span> : null}
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </motion.section>
  );
}

type MenuSectionProps = {
  title: string;
  items: MenuItem[];
  actionLabels?: Partial<Record<string, () => void>>;
  badgeLabels?: Partial<Record<string, string>>;
};

function MenuSection({ title, items, actionLabels = {}, badgeLabels = {} }: MenuSectionProps) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/94 p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">{title}</p>
      <div className="mt-3 divide-y divide-border/70 overflow-hidden rounded-[1.35rem] border border-border/70 bg-white">
        {items.map((item) => {
          const Icon = item.icon;
          const action = actionLabels[item.label];
          const isLink = !action && !!item.href && item.href !== "#";
          const isDisabled = item.disabled ?? (!isLink && !action);
          const badgeLabel = badgeLabels[item.label] ?? item.badge;
          const row = (
            <div className={cn("flex items-center gap-3 p-3 sm:p-4", isDisabled && "opacity-70")}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-secondary text-muted", item.tone)}>
                <Icon className="h-4 w-4" aria-hidden={true} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-text">{item.label}</p>
                  {!isDisabled && badgeLabel ? (
                    <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                      {badgeLabel}
                    </span>
                  ) : null}
                </div>
                {item.description && <p className="mt-0.5 text-xs font-medium text-muted">{item.description}</p>}
              </div>
              {isDisabled ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted/60" aria-hidden={true} />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden={true} />
              )}
            </div>
          );

          return action ? (
            <button
              key={item.label}
              type="button"
              onClick={action}
              className="block w-full text-left transition-colors hover:bg-background-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {row}
            </button>
          ) : isLink ? (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              className="block transition-colors hover:bg-background-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {row}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              disabled
              aria-disabled="true"
              className="block w-full cursor-not-allowed text-left transition-colors"
            >
              {row}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export { AccountPage };
