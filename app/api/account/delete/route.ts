import { NextResponse } from "next/server";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import {
  claimAccountDeletionRequest,
  claimStaleCleanupRequest,
  claimStaleAuthDeletionRetry,
  claimAuthDeletionRetry,
  deleteAuthUser,
  createAccountDeletionRequest,
  findAccountDeletionRequest,
  hasDeletionService,
  cleanupAccountDeletionChallenges,
  markAuthDeletionInProgress,
  runApprovedRelationalCleanup,
  updateAccountDeletionState,
  verifyDeletionReauthentication,
} from "@/lib/account-deletion/server";
import { cleanupApprovedUserStorage } from "@/lib/account-deletion/storage";
import { consumePhoneDeletionChallenge } from "@/lib/account-deletion/phone";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveSupabaseRequestAuth(request);

  if (!auth.configured) {
    return NextResponse.json({ error: "Account deletion is unavailable." }, { status: 503 });
  }

  if (auth.invalidBearer || !auth.client || !auth.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!hasDeletionService()) {
    return NextResponse.json({ error: "Account deletion is unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Password confirmation is required." }, { status: 400 });
  }

  const password = body && typeof body === "object" && "password" in body && typeof body.password === "string" ? body.password : "";
  const challengeId = body && typeof body === "object" && "deletionOtpChallengeId" in body && typeof body.deletionOtpChallengeId === "string" ? body.deletionOtpChallengeId.trim() : "";
  const isPhoneUser = auth.user.identities?.some((identity) => identity.provider === "phone") === true;
  if (isPhoneUser) {
    if (!challengeId || !(await consumePhoneDeletionChallenge(auth.user.id, challengeId))) {
      return NextResponse.json({ error: "Complete phone deletion verification first." }, { status: 428 });
    }
  } else {
    const reauthentication = await verifyDeletionReauthentication(auth.user, password);
    if (!reauthentication.verified) {
      return NextResponse.json({ error: reauthentication.error }, { status: 428 });
    }
  }

  const deletionState = await findAccountDeletionRequest(auth.user.id);
  if (deletionState.error) {
    return NextResponse.json({ error: "Unable to verify deletion state." }, { status: 503 });
  }

  if (deletionState.request?.state === "COMPLETED" || deletionState.request?.state === "AUTH_DELETED") {
    return NextResponse.json({ error: "Account deletion is already being finalized." }, { status: 409 });
  }

  const deletionRequest = await createAccountDeletionRequest(auth.user.id);
  if (deletionRequest.error || !deletionRequest.request) {
    return NextResponse.json({ error: "Unable to create deletion request." }, { status: 503 });
  }

  const requestRow = deletionRequest.request;
  if (requestRow.state === "AUTH_DELETED" || requestRow.state === "COMPLETED") {
    return NextResponse.json({ error: "Account deletion is already being finalized." }, { status: 409 });
  }

  if (requestRow.state === "DELETION_PENDING") {
    const recovered = await claimStaleCleanupRequest(requestRow.id);
    if (recovered.error) return NextResponse.json({ error: recovered.error }, { status: 503 });
    if (!recovered.claimed) return NextResponse.json({ error: "Account deletion is already in progress." }, { status: 409 });
    requestRow.state = "DELETION_PENDING";
  }

  if (requestRow.state === "ACTIVE" || requestRow.state === "DATA_CLEANUP_FAILED") {
    const claimed = await claimAccountDeletionRequest(requestRow.id, requestRow.state);
    if (claimed.error) {
      return NextResponse.json({ error: claimed.error }, { status: 503 });
    }
    if (!claimed.claimed || !claimed.request) {
      return NextResponse.json({ error: "Account deletion is already in progress." }, { status: 409 });
    }
    requestRow.state = claimed.request.state;
  }

  if (requestRow.state === "DATA_CLEANED" || requestRow.state === "AUTH_DELETE_FAILED") {
    let authRetryClaimed = false;
    if (requestRow.failure_code === "AUTH_DELETE_IN_PROGRESS") {
      const recovered = await claimStaleAuthDeletionRetry(requestRow.id);
      if (recovered.error) return NextResponse.json({ error: recovered.error }, { status: 503 });
      if (!recovered.claimed) return NextResponse.json({ error: "Account deletion is already in progress." }, { status: 409 });
      authRetryClaimed = true;
    }
    if (!authRetryClaimed) {
      const claimed = await claimAuthDeletionRetry(requestRow.id, requestRow.state);
      if (claimed.error) return NextResponse.json({ error: claimed.error }, { status: 503 });
      if (!claimed.claimed || !claimed.request) return NextResponse.json({ error: "Account deletion is already in progress." }, { status: 409 });
    }
  }

  if (requestRow.state !== "AUTH_DELETE_FAILED" && requestRow.state !== "DATA_CLEANED") {

    const cleanup = await runApprovedRelationalCleanup(auth.user.id);
    if (!cleanup.completed) {
      await updateAccountDeletionState(requestRow.id, "DATA_CLEANUP_FAILED", { failureCode: "RELATIONAL_CLEANUP_FAILED", failureMessage: cleanup.error });
      return NextResponse.json({ error: cleanup.error }, { status: 502 });
    }

    const storage = await cleanupApprovedUserStorage(auth.user.id);
    if (!storage.completed) {
      await updateAccountDeletionState(requestRow.id, "DATA_CLEANUP_FAILED", { failureCode: "STORAGE_CLEANUP_FAILED", failureMessage: storage.error });
      return NextResponse.json({ error: storage.error }, { status: 502 });
    }

    const challengeCleanup = await cleanupAccountDeletionChallenges(auth.user.id);
    if (!challengeCleanup.completed) {
      await updateAccountDeletionState(requestRow.id, "DATA_CLEANUP_FAILED", { failureCode: "PHONE_CHALLENGE_CLEANUP_FAILED", failureMessage: challengeCleanup.error });
      return NextResponse.json({ error: challengeCleanup.error }, { status: 502 });
    }

    const cleaned = await updateAccountDeletionState(requestRow.id, "DATA_CLEANED");
    if (cleaned.error) return NextResponse.json({ error: "Unable to finalize cleanup state." }, { status: 503 });
  }

  const authAttempt = await markAuthDeletionInProgress(requestRow.id);
  if (authAttempt.error) return NextResponse.json({ error: authAttempt.error }, { status: 503 });

  const authDeletion = await deleteAuthUser(auth.user.id);
  if (!authDeletion.completed) {
    await updateAccountDeletionState(requestRow.id, "AUTH_DELETE_FAILED", { failureCode: "AUTH_DELETE_FAILED", failureMessage: authDeletion.error });
    return NextResponse.json({ error: authDeletion.error }, { status: 502 });
  }

  const authDeleted = await updateAccountDeletionState(requestRow.id, "AUTH_DELETED");
  if (authDeleted.error) {
    await updateAccountDeletionState(requestRow.id, "FINALIZATION_FAILED", { failureCode: "AUTH_STATE_FINALIZATION_FAILED", failureMessage: authDeleted.error });
    return NextResponse.json({ error: "Account deletion finalization failed." }, { status: 503 });
  }

  const completed = await updateAccountDeletionState(requestRow.id, "COMPLETED");
  if (completed.error || completed.request?.state !== "COMPLETED") {
    return NextResponse.json({ error: "Account deletion finalization failed." }, { status: 503 });
  }

  return NextResponse.json({ state: "COMPLETED" });
}
