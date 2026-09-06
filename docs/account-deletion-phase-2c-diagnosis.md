# UniqueShopee Web Account Deletion — Phase 2C Diagnosis

Status: diagnosis only. No deletion endpoint was enabled, no cleanup function was called, and no Auth user or production data was modified.

## 1. Provider and re-authentication matrix

| Provider | Current implementation | Safe re-authentication finding | Phase 2C decision |
|---|---|---|---|
| Email/password | Supabase `auth.signInWithPassword()` in `src/lib/supabase/auth.ts` | A server endpoint can verify a password by calling Supabase Auth with a deliberately non-persistent server client. The password must be submitted only over HTTPS and must never be logged or persisted. | Feasible for a later, deletion-specific challenge; not implemented here. |
| Google OAuth | `signInWithOAuth("google")` exists, but no provider re-authentication or prompt/max-age flow exists. | The current project cannot reliably prove a recent Google re-authentication. A normal existing session is insufficient for this destructive action. | Fail closed until a provider-verifiable re-auth flow is designed and tested. |
| Phone/OTP | `/api/auth/send-otp` and `/api/auth/verify-otp`; purposes are only `login` and `signup`. | A deletion-specific challenge would require a new purpose, server-side challenge binding, expiry/attempt controls, and a proof that the challenge belongs to the authenticated user. Generic login success must not be reused. | Fail closed; design separately without changing normal login/signup. |

Relevant files:

- `src/lib/supabase/auth.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`
- `src/components/auth/auth-provider.tsx`
- `app/api/auth/send-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`

## 2. Current deletion state machine and route

The active Next.js App Router tree is the root `app/` tree. Shared application code is under `src/`.

The current route is `app/api/account/delete/route.ts`. It:

1. Authenticates with `resolveSupabaseRequestAuth()`.
2. Derives the identity from `auth.user.id`.
3. Reads `account_deletion_requests` using the server-only service-role client.
4. Rejects completed/finalizing requests.
5. Fails closed because `recentReauthenticationStatus()` currently returns `verified: false`.
6. Does not create a request, clean data, delete storage, delete a profile, or call `auth.admin.deleteUser()`.

The current server helper is `src/lib/account-deletion/server.ts`. It contains state validation, find/create/update helpers, and a deliberately disabled cleanup placeholder.

The account UI in `src/components/account/account-page.tsx` has been disabled. The old browser-side `softDeleteCurrentProfile()` implementation is no longer active, and the helper was removed from `src/lib/account-service.ts`.

Expected state values from migration `0042` are:

```text
ACTIVE
DELETION_PENDING
DATA_CLEANUP_FAILED
DATA_CLEANED
AUTH_DELETE_FAILED
AUTH_DELETED
FINALIZATION_FAILED
COMPLETED
```

Production state supplied for this diagnosis says `account_deletion_requests` exists with the migration-defined design. Independent production querying was not performed by this diagnosis.

## 3. Cleanup dependency map

The Phase 2B cleanup function is `public.prepare_account_deletion_cleanup(uuid)` from migration `0043`.

It directly deletes only:

- `addresses WHERE user_id = target`
- `cart_items WHERE user_id = target`
- `wishlist_items WHERE user_id = target`
- `notifications WHERE user_id = target`
- `paint_calculations WHERE user_id = target`
- `room_visualizations WHERE user_id = target`
- `profile_roles WHERE profile_id = target`
- `phone_auth_credentials WHERE user_id = target`

It does not delete profiles, orders, order items, reviews, support records, consultations, coupon usage, or phone verifications.

Relevant schema relationships from `supabase/migrations/0001_initial_schema.sql`, `0014_phone_auth_security.sql`, and `0018_consultations.sql`:

