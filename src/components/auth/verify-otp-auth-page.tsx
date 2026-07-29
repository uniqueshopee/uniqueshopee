"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AuthCard,
  AuthHeader,
  AuthPageShell,
  OtpInput,
  ValidationMessage,
} from "./auth-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUserRoleKey, resendVerificationEmail, sendPhoneOtp, verifyPhoneOtp } from "@/lib/supabase/auth";
import { buildAuthRedirectUrl } from "@/lib/auth/redirect";
import { resolvePostAuthPath } from "@/lib/auth";

const RESEND_SECONDS = 28;

function VerifyOtpAuthPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() ?? "";
  const phone = searchParams.get("phone")?.trim() ?? "";
  const mode = searchParams.get("mode")?.trim() ?? "";
  const isPhoneVerification = Boolean(phone) && (mode === "phone-login" || mode === "phone-signup" || !email);
  const isEmailVerification = Boolean(email) || searchParams.get("mode") === "email-verification";
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<
    | { tone: "info" | "success" | "error"; title: string; description: string }
    | null
  >({
    tone: "info",
    title: isEmailVerification ? "Check your email" : "Enter the code to continue",
    description: isEmailVerification
      ? "We sent a verification link to your inbox. Open it to finish creating your account."
      : "Enter the 6 digit code sent to your mobile number.",
  });
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendTimer((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendTimer]);

  const formattedTimer = useMemo(() => {
    const minutes = Math.floor(resendTimer / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.max(0, resendTimer % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [resendTimer]);

  const canSubmit = /^\d{6}$/.test(otp) && !isSubmitting;

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      setStatus({
        tone: "error",
        title: "Enter all 6 digits",
        description: "The OTP field needs a complete 6 digit code before verification can continue.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      tone: "info",
      title: "Verifying code",
      description: "Please wait while we confirm your code.",
    });

    if (isPhoneVerification) {
      const client = getSupabaseBrowserClient();

      if (!client) {
        setIsSubmitting(false);
        setStatus({
          tone: "error",
          title: "Unable to continue",
          description: "Please try again in a moment.",
        });
        return;
      }

      const result = await verifyPhoneOtp(phone, otp, client);

      if (result.error) {
        setIsSubmitting(false);
        setStatus({
          tone: "error",
          title: "Unable to continue",
          description: "Please check the code and try again.",
        });
        return;
      }

      const role = await getCurrentUserRoleKey(client);
      const target = resolvePostAuthPath(role);

      setIsSubmitting(false);
      setStatus({
        tone: "success",
        title: "Code verified",
        description: "Redirecting now.",
      });
      window.location.assign(target);
      return;
    }

    window.setTimeout(() => {
      setIsSubmitting(false);
      setStatus({
        tone: "success",
        title: "Code verified",
        description: "Your account is ready.",
      });
    }, 750);
  };

  const handleResend = () => {
    setResendTimer(RESEND_SECONDS);
    setOtp("");
    setStatus({
      tone: "info",
      title: "Code resent",
      description: "Please check your mobile number for the newest code.",
    });
  };

  const handleResendEmail = async () => {
    const client = getSupabaseBrowserClient();

    if (!client || !email) {
      setStatus({
        tone: "error",
        title: "Unable to resend",
        description: "Please return to registration and request a fresh verification email.",
      });
      return;
    }

    setResendLoading(true);
    setStatus({
      tone: "info",
      title: "Resending verification email",
      description: "Please wait while we send the new link.",
    });

    const result = await resendVerificationEmail(
      email,
      buildAuthRedirectUrl("/verify-otp", {
        email,
        mode: "email-verification",
      }),
      client,
    );

    if (result.error) {
      setResendLoading(false);
      setStatus({
        tone: "error",
        title: "Unable to continue",
        description: "Please try again in a moment.",
      });
      return;
    }

    setResendLoading(false);
    setStatus({
      tone: "success",
      title: "Verification email sent",
      description: "Please open the newest message in your inbox to continue.",
    });
  };

  const handleResendPhoneCode = async () => {
    const client = getSupabaseBrowserClient();

    if (!client || !phone) {
      setStatus({
        tone: "error",
        title: "Unable to continue",
        description: "Please return to login or sign-up and try again.",
      });
      return;
    }

    setResendLoading(true);
    setStatus({
      tone: "info",
      title: "Resending code",
      description: "Please wait while we send a fresh code.",
    });

    const result = await sendPhoneOtp({
      phone,
      client,
      shouldCreateUser: mode === "phone-signup",
    });

    if (result.error) {
      setResendLoading(false);
      setStatus({
        tone: "error",
        title: "Unable to continue",
        description: "Please try again in a moment.",
      });
      return;
    }

    setResendLoading(false);
    setResendTimer(RESEND_SECONDS);
    setOtp("");
    setStatus({
      tone: "success",
      title: "Code resent",
      description: "Please check your mobile number for the newest code.",
    });
  };

  if (isEmailVerification) {
    return (
      <AuthPageShell>
        <div className="mx-auto w-full max-w-xl">
          <AuthCard className="p-5 sm:p-6 lg:p-8">
            <div className="space-y-6">
              <AuthHeader
                title="Verify Email"
                subtitle="Open the verification link we sent to your email address to activate your account."
                backHref="/login"
              />

              {status ? (
                <ValidationMessage
                  tone={status.tone}
                  title={status.title}
                  description={status.description}
                  action={
                    <Link href="/login" className="text-sm font-semibold underline-offset-4 hover:underline">
                      Back to login
                    </Link>
                  }
                />
              ) : null}

              <div className="space-y-3 rounded-[1.25rem] border border-border/70 bg-white/80 p-4">
                <p className="text-sm font-semibold text-text">Verification email sent to</p>
                <p className="text-sm font-medium text-muted">{email || "your inbox"}</p>
                <p className="text-sm font-medium text-muted">
                  If you do not see it, check spam or tap resend below.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  loading={resendLoading}
                  disabled={resendLoading}
                  onClick={handleResendEmail}
                >
                  Resend Verification Email
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/login">Back to Login</Link>
                </Button>
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
          <div className="space-y-6">
            <AuthHeader
              title="Verify OTP"
              subtitle="Enter the 6 digit code sent to your mobile number."
              backHref={isPhoneVerification ? "/login" : "/forgot-password"}
            />

            {status ? (
              <ValidationMessage
                tone={status.tone}
                title={status.title}
                description={status.description}
                action={
                  <Link href={isPhoneVerification ? "/login" : "/forgot-password"} className="text-sm font-semibold underline-offset-4 hover:underline">
                    Change number
                  </Link>
                }
              />
            ) : null}

            <form className="space-y-5" onSubmit={handleVerify}>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text">Code sent to</p>
                <p className="text-sm font-medium text-muted">
                  {phone || "your mobile number"}{" "}
                  <Link href={isPhoneVerification ? "/login" : "/forgot-password"} className="font-semibold text-accent">
                    Change
                  </Link>
                </p>
              </div>

              <OtpInput value={otp} onChange={setOtp} autoFocus disabled={isSubmitting} ariaLabel="Enter the 6 digit OTP code" />

              <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-muted">
                  Didn&apos;t receive code?{" "}
                  {resendTimer > 0 ? (
                    <span className="font-semibold text-accent">Resend in {formattedTimer}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={isPhoneVerification ? handleResendPhoneCode : handleResend}
                      className="font-semibold text-accent transition-colors hover:text-accent/80"
                      disabled={resendLoading}
                    >
                      Resend code
                    </button>
                  )}
                </p>
              </div>

              <Button type="submit" variant="accent" size="lg" className="w-full" loading={isSubmitting} disabled={!canSubmit}>
                Verify OTP
              </Button>
            </form>
          </div>
        </AuthCard>
      </div>
    </AuthPageShell>
  );
}

export { VerifyOtpAuthPage };
