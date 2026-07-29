"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
  MessageCircleMore,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AuthStatusTone = "success" | "error" | "info";

type AuthIllustrationVariant = "login" | "register" | "otp" | "forgot" | "reset";

type AuthPageShellProps = {
  children: React.ReactNode;
  className?: string;
};

type AuthHeaderProps = {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
};

type ValidationMessageProps = {
  tone?: AuthStatusTone;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

type SocialLoginButtonsProps = {
  googleLabel?: string;
  phoneLabel?: string;
  showGoogle?: boolean;
  showPhone?: boolean;
  googleDisabled?: boolean;
  phoneDisabled?: boolean;
  onGoogleClick?: () => void | Promise<void>;
  className?: string;
};

type PasswordStrengthIndicatorProps = {
  password: string;
  className?: string;
};

type PasswordFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  className?: string;
};

type PhoneFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  countryCode?: string;
  className?: string;
};

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  className?: string;
};

type RouteSkeletonProps = {
  split?: boolean;
};

const AUTH_COPY: Record<
  AuthIllustrationVariant,
  { eyebrow: string; title: string; description: string; accent: string; icon: React.ElementType }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Fast access to your saved cart and wishlist",
    description: "Sign in once and keep your shopping flow, saved addresses, and offer history in sync.",
    accent: "from-accent/20 via-white to-sky-100/50",
    icon: ShoppingBag,
  },
  register: {
    eyebrow: "Create your profile",
    title: "Set up a premium account in a few quick steps",
    description: "Unlock faster checkout, saved delivery details, and a cleaner future integration path.",
    accent: "from-orange-200/40 via-white to-amber-100/60",
    icon: UserRound,
  },
  otp: {
    eyebrow: "One-time verification",
    title: "Secure your account with a short verification code",
    description: "OTP verification keeps email, phone, and password flows quick and secure.",
    accent: "from-sky-200/40 via-white to-orange-100/50",
    icon: ShieldCheck,
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Send a secure reset code to your email or phone",
    description: "Keep password recovery simple, secure, and easy to use.",
    accent: "from-amber-200/40 via-white to-orange-100/50",
    icon: Mail,
  },
  reset: {
    eyebrow: "Set a new password",
    title: "Finish recovery with a strong new password",
    description: "Keep the reset experience simple, clear, and secure.",
    accent: "from-orange-200/40 via-white to-sky-100/45",
    icon: LockKeyhole,
  },
};

function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <section className={cn("relative isolate overflow-hidden border-b border-border surface-warm", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-orange-300/10 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-200/10 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </section>
  );
}

function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={cn(
        "rounded-[1.9rem] border-white/80 bg-white/92 shadow-[var(--shadow-lg)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </Card>
  );
}

function AuthBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-accent via-[#fb923c] to-[#fdba74] text-white shadow-[0_16px_30px_-16px_rgba(249,115,22,0.55)]">
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className={cn("truncate font-black tracking-tight text-text", compact ? "text-lg" : "text-xl")}>
          UniqueShopee
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Paints | Plumbing | Home Improvement
        </p>
      </div>
    </div>
  );
}

function AuthHeader({ title, subtitle, backHref, backLabel = "Back" }: AuthHeaderProps) {
  return (
    <div className="space-y-4">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-text transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}

      <div className="space-y-3">
        <AuthBrandMark />
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1>
          <p className="max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function AuthFooter({
  prompt,
  actionLabel,
  actionHref,
}: {
  prompt: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <p className="text-center text-sm font-medium text-muted">
      {prompt}{" "}
      <Link
        href={actionHref}
        className="font-semibold text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {actionLabel}
      </Link>
    </p>
  );
}

