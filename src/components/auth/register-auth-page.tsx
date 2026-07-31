"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  PasswordField,
  PasswordStrengthIndicator,
  PhoneField,
  ValidationMessage,
} from "./auth-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUserRoleKey, signUpWithEmailPassword } from "@/lib/supabase/auth";
import { buildAuthRedirectUrl } from "@/lib/auth/redirect";
import { resolvePostAuthPath } from "@/lib/auth";
import { sendPhoneOtpRequest } from "@/lib/phone-auth";
import { UI_MESSAGES } from "@/lib/messages";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name"),
    lastName: z.string().trim().min(1, "Enter your last name"),
    email: z.string().trim().email("Enter a valid email address"),
    mobile: z.string().trim().min(10, "Enter a valid mobile number"),
    password: z
      .string()
      .trim()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Add at least one letter")
      .regex(/\d/, "Add at least one number"),
    confirmPassword: z.string().trim().min(1, "Confirm your password"),
    acceptTerms: z.boolean().refine((value) => value, {
      message: "Accept the terms and privacy policy",
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterAuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    | { tone: "info" | "success" | "error"; title: string; description: string }
    | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const password = form.watch("password");
  const watchedValues = form.watch();

  useEffect(() => {
    if (status?.tone === "error") {
      setStatus(null);
    }
  }, [
    watchedValues.firstName,
    watchedValues.lastName,
    watchedValues.email,
    watchedValues.mobile,
    watchedValues.password,
    watchedValues.confirmPassword,
    watchedValues.acceptTerms,
    status,
  ]);

  const submitRegister = form.handleSubmit(
    async (values) => {
      const client = getSupabaseBrowserClient();

      if (!client) {
        setStatus({
          tone: "info",
          title: "Please try again",
          description: UI_MESSAGES.generic.server,
        });
        return;
      }

      const redirectTo = buildAuthRedirectUrl("/verify-otp", {
        email: values.email,
        mode: "email-verification",
      });

      setIsSubmitting(true);
      setStatus({
        tone: "info",
        title: "Creating your account",
        description: UI_MESSAGES.auth.registrationSuccess,
      });

      const result = await signUpWithEmailPassword({
        email: values.email,
        password: values.password,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        phone: values.mobile,
        client,
        redirectTo,
      });

      if (result.error) {
        setIsSubmitting(false);
        setStatus({
          tone: "error",
          title: "Account creation failed",
          description: result.error,
        });
        return;
      }

      const sessionUser = result.data?.session?.user ?? result.data?.user ?? null;

      if (sessionUser) {
        const role = await getCurrentUserRoleKey(client);
        const target = resolvePostAuthPath(role);
        setStatus({
          tone: "success",
          title: "Account Created",
          description: UI_MESSAGES.auth.accountCreated,
        });
        router.replace(target);
        router.refresh();
        setIsSubmitting(false);
        return;
      }

      setStatus({
        tone: "success",
        title: "Verification email sent",
        description: UI_MESSAGES.auth.verificationEmailSent,
      });
      router.replace(`/verify-otp?email=${encodeURIComponent(values.email)}&mode=email-verification`);
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

  const handlePhoneSignup = async () => {
    const values = form.getValues();
    const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();

    if (!values.firstName.trim() || !values.lastName.trim() || !values.mobile.trim() || !values.acceptTerms) {
      setStatus({
        tone: "info",
        title: "Please check the fields",
        description: UI_MESSAGES.generic.unexpected,
      });
      return;
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      setStatus({
        tone: "info",
        title: "Please try again",
        description: UI_MESSAGES.generic.server,
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      tone: "info",
      title: "Sending code",
      description: UI_MESSAGES.auth.otpSent,
    });

    const result = await sendPhoneOtpRequest({
      phone: values.mobile,
      purpose: "signup",
      fullName,
      email: values.email,
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

    setStatus({
      tone: "success",
      title: "OTP Sent",
      description: UI_MESSAGES.auth.otpSent,
    });
    router.push(
      `/verify-otp?phone=${encodeURIComponent(result.phone)}&challengeId=${encodeURIComponent(result.challengeId)}&mode=phone-signup&name=${encodeURIComponent(fullName)}`,
    );
    setIsSubmitting(false);
  };

  const { errors, isValid } = form.formState;
  const canSubmit = useMemo(() => isValid && !isSubmitting, [isValid, isSubmitting]);

  return (
    <AuthPageShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_0.95fr] lg:items-stretch lg:gap-6">
        <AuthCard className="p-5 sm:p-6 lg:p-8">
          <div className="space-y-6">
            <AuthHeader
              title="Create Your Account"
              subtitle="Join UniqueShopee to save favorite products, track offers, and keep checkout fast."
            />

            {status ? (
              <ValidationMessage tone={status.tone} title={status.title} description={status.description} />
            ) : null}

            <form className="space-y-4" onSubmit={submitRegister}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name" htmlFor="register-first-name" error={errors.firstName?.message}>
                  <Input
                    id="register-first-name"
                    {...form.register("firstName")}
                    placeholder="First name"
                    autoComplete="given-name"
                    error={!!errors.firstName}
                  />
                </FormField>
                <FormField label="Last Name" htmlFor="register-last-name" error={errors.lastName?.message}>
                  <Input
                    id="register-last-name"
                    {...form.register("lastName")}
                    placeholder="Last name"
                    autoComplete="family-name"
                    error={!!errors.lastName}
                  />
                </FormField>
              </div>

              <FormField label="Email Address" htmlFor="register-email" error={errors.email?.message}>
                <Input
                  id="register-email"
                  {...form.register("email")}
                  placeholder="Enter email address"
                  autoComplete="email"
                  error={!!errors.email}
                />
              </FormField>

              <PhoneField
                id="register-mobile"
                label="Mobile Number"
                placeholder="Enter mobile number"
                value={form.watch("mobile") ?? ""}
                onChange={(value) => form.setValue("mobile", value, { shouldValidate: true, shouldDirty: true })}
                error={errors.mobile?.message}
                hint="We will use this for order updates and future phone verification."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordField
                  id="register-password"
                  label="Password"
                  placeholder="Create a password"
                  value={form.watch("password") ?? ""}
                  onChange={(value) => {
                    form.setValue("password", value, { shouldValidate: true, shouldDirty: true });
                    form.trigger("confirmPassword");
                  }}
                  error={errors.password?.message}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="register-confirm-password"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={form.watch("confirmPassword") ?? ""}
                  onChange={(value) => form.setValue("confirmPassword", value, { shouldValidate: true, shouldDirty: true })}
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                />
              </div>

              <PasswordStrengthIndicator password={password} />

              <label className="flex items-start gap-3 rounded-[1.1rem] border border-border/70 bg-white/75 px-4 py-3 text-sm font-medium text-text">
                <input
                  type="checkbox"
                  {...form.register("acceptTerms")}
                  className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <span>
                  I agree to the <span className="font-semibold text-accent">Terms and Conditions</span> and{" "}
                  <span className="font-semibold text-accent">Privacy Policy</span>
                </span>
              </label>
              {errors.acceptTerms ? (
                <p className="text-xs font-medium text-danger" role="alert">
                  {errors.acceptTerms.message}
                </p>
              ) : null}

              <Button
                type="button"
                variant="accent"
                size="lg"
                className="w-full"
                onClick={handlePhoneSignup}
                disabled={isSubmitting}
              >
                Create Account with Phone OTP
              </Button>

              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full border-[#1f3b63] text-[#1f3b63] hover:bg-[#1f3b63] hover:text-white"
                loading={isSubmitting}
                disabled={!canSubmit}
              >
                Create Account with Email
              </Button>
            </form>

            <AuthFooter prompt="Already have an account?" actionLabel="Login" actionHref="/login" />
          </div>
        </AuthCard>

        <AuthIllustration variant="register" />
      </div>
    </AuthPageShell>
  );
}

export { RegisterAuthPage };