| Resource | Ownership relationship | Current FK behavior | Consequence of cleanup function |
|---|---|---|---|
| `addresses` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Direct row deletion only; does not delete orders because order address references use `SET NULL`. |
| `cart_items` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Direct row deletion only. |
| `wishlist_items` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Direct row deletion only. |
| `notifications` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Direct row deletion only. |
| `paint_calculations` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Direct row deletion only. |
| `room_visualizations` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Direct row deletion only; `brand_id` is nullable with `SET NULL`. |
| `profile_roles` | `profile_id → profiles.id` and `role_id → roles.id` | `ON DELETE CASCADE` to parents | Deleting assignment rows does not delete profiles or roles. |
| `phone_auth_credentials` | `user_id → auth.users.id` | `ON DELETE CASCADE` from Auth user | Deleting credential rows does not delete the Auth user. |
| `orders` | `user_id → profiles.id` | Phase 1 changed to `ON DELETE SET NULL` | Not touched by cleanup; historical orders survive profile deletion. |
| `order_items` | `order_id → orders.id` | `ON DELETE CASCADE` from order | Survives because cleanup never deletes orders. |
| `reviews` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Profile deletion would destroy unresolved review records. |
| `support_tickets` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Profile deletion would destroy support history. |
| `support_ticket_replies` | `user_id → profiles.id`, `ticket_id → support_tickets.id` | Both cascade from their parents | Profile deletion can destroy replies. |
| `consultations` | `user_id → profiles.id` | `ON DELETE CASCADE` from profile | Profile deletion would destroy consultation history. |
| `coupon_usage` | `user_id → profiles.id`, `order_id → orders.id` | Profile cascade; order `SET NULL` | Profile deletion can destroy coupon/accounting history. |
| `phone_verifications` | No user FK | Existing operational table | Must not be matched or deleted by phone number. |

When `profiles` is deleted, the `orders.user_id SET NULL` relationship protects orders and therefore order items. However, the other profile cascades remain and can destroy unresolved review, support, consultation, and coupon records. Auth deletion also cascades to `profiles`, so calling `auth.admin.deleteUser()` before resolving those relationships is unsafe.

## 4. Storage ownership map

Storage policy is defined in `supabase/migrations/0004_storage.sql`.

Configured private buckets:

- `users`
- `documents`
- `room-visualizer`
- `support`

The confirmed ownership convention is:

```text
<auth.uid>/<object path>
```

The server-only helper `src/lib/account-deletion/storage.ts` currently targets only:

- `users`
- `room-visualizer`

It recursively lists only the authenticated user prefix and removes only validated paths beneath that prefix. It does not touch `documents` or `support`.

Repository evidence does not show active Supabase Storage uploads for user objects. The room-visualizer UI currently uses local browser object URLs, while Cloudinary usage is associated with admin/catalog assets. The configured buckets must nevertheless be treated as possible future personal-data stores.

## 5. Retention-policy matrix

| Data | Location/ownership | Current FK behavior | Risk | Recommended action |
|---|---|---|---|---|
| Reviews | `public.reviews.user_id → profiles.id` | Profile cascade | Deletes user-generated product history and verified-purchase context. | BLOCK DELETION pending policy; later delete or anonymize. |
| Support tickets | `public.support_tickets.user_id → profiles.id` | Profile cascade; `order_id SET NULL` | May contain unresolved complaints, returns, disputes, or personal messages. | RETAIN while open/disputed; later anonymize or delete when approved. |
| Support replies | `public.support_ticket_replies.user_id → profiles.id`; `ticket_id` cascade | Profile/ticket cascades | May contain support evidence and attachments metadata. | RETAIN with support/legal hold; later anonymize or delete. |
| Consultations | `public.consultations.user_id → profiles.id` | Profile cascade | Contains name, phone, notes, product interest, and service history. | BLOCK DELETION pending business/legal treatment. |
| Coupon usage | `public.coupon_usage.user_id → profiles.id`; `order_id SET NULL` | Profile cascade | May support coupon-limit enforcement, discount reconciliation, and accounting. | RETAIN or anonymize; do not delete automatically. |
| Order address snapshots | `orders.shipping_address_snapshot`, `billing_address_snapshot` | Independent JSONB copies | Deleting `addresses` does not remove names, phones, address lines, cities, states, PINs, or other snapshot fields. | BLOCK automatic anonymization until exact retention fields are approved. |
| Order notes | `orders.notes` | Retained with order | Free text may contain personal or delivery information. | BLOCK automatic transformation pending field policy. |
| Documents | Storage `documents/<auth.uid>/...` if used | No relational FK | May contain personal or operational documents. | RETAIN if held; otherwise delete only after policy approval. |
| Support attachments | Storage `support/<auth.uid>/...` and/or reply metadata | No relational FK | May be evidence for active support or disputes. | RETAIN under support/legal hold; do not auto-delete. |
| Open orders | `public.orders` | `user_id SET NULL` after Phase 1 | Deletion may disrupt fulfillment, delivery, returns, or customer support. | BLOCK deletion until operational handling is defined. |
| Returns | Return requests are represented through order/support flows; no separate `returns` table was found. | Related order/support behavior | Deleting related support or order context can impair return processing. | BLOCK while active; preserve required history. |
| Refunds | Order payment/refund status and timestamps; no separate refund table found. | Stored on `orders` | Removing order context can impair reconciliation and refund handling. | RETAIN order/payment history; policy required for personal fields. |
| Disputes | Support tickets/order references; no separate dispute table was found. | Support/order FK behavior | May require evidence and operational audit history. | BLOCK while unresolved. |

