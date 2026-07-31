import type { Session } from "@supabase/supabase-js";
import { UI_MESSAGES } from "@/lib/messages";

export type PhoneAuthChallengePurpose = "login" | "signup";

export type SendPhoneOtpRequest = {
  phone: string;
  purpose: PhoneAuthChallengePurpose;
  fullName?: string | null;
  email?: string | null;
};

export type SendPhoneOtpResponse = {
  error: string | null;
  phone: string | null;
  challengeId: string | null;
  expiresAt: string | null;
};

export type VerifyPhoneOtpRequest = {
  phone: string;
  otp: string;
  challengeId: string;
  purpose: PhoneAuthChallengePurpose;
  fullName?: string | null;
  email?: string | null;
};

export type VerifyPhoneOtpResponse = {
  error: string | null;
  challengeId: string | null;
  session: Session | null;
  redirectTo: string | null;
};

function asJsonBody(value: unknown) {
  return JSON.stringify(value ?? {});
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("+")) {
    const digits = `+${trimmed.slice(1).replace(/\D/g, "")}`;
    return digits.length > 1 ? digits : "";
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length > 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "";
}

export async function sendPhoneOtpRequest(request: SendPhoneOtpRequest): Promise<SendPhoneOtpResponse> {
  const response = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: asJsonBody(request),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    return {
      error: (payload?.error as string | undefined) ?? UI_MESSAGES.generic.server,
      phone: null,
      challengeId: null,
      expiresAt: null,
    };
  }

  return {
    error: null,
    phone: typeof payload?.phone === "string" ? payload.phone : null,
    challengeId: typeof payload?.challengeId === "string" ? payload.challengeId : null,
    expiresAt: typeof payload?.expiresAt === "string" ? payload.expiresAt : null,
  };
}

export async function verifyPhoneOtpRequest(request: VerifyPhoneOtpRequest): Promise<VerifyPhoneOtpResponse> {
  const response = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: asJsonBody(request),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    return {
      error: (payload?.error as string | undefined) ?? UI_MESSAGES.generic.server,
      challengeId: null,
      session: null,
      redirectTo: null,
    };
  }

  const session = payload?.session && typeof payload.session === "object" ? (payload.session as Session) : null;

  return {
    error: null,
    challengeId: typeof payload?.challengeId === "string" ? payload.challengeId : null,
    session,
    redirectTo: typeof payload?.redirectTo === "string" ? payload.redirectTo : null,
  };
}
