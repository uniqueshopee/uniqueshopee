import { NextResponse } from "next/server";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import { createPhoneDeletionChallenge, verifyPhoneDeletionChallenge } from "@/lib/account-deletion/phone";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveSupabaseRequestAuth(request);
  if (!auth.configured) return NextResponse.json({ error: "Account deletion is unavailable." }, { status: 503 });
  if (auth.invalidBearer || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { action?: string; challengeId?: string; otp?: string } = {};
  try { body = (await request.json()) as typeof body; } catch { /* handled below */ }

  if (body.action === "send") {
    const result = await createPhoneDeletionChallenge(auth.user);
    return result.error
      ? NextResponse.json({ error: result.error }, { status: 429 })
      : NextResponse.json({ success: true, challengeId: result.challengeId, expiresAt: result.expiresAt, maskedPhone: result.maskedPhone });
  }

  if (body.action === "verify") {
    const result = await verifyPhoneDeletionChallenge(auth.user, body.challengeId?.trim() ?? "", body.otp?.trim() ?? "");
    return result.verified ? NextResponse.json({ success: true }) : NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ error: "Invalid deletion OTP action." }, { status: 400 });
}