No legal retention period is inferred from the repository.

## 6. Exact blockers

Final deletion is blocked by:

1. No provider-verifiable recent re-authentication for Google.
2. No deletion-specific phone OTP challenge.
3. No implemented server-side password confirmation flow.
4. Deleting `profiles` still cascades to unresolved reviews, support data, consultations, and coupon usage.
5. No approved treatment for order address snapshots or free-text order notes.
6. No approved handling for open orders, returns, refunds, or disputes.
7. No approved retention policy for documents or support attachments.
8. Production storage population has not been independently inventoried.
9. The existing endpoint is intentionally fail-closed and does not create or advance deletion state.

## 7. Proposed secure end-to-end sequence

1. Authenticate the request using the server-side cookie/Bearer session.
2. Derive the immutable Auth user ID from the verified session.
3. Require provider-appropriate, deletion-specific recent re-authentication.
4. Create or lock one deletion request for that Auth user ID.
5. Evaluate open-order, return, refund, support, and dispute holds.
6. Run approved relational cleanup in one database transaction.
7. Preserve orders and order items; set order ownership to `NULL` only through the existing FK behavior.
8. Process only approved personal child records.
9. Process only confirmed user-scoped storage objects in approved buckets.
10. Mark the request `DATA_CLEANED`.
11. Call `auth.admin.deleteUser(auth_user_id)` from server-only code.
12. On Auth success, mark `AUTH_DELETED` and then `COMPLETED`.
13. Invalidate the client session and return success only after all required steps succeed.
14. If Auth deletion fails, mark `AUTH_DELETE_FAILED` and retry only the Auth step.

The profile must not be deleted until the unresolved profile-cascade categories have explicit treatment. Otherwise Auth deletion would indirectly delete them.

## 8. Files that would need modification

Potential later implementation files:

- `app/api/account/delete/route.ts`
- `src/lib/account-deletion/server.ts`
- `src/lib/account-deletion/storage.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/supabase/server.ts` if re-auth support requires it
- `src/components/account/account-page.tsx` only when the UI is approved for enablement
- `src/lib/account-service.ts` only if obsolete compatibility code is removed or replaced
- A new server-side re-authentication helper
- A new or revised transactional database function/RPC

No account UI or privacy-policy changes are authorized in this diagnosis phase.

## 9. Database changes still required

Phase 1 migration `0042` and Phase 2B migration `0043` are reported as applied in production.

Before final deletion, the database layer still requires:

- A finalized policy for profile-cascade categories.
- A transactional cleanup function that includes only approved operations.
- State-transition/concurrency controls for deletion requests.
- Any required FK redesign if unresolved records must survive profile deletion.
- A defined treatment for snapshots and order notes.
- Production verification of Storage object ownership and population.

No additional migration should be created until those decisions are approved.

## 10. Test plan using only a dedicated test account

Do not test against real customers.

Use a dedicated non-production/test account with controlled fixtures for:

1. Email/password recent re-authentication success and failure.
2. Google re-authentication fail-closed behavior.
3. Phone deletion-OTP challenge behavior once designed.
4. Duplicate and concurrent deletion requests.
5. Cleanup transaction rollback using an intentional test failure.
6. Empty and nested `users`/`room-visualizer` Storage prefixes.
7. Cross-user storage path rejection.
8. Preservation of orders and order items.
9. Preservation of unresolved support/review/consultation/coupon fixtures.
10. Auth deletion failure and retry.
11. Already-absent Auth user handling.
12. Session invalidation and repeated POST behavior.

Production execution, real account deletion, and production deployment are out of scope.
