# UniqueShopee Web Account Deletion — Phase 2D Test Plan

Status: prepared for a dedicated test-account E2E phase. No destructive test has been run.

## Safety rules

- Use only a dedicated test account with controlled fixtures; never use a customer or production account.
- Run against an isolated Supabase project or an explicitly approved test environment.
- Do not put service-role credentials in browser code, logs, tickets, screenshots, or test output.
- Keep the Delete Account control disabled until the test results and retention decisions are approved.

## Required scenarios

1. Confirm the public `/account-deletion` page and privacy-policy link accurately describe the current unavailable state.
2. Confirm an unauthenticated `POST /api/account/delete` returns `401` and changes no state.
3. Confirm a malformed or mismatched Bearer token returns `401` and changes no state.
4. Confirm an authenticated request fails closed with `428` because deletion-specific re-authentication is not available.
5. Confirm no `account_deletion_requests` row is created by the unavailable flow.
6. Confirm the account page uses no browser confirmation dialog and its Delete Account control remains disabled.
7. After a separately approved re-authentication design exists, test provider-specific success and failure, expiry, replay, and cross-user binding.
8. Test duplicate and concurrent requests for one test user and verify one request state machine.
9. Test cleanup rollback using an intentional test-only database failure; verify no partial relational cleanup.
10. Test approved storage cleanup with empty, nested, cross-user, and unexpected-bucket fixtures.
11. Verify orders, order items, reviews, support records, consultations, coupon usage, and phone verifications survive any approved cleanup stage.
12. Test Auth deletion failure and retry behavior without repeating completed cleanup.
13. Test an already-absent Auth user and require explicit verification before treating it as success.
14. Verify session invalidation and that the client reports success only after `COMPLETED`.

## Phase 2E implementation-specific checks

- Email/password re-authentication must submit the password only to the server route, verify it with a non-persistent Supabase Auth client, require the returned Auth user ID to equal the verified session user ID, and never store or log the password.
- Google remains unavailable because the repository has no provider-verifiable recent re-authentication flow.
- Phone/OTP remains unavailable because the existing OTP purposes are only `login` and `signup`; no deletion-specific challenge was added.
- The destructive route requires both server-only `ACCOUNT_DELETION_TEST_MODE=true` and an exact server-only `ACCOUNT_DELETION_TEST_USER_ID` match. Neither value is read from the browser.
- Production must keep the test mode disabled and the test-user allowlist empty. The client must not be able to bypass either condition.
- The current profile-cascade policy gate is intentionally unapproved, so no cleanup or Auth deletion can be reached until retention decisions are approved.

## Current release gate

The current web implementation intentionally stops before creating a deletion request, invoking the cleanup function, removing storage, deleting a profile, or calling `auth.admin.deleteUser()`. Production deployment and destructive execution remain blocked until the dedicated test-account E2E phase is completed and the unresolved retention/FK decisions are approved.
