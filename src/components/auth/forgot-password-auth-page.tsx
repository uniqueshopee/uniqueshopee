"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import {
  AuthCard,
  AuthHeader,
  AuthPageShell,
  ValidationMessage,
} from "./auth-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendPasswordResetEmail } from "@/lib/supabase/auth";
import { buildAuthRedirectUrl } from "@/lib/auth/redirect";
import { UI_MESSAGES } from "@/lib/messages";

const forgotSchema = z.object({
  identifier: z.string().trim().email("Enter a valid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

function ForgotPasswordAuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    | { tone: "info" | "success" | "error"; title: string; description: string }
    | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    mode: "onChange",
    defaultValues: { identifier: "" },
  });

  const submitRecovery = form.handleSubmit(
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
      setStatus({
        tone: "info",
        title: "Sending reset email",
        description: UI_MESSAGES.auth.verificationEmailSent,
      });

      const result = await sendPasswordResetEmail(values.identifier, buildAuthRedirectUrl("/reset-password"), client);

      if (result.error) {
        setIsSubmitting(false);
        setStatus({
          tone: "error",
          title: "Unable to continue",
          description: result.error,
        });
        return;
      }

      setStatus({
        tone: "success",
        title: "Verification email sent",
        description: UI_MESSAGES.auth.verificationEmailSent,
      });
      router.refresh();
      setIsSubmitting(false);
    },
    () => {
      setStatus({
        tone: "error",
        title: "Please check the field",
        description: UI_MESSAGES.generic.unexpected,
      });
    },
  );

  const { errors, isValid } = form.formState;
  const canSubmit = isValid && !isSubmitting;

  return (
    <AuthPageShell>
      <div className="mx-auto w-full max-w-xl">
        <AuthCard className="p-5 sm:p-6 lg:p-8">
          <div className="space-y-6">
            <AuthHeader
              title="Forgot Password"
              subtitle="Enter your email address and we will send a secure password reset link."
              backHref="/login"
            />

            {status ? (
              <ValidationMessage tone={status.tone} title={status.title} description={status.description} />
            ) : null}

            <form className="space-y-4" onSubmit={submitRecovery}>
              <FormField
                label="Email Address"
                htmlFor="forgot-identifier"
                error={errors.identifier?.message}
                hint="We will use this email to locate your account and send a reset link."
              >
                <Input
                  id="forgot-identifier"
                  {...form.register("identifier")}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  error={!!errors.identifier}
                />
              </FormField>

              <Button type="submit" variant="accent" size="lg" className="w-full" loading={isSubmitting} disabled={!canSubmit}>
                Send OTP
              </Button>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" size="md" className="w-full">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          </div>
        </AuthCard>
      </div>
    </AuthPageShell>
  );
}

export { ForgotPasswordAuthPage };
