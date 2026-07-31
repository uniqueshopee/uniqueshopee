"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import {
  AuthCard,
  AuthFooter,
  AuthHeader,
  AuthIllustration,
  AuthPageShell,
  ValidationMessage,
  PasswordField,
} from "./auth-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCurrentUserProfile, getCurrentUserRoleKey, signInWithEmailPassword } from "@/lib/supabase/auth";
import { resolvePostAuthPath, sanitizeRedirectPath } from "@/lib/auth";
import { sendPhoneOtpRequest } from "@/lib/phone-auth";
import { UI_MESSAGES } from "@/lib/messages";

const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, "Enter your email or mobile number"),
    password: z.string().trim().optional(),
    rememberMe: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    const identifier = values.identifier.trim();
    const looksLikeEmail = identifier.includes("@");

    if (looksLikeEmail && !values.password?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Enter your password",
      });
    }
  });

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    | { tone: "info" | "success" | "error"; title: string; description: string }
    | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: true,
    },
  });

  const redirectTo = sanitizeRedirectPath(searchParams.get("redirectTo"), "");

  const resolveLoginTarget = async (client: ReturnType<typeof getSupabaseBrowserClient>) => {
    if (!client) {
      return resolvePostAuthPath(null, redirectTo);
    }

    await ensureCurrentUserProfile(client);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const role = await getCurrentUserRoleKey(client);
      if (role) {
        return resolvePostAuthPath(role, redirectTo);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }

    return resolvePostAuthPath(null, redirectTo);
  };

  const submitLogin = form.handleSubmit(
    async (values) => {
      const client = getSupabaseBrowserClient();

        if (!client) {
          setStatus({
            tone: "error",
            title: "Unable to continue",
            description: UI_MESSAGES.generic.server,
          });
          return;
        }

      setIsSubmitting(true);
      const identifier = values.identifier.trim();

      if (identifier.includes("@")) {
        setStatus({
          tone: "info",
          title: "Logging you in",
          description: "Please wait while we sign you in.",
        });

        const result = await signInWithEmailPassword({
          identifier,
          password: values.password ?? "",
          client,
        });

        if (result.error) {
          setIsSubmitting(false);
          setStatus({
            tone: "error",
            title: "Login failed",
            description: result.error,
          });
          return;
        }

        const target = await resolveLoginTarget(client);

        setStatus({
          tone: "success",
          title: "Login Success",
          description: UI_MESSAGES.auth.loginSuccess,
        });
        router.replace(target);
        router.refresh();
        setIsSubmitting(false);
        return;
      }

        setStatus({
          tone: "info",
          title: "Sending code",
          description: UI_MESSAGES.auth.otpSent,
        });

      const result = await sendPhoneOtpRequest({
        phone: identifier,
        purpose: "login",
      });

      if (result.error || !result.phone || !result.challengeId) {
        setIsSubmitting(false);
        setStatus({
          tone: "error",
          title: "Unable to continue",
          description: result.error ?? UI_MESSAGES.generic.unexpected,
        });
        return;
      }

      router.push(
        `/verify-otp?phone=${encodeURIComponent(result.phone)}&challengeId=${encodeURIComponent(result.challengeId)}&mode=phone-login`,
      );
      setIsSubmitting(false);
    },
    () => {
      setStatus({
        tone: "error",
        title: "Please check the fields",
        description: UI_MESSAGES.generic.unexpected,
      });
    },
  );

  const { errors, isValid } = form.formState;
  const canSubmit = isValid && !isSubmitting;

  return (
    <AuthPageShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_0.95fr] lg:items-stretch lg:gap-6">
        <AuthCard className="p-5 sm:p-6 lg:p-8">
          <div className="space-y-6">
            <AuthHeader
              title="Welcome Back"
              subtitle="Login to your account to continue browsing, checkout faster, and keep your wishlist synced."
            />

            {status ? (
              <ValidationMessage tone={status.tone} title={status.title} description={status.description} />
            ) : null}

            <form className="space-y-4" onSubmit={submitLogin}>
              <FormField
                label="Email or Mobile Number"
                htmlFor="login-identifier"
                error={errors.identifier?.message}
                hint="Use your email and password, or your mobile number to receive a code."
              >
                <Input
                  id="login-identifier"
                  {...form.register("identifier")}
                  placeholder="Enter your email or mobile number"
                  autoComplete="username"
                  error={!!errors.identifier}
                />
              </FormField>

              <PasswordField
                id="login-password"
                label="Password"
                placeholder="Enter your password"
                value={form.watch("password") ?? ""}
                onChange={(value) => form.setValue("password", value, { shouldValidate: true, shouldDirty: true })}
                error={errors.password?.message}
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-text">
                  <input
                    type="checkbox"
                    {...form.register("rememberMe")}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" variant="accent" size="lg" className="w-full" loading={isSubmitting} disabled={!canSubmit}>
                Login
              </Button>

              <Button asChild variant="outline" size="md" className="w-full">
                <Link href="/register">Create Account</Link>
              </Button>
            </form>

            <AuthFooter prompt="Need a new account?" actionLabel="Create Account" actionHref="/register" />
          </div>
        </AuthCard>

        <AuthIllustration variant="login" />
      </div>
    </AuthPageShell>
  );
}

export { LoginAuthPage };
