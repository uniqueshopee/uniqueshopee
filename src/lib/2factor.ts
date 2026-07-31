import "server-only";

import { readEnvironmentValue } from "@/lib/environment";

const TWO_FACTOR_SMS_BASE_URL = "https://2factor.in/API/V1";

export type TwoFactorOtpResult = {
  ok: boolean;
  status: number;
  details: string;
  rawBody: string;
};

export type TwoFactorSendResult = TwoFactorOtpResult & {
  sessionId: string | null;
};

export type TwoFactorVerifyResult = TwoFactorOtpResult & {
  matched: boolean;
};

function normalizePhoneNumber(value: string) {
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

async function readResponse(response: Response): Promise<{ status: number; rawBody: string; json: Record<string, unknown> | null }> {
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    return {
      status: response.status,
      rawBody,
      json: null,
    };
  }

  try {
    return {
      status: response.status,
      rawBody,
      json: JSON.parse(rawBody) as Record<string, unknown>,
    };
  } catch {
    return {
      status: response.status,
      rawBody,
      json: null,
    };
  }
}

function toDetails(response: { json: Record<string, unknown> | null; rawBody: string }) {
  const details = response.json && typeof response.json.Details === "string" ? response.json.Details : "";
  const status = response.json && typeof response.json.Status === "string" ? response.json.Status : "";
  return details || status || response.rawBody;
}

export async function sendOTP(phone: string): Promise<TwoFactorSendResult> {
  const apiKey = readEnvironmentValue("TWOFACTOR_API_KEY");
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      details: "2Factor is not configured.",
      rawBody: "",
      sessionId: null,
    };
  }

  if (!normalizedPhone) {
    return {
      ok: false,
      status: 400,
      details: "Enter a valid mobile number.",
      rawBody: "",
      sessionId: null,
    };
  }

  const response = await fetch(`${TWO_FACTOR_SMS_BASE_URL}/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(normalizedPhone)}/AUTOGEN`, {
    method: "POST",
    headers: {
      Accept: "application/json,text/plain,*/*",
    },
  });

  const parsed = await readResponse(response);
  const details = toDetails(parsed);
  const sessionId = parsed.json && typeof parsed.json.Details === "string" ? parsed.json.Details : null;

  return {
    ok: response.ok,
    status: response.status,
    details,
    rawBody: parsed.rawBody,
    sessionId,
  };
}

export async function verifyOTP(sessionId: string, otp: string): Promise<TwoFactorVerifyResult> {
  const apiKey = readEnvironmentValue("TWOFACTOR_API_KEY");

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      details: "2Factor is not configured.",
      rawBody: "",
      matched: false,
    };
  }

  const normalizedSessionId = sessionId.trim();
  const normalizedOtp = otp.trim();

  if (!normalizedSessionId || !normalizedOtp) {
    return {
      ok: false,
      status: 400,
      details: "Enter the OTP and challenge id.",
      rawBody: "",
      matched: false,
    };
  }

  const response = await fetch(
    `${TWO_FACTOR_SMS_BASE_URL}/${encodeURIComponent(apiKey)}/SMS/VERIFY/${encodeURIComponent(normalizedSessionId)}/${encodeURIComponent(normalizedOtp)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json,text/plain,*/*",
      },
    },
  );

  const parsed = await readResponse(response);
  const details = toDetails(parsed);
  const matched = /otp matched/i.test(details);

  return {
    ok: response.ok && matched,
    status: response.status,
    details,
    rawBody: parsed.rawBody,
    matched,
  };
}
