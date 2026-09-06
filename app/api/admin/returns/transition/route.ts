import { NextResponse } from "next/server";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

type TransitionBody = {
  returnId?: unknown;
  toStatus?: unknown;
  rejectionReason?: unknown;
  inspectionResult?: unknown;
  inspectionNotes?: unknown;
};

const ALLOWED_TARGETS = new Set([
  "RETURN_APPROVED",
  "RETURN_REJECTED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RECEIVED",
  "UNDER_INSPECTION",
  "REFUND_PENDING",
]);

const ERROR_RESPONSES: Record<string, { error: string; status: number }> = {
  P3001: { error: "Admin permission required.", status: 403 },
  P3002: { error: "Invalid return transition request.", status: 400 },
  P3003: { error: "Return request not found.", status: 404 },
  P3005: { error: "A rejection reason is required.", status: 400 },
  P3006: { error: "A valid inspection result is required.", status: 400 },
  P3009: { error: "Refund completion is not available in this phase.", status: 400 },
  P3010: { error: "This return cannot transition from its current status.", status: 409 },
  P3011: { error: "The rejection transition was not completed.", status: 409 },
  P3012: { error: "Inspection is required before refund completion.", status: 409 },
  P3013: { error: "The approval transition was not completed.", status: 409 },
  P3014: { error: "The pickup transition was not completed.", status: 409 },
  P3015: { error: "The receipt transition was not completed.", status: 409 },
  P3016: { error: "The inspection transition was not completed.", status: 409 },
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const auth = await resolveSupabaseRequestAuth(request);
  if (!auth.configured) return errorResponse("Supabase is not configured.", 503);
  if (auth.invalidBearer || !auth.user || !auth.client) return errorResponse("Authentication required.", 401);

  const { data: isAdmin, error: adminCheckError } = await auth.client.rpc("is_admin_user");
  if (adminCheckError || isAdmin !== true) return errorResponse("Admin permission required.", 403);

  let body: TransitionBody;
  try {
    body = (await request.json()) as TransitionBody;
  } catch {
    return errorResponse("Invalid return transition request.", 400);
  }

  const returnId = textValue(body.returnId);
  const toStatus = textValue(body.toStatus);
  const rejectionReason = textValue(body.rejectionReason);
  const inspectionResult = textValue(body.inspectionResult).toUpperCase();
  const inspectionNotes = textValue(body.inspectionNotes);

  if (!returnId || !ALLOWED_TARGETS.has(toStatus) || rejectionReason.length > 1000 || inspectionNotes.length > 2000) {
    return errorResponse("Invalid return transition request.", 400);
  }

  const { data, error } = await auth.client.rpc("admin_transition_return", {
    p_return_id: returnId,
    p_to_status: toStatus,
    p_rejection_reason: rejectionReason || null,
    p_inspection_result: inspectionResult || null,
    p_inspection_notes: inspectionNotes || null,
  });

  if (error) {
    const mapped = ERROR_RESPONSES[error.code];
    return errorResponse(mapped?.error ?? "Unable to transition the return request.", mapped?.status ?? 500);
  }

  const row = (Array.isArray(data) ? data[0] : data) as { return_id?: string; status?: string } | null;
  if (!row?.return_id || !row.status) return errorResponse("Unable to transition the return request.", 500);

  return NextResponse.json({ returnId: row.return_id, status: row.status });
}
