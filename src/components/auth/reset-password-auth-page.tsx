"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  AuthCard,
  AuthHeader,
  AuthIllustration,
  AuthPageShell,
  PasswordField,
  PasswordStrengthIndicator,
  ValidationMessage,
} from "./auth-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateSupabasePassword } from "@/lib/supabase/auth";
import { UI_MESSAGES } from "@/lib/messages";

const resetSchema = z
  .object({
    password: z
      .string()
      .trim()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Add at least one letter")
      .regex(/\d/, "Add at least one number"),
    confirmPassword: z.string().trim().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordAuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    | { tone: "info" | "success" | "error"; title: string; description: string }
    | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");
  const submitReset = form.handleSubmit(
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
        title: "Resetting password",
        description: "Please wait while we update your password.",
      });

      const result = await updateSupabasePassword(values.password, client);

      if (result.error) {
        setIsSubmitting(false);
        setStatus({
          tone: "error",
          title: "Password update failed",
          description: result.error,
        });
        return;
      }

      setStatus({
        tone: "success",
        title: "Password Updated",
        description: UI_MESSAGES.profile.passwordUpdated,
      });
      router.replace("/login?reset=success");
      router.refresh();
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
      <div className="mx-auto w-full max-w-xl">
        <AuthCard className="p-5 sm:p-6 lg:p-8">
          <div className="space-y-6">
            <AuthHeader
              title="Reset Password"
              subtitle="Create a new password for your account and keep your shopping history secure."
              backHref="/login"
            />

            <AuthIllustration variant="reset" className="block lg:hidden" />

            {status ? (
              <ValidationMessage tone={status.tone} title={status.title} description={status.description} />
            ) : null}

            <form className="space-y-4" onSubmit={submitReset}>
              <PasswordField
                id="reset-password"
                label="New Password"
                placeholder="Enter new password"
                value={form.watch("password") ?? ""}
                onChange={(value) => {
                  form.setValue("password", value, { shouldValidate: true, shouldDirty: true });
                  form.trigger("confirmPassword");
                }}
                error={errors.password?.message}
                autoComplete="new-password"
              />

              <PasswordStrengthIndicator password={password} />

              <PasswordField
                id="reset-confirm-password"
                label="Confirm Password"
                placeholder="Confirm new password"
                value={form.watch("confirmPassword") ?? ""}
                onChange={(value) => form.setValue("confirmPassword", value, { shouldValidate: true, shouldDirty: true })}
                error={errors.confirmPassword?.message}
                autoComplete="new-password"
              />

              <Button type="submit" variant="accent" size="lg" className="w-full" loading={isSubmitting} disabled={!canSubmit}>
                Reset Password
              </Button>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" size="md" className="w-full">
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          </div>
        </AuthCard>
      </div>
    </AuthPageShell>
  );
}

export { ResetPasswordAuthPage };