function AuthDivider({ label = "or continue with" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

function ValidationMessage({ tone = "info", title, description, action, className }: ValidationMessageProps) {
  const styles = {
    success: "border-success/15 bg-success/8 text-success",
    error: "border-danger/15 bg-danger/8 text-danger",
    info: "border-accent/15 bg-accent/8 text-accent",
  } as const;

  const icons = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info,
  } as const;

  const Icon = icons[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-[1.2rem] border px-4 py-3 shadow-[var(--shadow-sm)]",
        styles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        {description ? <p className="mt-0.5 text-sm font-medium opacity-90">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SocialLoginButtons({
  googleLabel = "Continue with Google",
  phoneLabel = "Continue with Phone",
  showGoogle = true,
  showPhone = true,
  googleDisabled = false,
  phoneDisabled = false,
  onGoogleClick,
  className,
}: SocialLoginButtonsProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        showGoogle && showPhone ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {showGoogle ? (
        <Button type="button" variant="outline" size="md" className="w-full" onClick={onGoogleClick} disabled={googleDisabled}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-[#4285F4]">
            G
          </span>
          {googleLabel}
        </Button>
      ) : null}
      {showPhone ? (
        <Button type="button" variant="outline" size="md" className="w-full" disabled={phoneDisabled}>
          <Phone className="h-4 w-4 text-success" aria-hidden="true" />
          {phoneLabel}
        </Button>
      ) : null}
    </div>
  );
}

function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const level =
    score <= 1
      ? { label: "Weak", tone: "bg-danger", text: "text-danger" }
      : score === 2
        ? { label: "Fair", tone: "bg-warning", text: "text-warning" }
        : score === 3
          ? { label: "Good", tone: "bg-[#f59e0b]", text: "text-[#b45309]" }
          : { label: "Strong", tone: "bg-success", text: "text-success" };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Password strength</p>
        <span className={cn("text-xs font-semibold", level.text)}>{level.label}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 rounded-full bg-background-secondary",
              index < score && level.tone,
            )}
          />
        ))}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  autoComplete = "current-password",
  className,
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint}>
      <div className={cn("relative", className)}>
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          error={!!error}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex h-full w-11 items-center justify-center text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </FormField>
  );
}

function PhoneField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  countryCode = "+91",
  className,
}: PhoneFieldProps) {
  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint}>
      <div className={cn("flex items-stretch overflow-hidden rounded-[var(--radius-md)] border border-border bg-background", error && "border-danger", className)}>
        <span className="flex min-h-11 items-center gap-2 border-r border-border bg-background-secondary px-3 text-sm font-semibold text-text">
          <span aria-hidden="true">IN</span>
          {countryCode}
        </span>
        <Input
          id={id}
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="tel"
          inputMode="tel"
          error={!!error}
          className="h-11 flex-1 rounded-none border-0 bg-transparent focus-visible:ring-0"
        />
      </div>
    </FormField>
  );
}

