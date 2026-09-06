"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/components/auth/auth-provider";

type ApiResult = { error?: string; challengeId?: string; state?: string; success?: boolean };

export function PublicAccountDeletionAction() {
  const router = useRouter();
  const { loading: authLoading, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEmailProvider = user?.app_metadata?.provider === "email" || user?.identities?.some((identity) => identity.provider === "email") === true;
  const isPhoneProvider = user?.app_metadata?.provider === "phone" || user?.identities?.some((identity) => identity.provider === "phone") === true;

  const reset = () => {
    setPassword("");
    setConfirmed(false);
    setChallengeId(null);
    setOtp("");
    setOtpVerified(false);
    setBusy(false);
    setError(null);
  };

  const openDeletionFlow = () => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent("/account-deletion")}`);
      return;
    }
    setSuccess(false);
    reset();
    setOpen(true);
  };

  const requestOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete/phone-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const result = (await response.json().catch(() => null)) as ApiResult | null;
      if (!response.ok || !result?.challengeId) {
        setError(result?.error ?? "Unable to send the deletion code.");
        return;
      }
      setChallengeId(result.challengeId);
    } catch {
      setError("Unable to send the deletion code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!challengeId || !otp) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete/phone-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", challengeId, otp }),
      });
      const result = (await response.json().catch(() => null)) as ApiResult | null;
      if (!response.ok) {
        setError(result?.error ?? "The deletion code could not be verified.");
        return;
      }
      setOtpVerified(true);
    } catch {
      setError("The deletion code could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirmed || busy || (isEmailProvider && !password) || (isPhoneProvider && !otpVerified)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isPhoneProvider ? { deletionOtpChallengeId: challengeId } : { password }),
      });
      const result = (await response.json().catch(() => null)) as ApiResult | null;
      if (!response.ok || result?.state !== "COMPLETED") {
        setError(result?.error ?? "Account deletion could not be completed.");
        return;
      }
      await signOut();
      setOpen(false);
      reset();
      setSuccess(true);
    } catch {
      setError("Account deletion could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="mt-6 rounded-[1.4rem] border-rose-200 bg-rose-50/70 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Account action</p>
        <h2 className="mt-2 text-xl font-black text-text">Delete your account</h2>
        <p className="mt-2 text-sm font-medium leading-7 text-muted">
          You can permanently delete your UniqueShopee account and eligible associated data. You will need to verify your identity before deletion.
        </p>
        <Button type="button" variant="danger" size="lg" className="mt-4" loading={authLoading} disabled={authLoading} onClick={openDeletionFlow}>
          Delete My Account
        </Button>
      </Card>

      {success ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
          Your UniqueShopee account deletion was completed successfully.
        </p>
      ) : null}

      <Modal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!busy) setOpen(nextOpen);
          if (!nextOpen && !busy) reset();
        }}
        title="Delete your UniqueShopee account?"
        description="This action is permanent and cannot be undone."
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-900">
            <p>Your account and eligible associated data will be permanently deleted.</p>
            <p className="mt-2">Some records such as order history, support records, and verification history may be retained where necessary for legal, security, fraud-prevention, dispute-resolution, or regulatory purposes.</p>
          </div>

          {isEmailProvider ? (
            <FormField label="Current password" htmlFor="public-account-deletion-password">
              <Input id="public-account-deletion-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your current password" />
            </FormField>
          ) : isPhoneProvider ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted">Verify the phone number already authenticated on this account with a dedicated deletion code.</p>
              <Button type="button" variant="outline" size="md" loading={busy && !challengeId} disabled={busy || Boolean(challengeId)} onClick={() => void requestOtp()}>
                Send deletion code
              </Button>
              {challengeId ? (
                <>
                  <FormField label="Deletion code" htmlFor="public-account-deletion-otp">
                    <Input id="public-account-deletion-otp" value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the code" disabled={otpVerified} />
                  </FormField>
                  {!otpVerified ? <Button type="button" variant="outline" size="md" loading={busy} disabled={busy || !otp} onClick={() => void verifyOtp()}>Verify deletion code</Button> : null}
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-semibold text-rose-700">Account deletion is unavailable for this sign-in provider.</p>
          )}

          <label className="flex items-start gap-3 text-sm font-semibold text-text">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent" />
            <span>I understand this permanently deletes my account and cannot be undone.</span>
          </label>
          {error ? <p className="text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="danger" size="md" className="w-full" loading={busy} disabled={!confirmed || busy || (!isEmailProvider && !isPhoneProvider) || (isEmailProvider && !password) || (isPhoneProvider && !otpVerified)} onClick={() => void deleteAccount()}>
              Delete Account
            </Button>
            <Button type="button" variant="outline" size="md" className="w-full" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