function AuthIllustration({ variant, className }: { variant: AuthIllustrationVariant; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const copy = AUTH_COPY[variant];
  const Icon = copy.icon;

  return (
    <Card
      className={cn(
        "relative hidden overflow-hidden rounded-[1.9rem] border-white/75 bg-gradient-to-br from-white via-white to-[#fff4e7] p-6 shadow-[var(--shadow-lg)] lg:block",
        className,
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", copy.accent)} aria-hidden="true" />
      <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-white/65 blur-2xl" aria-hidden="true" />
      <div className="absolute right-12 top-16 h-24 w-24 rounded-full bg-orange-300/20 blur-2xl" aria-hidden="true" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-full flex-col justify-between"
      >
        <div className="space-y-3">
          <p className="eyebrow-font text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">{copy.eyebrow}</p>
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-text">{copy.title}</h2>
            <p className="text-sm font-medium leading-6 text-muted">{copy.description}</p>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[26rem] items-center justify-center py-8">
          <div className="absolute left-6 top-8 h-20 w-20 rounded-full bg-white/65 blur-2xl" aria-hidden="true" />
          <div className="absolute right-8 top-16 h-16 w-16 rounded-full bg-orange-300/20 blur-2xl" aria-hidden="true" />

          <div className="relative flex aspect-square w-full max-w-[19rem] items-center justify-center">
            <div className="absolute inset-10 rounded-[2.2rem] border border-white/80 bg-white/55 shadow-[var(--shadow-md)] backdrop-blur-sm" />
            <div className="absolute inset-16 rounded-[1.9rem] border border-accent/10 bg-gradient-to-br from-white/80 to-white/50" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-accent via-[#fb923c] to-[#fdba74] text-white shadow-[0_28px_50px_-24px_rgba(249,115,22,0.8)]">
              <Icon className="h-14 w-14" aria-hidden="true" />
            </div>

            <div className="absolute left-4 top-12 rounded-[1.1rem] border border-white/90 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                <p className="text-xs font-semibold text-text">Premium UI ready</p>
              </div>
            </div>
            <div className="absolute bottom-8 right-6 rounded-[1.1rem] border border-white/90 bg-white/90 px-4 py-3 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                <p className="text-xs font-semibold text-text">Future Supabase hook</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[1.25rem] border border-white/85 bg-white/85 p-3 shadow-[var(--shadow-sm)]">
            <MessageCircleMore className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-text">OTP ready</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/85 bg-white/85 p-3 shadow-[var(--shadow-sm)]">
            <Phone className="h-5 w-5 text-success" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-text">Phone login</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/85 bg-white/85 p-3 shadow-[var(--shadow-sm)]">
            <Star className="h-5 w-5 text-warning" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-text">Premium feel</p>
          </div>
        </div>
      </motion.div>
    </Card>
  );
}

function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  ariaLabel = "Verification code",
  className,
}: OtpInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  React.useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  const focusInput = (index: number) => {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  };

  const updateDigits = (nextDigits: string[]) => {
    onChange(nextDigits.join("").slice(0, length));
  };

  const handleChange = (index: number, nextValue: string) => {
    const clean = nextValue.replace(/\D/g, "");
    if (!clean) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      updateDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    const chars = clean.split("").slice(0, length - index);
    chars.forEach((char, offset) => {
      nextDigits[index + offset] = char;
    });
    updateDigits(nextDigits);
    const nextIndex = Math.min(index + chars.length, length - 1);
    focusInput(nextIndex);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextDigits = [...digits];
      if (nextDigits[index]) {
        nextDigits[index] = "";
        updateDigits(nextDigits);
        focusInput(index);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = "";
        updateDigits(nextDigits);
        focusInput(index - 1);
      }
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) {
      return;
    }

    const nextDigits = [...digits];
    pasted
      .split("")
      .slice(0, length - index)
      .forEach((char, offset) => {
        nextDigits[index + offset] = char;
      });
    updateDigits(nextDigits);
    const nextIndex = Math.min(index + pasted.length, length - 1);
    focusInput(nextIndex);
  };

  return (
    <div className={cn("flex items-center justify-between gap-2 sm:gap-3", className)} role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={(event) => handlePaste(event, index)}
          disabled={disabled}
          aria-label={`OTP digit ${index + 1}`}
          className={cn(
            "h-12 w-11 rounded-[1rem] border border-border bg-white text-center text-base font-bold text-text shadow-[var(--shadow-sm)]",
            "transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50",
            digit ? "border-accent/25" : "",
          )}
        />
      ))}
    </div>
  );
}

function AuthRouteSkeleton({ split = false }: RouteSkeletonProps) {
  if (split) {
    return (
      <AuthPageShell>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.02fr)_0.98fr] lg:gap-6">
          <AuthCard className="p-5 sm:p-6 lg:p-7">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-[1rem]" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-12 w-full rounded-full" />
                <Skeleton className="h-12 w-full rounded-full" />
              </div>
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-5 w-40 mx-auto" />
            </div>
          </AuthCard>
          <AuthCard className="hidden p-6 lg:block">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-80" />
              <Skeleton className="aspect-square w-full rounded-[2rem]" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20 rounded-[1.25rem]" />
                <Skeleton className="h-20 rounded-[1.25rem]" />
                <Skeleton className="h-20 rounded-[1.25rem]" />
              </div>
            </div>
          </AuthCard>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="mx-auto w-full max-w-xl">
        <AuthCard className="p-5 sm:p-6 lg:p-8">
          <div className="space-y-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </AuthCard>
      </div>
    </AuthPageShell>
  );
}

export {
  AuthPageShell,
  AuthCard,
  AuthBrandMark,
  AuthHeader,
  AuthFooter,
  AuthDivider,
  ValidationMessage,
  SocialLoginButtons,
  PasswordStrengthIndicator,
  PasswordField,
  PhoneField,
  AuthIllustration,
  OtpInput,
  AuthRouteSkeleton,
};
