# UniqueShopee Web Account Deletion — Phase 2E Safety Review

Status: read-only safety review. No SQL was executed, no deletion function was called, and no files other than this report were changed for this review.

## Conclusion

**It is not safe to call `auth.admin.deleteUser(authUserId)` with the current schema.**

The repository migrations define this cascade:

```text
auth.users(id)
  └─ profiles.id                         ON DELETE CASCADE
       ├─ reviews.user_id                ON DELETE CASCADE
       ├─ support_tickets.user_id       ON DELETE CASCADE
       ├─ support_ticket_replies.user_id ON DELETE CASCADE
       ├─ consultations.user_id          ON DELETE CASCADE
       ├─ coupon_usage.user_id           ON DELETE CASCADE
       └─ orders.user_id                 ON DELETE SET NULL  (Phase 1)
            └─ order_items.order_id      ON DELETE CASCADE
```

Therefore deleting the Auth user can delete the profile and then delete retained business/support records. The existing Phase 2E profile-policy gate is correct and must remain closed.

## 1. Authoritative migration evidence

The relevant definitions are in `supabase/migrations/0001_initial_schema.sql`, `0014_phone_auth_security.sql`, `0018_consultations.sql`, `0042_account_deletion_foundation.sql`, and `0043_account_deletion_cleanup_foundation.sql`.

### Tables referencing `auth.users`

| Source table | Column | Referenced table/column | ON DELETE | Effect |
|---|---|---|---|---|
| `public.profiles` | `id` | `auth.users(id)` | `CASCADE` | Auth deletion deletes the profile. |
| `public.phone_auth_credentials` | `user_id` | `auth.users(id)` | `CASCADE` | Auth deletion deletes phone credentials. Phase 2B deletes these earlier. |

`public.account_deletion_requests.auth_user_id` intentionally has no FK to either `profiles` or `auth.users`, so its retry state can survive cleanup/Auth deletion.

### Tables referencing `public.profiles`

| Source table | FK column | ON DELETE | Relevant consequence |
|---|---|---|---|
| `public.profiles` | `role_id → roles.id` | `SET NULL` | Deleting a role does not delete the profile. |
| `public.profile_roles` | `profile_id` | `CASCADE` | Profile deletion removes role assignments; this is an approved cleanup category. |
| `public.profile_roles` | `assigned_by` | `SET NULL` | Does not remove the assignment row. |
| `public.addresses` | `user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.cart_items` | `user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.wishlist_items` | `user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.orders` | `user_id` | `SET NULL` after migration 0042 | Orders survive; ownership becomes `NULL`. |
| `public.reviews` | `user_id` | `CASCADE` | **Retained review rows would be deleted.** |
| `public.coupon_usage` | `user_id` | `CASCADE` | **Retained coupon/accounting rows would be deleted.** |
| `public.notifications` | `user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.support_tickets` | `user_id` | `CASCADE` | **Retained support tickets would be deleted.** |
| `public.support_tickets` | `assigned_to_profile_id` | `SET NULL` | Deleting a customer profile does not delete assigned support tickets. |
| `public.paint_calculations` | `user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.room_visualizations` | `user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.settings` | `updated_by` | `SET NULL` | Does not delete settings. |
| `public.consultations` | `user_id` | `CASCADE` | **Retained consultation rows would be deleted.** |

The profile-dependent tables above are the complete relevant set found by searching all repository migrations for `REFERENCES public.profiles`.

## 2. Exact dangerous cascade

With the current definitions, this call is unsafe:

```text
auth.admin.deleteUser(authUserId)
  → deletes auth.users(authUserId)
  → CASCADE deletes profiles(authUserId)
  → CASCADE deletes reviews, coupon_usage, support_tickets,
              support_ticket_replies, and consultations for that profile
```

`support_ticket_replies` has both:

- `ticket_id → support_tickets.id ON DELETE CASCADE`
- `user_id → profiles.id ON DELETE CASCADE`

Even if support tickets were protected, the reply’s direct profile FK would still delete the reply. Both relationships must be treated explicitly.

## 3. Orders and order items

Migration 0042 changes only the exact `orders.user_id → profiles.id` FK to `ON DELETE SET NULL` and drops `NOT NULL` from `orders.user_id`.

With that applied:

- the order row survives profile deletion;
- `orders.user_id` becomes `NULL` where it referenced the deleted profile;
- `order_items.order_id → orders.id ON DELETE CASCADE` does not fire, because the order itself is not deleted;
- order totals, payment references, status fields, snapshots, notes, and order items remain in place.

This protection is correct, but it does not protect the other profile-dependent tables.

## 4. Retention and deletion decision

### Must survive Auth deletion

- `orders`
- `order_items`
- `reviews`
- `support_tickets`
- `support_ticket_replies`
- `consultations`
- `coupon_usage`
- order totals/payment references/snapshots/notes

### May be deleted, subject to the approved workflow

- `addresses`
- `cart_items`
- `wishlist_items`
- `notifications`
- `paint_calculations`
- `room_visualizations`
- `profile_roles`
- `phone_auth_credentials`
- approved user-scoped objects in `users` and `room-visualizer` Storage buckets

### Must not be deleted by the current workflow

- `profiles` directly from application SQL
- `orders`
- `order_items`
- `reviews`
- `support_tickets`
- `support_ticket_replies`
- `consultations`
- `coupon_usage`
- `phone_verifications`
- `documents` and `support` Storage objects

The Auth provider currently deletes `profiles` indirectly through its FK. That is why the Auth deletion stage cannot be enabled until the FK strategy is corrected and tested.

## 5. Minimum safe schema strategy

The minimum schema correction is a new forward-only migration that changes the retained profile-child relationships from `CASCADE` to `SET NULL` and makes their user columns nullable:

| Table | Column | Required new action |
|---|---|---|
| `public.reviews` | `user_id` | Drop `NOT NULL`; replace FK with `ON DELETE SET NULL`. |
| `public.coupon_usage` | `user_id` | Drop `NOT NULL`; replace FK with `ON DELETE SET NULL`. |
| `public.support_tickets` | `user_id` | Drop `NOT NULL`; replace FK with `ON DELETE SET NULL`. |
| `public.support_ticket_replies` | `user_id` | Drop `NOT NULL`; replace FK with `ON DELETE SET NULL`. |
| `public.consultations` | `user_id` | Drop `NOT NULL`; replace FK with `ON DELETE SET NULL`. |

The migration must identify each FK by exact catalog identity: source schema/table/column, referenced schema/table/column, and current `ON DELETE CASCADE`. It must fail closed if any expected FK is absent or ambiguous, and must not touch unrelated foreign keys.

This preserves rows while allowing the Auth-triggered profile deletion to set their user identity to `NULL`. It does not by itself resolve operational holds, snapshot privacy, free-text notes, support attachments, or retention periods; those remain policy gates.

An alternative anonymized-profile design would require a durable non-user identity and a policy-approved data transformation. No such identity or policy exists in the current repository, so it is not the minimum safe change.

## 6. Required application changes after the schema correction

Only after the forward-only FK migration is applied and verified:

1. Keep deriving `authUserId` from the verified server session.
2. Require provider-appropriate deletion re-authentication.
3. Create or lock one `account_deletion_requests` row.
4. Evaluate open-order, return, refund, dispute, support, and consultation holds.
5. Invoke `prepare_account_deletion_cleanup(authUserId)` once for approved direct cleanup.
6. Remove only approved user-scoped Storage objects.
7. Mark `DATA_CLEANED`.
8. Call server-only `auth.admin.deleteUser(authUserId)`.
9. Verify the Auth user is absent and retained rows still exist with nullable user IDs.
10. Mark `AUTH_DELETED`, then `COMPLETED`.
11. On Auth failure, mark `AUTH_DELETE_FAILED` and retry only Auth deletion.

The current Phase 2E implementation must keep its profile-policy gate closed until these conditions are met.

## 7. Current code safety review

### `src/lib/account-deletion/server.ts`

- Correctly uses a server-only service-role client.
- Correctly verifies email/password using a non-persistent client without logging or persisting the password.
- Correctly fails closed for Google and phone providers.
- Contains an Auth deletion helper, but it is unreachable because the profile-deletion policy is explicitly unapproved.

### `app/api/account/delete/route.ts`

- Derives the target identity from `resolveSupabaseRequestAuth()`.
- Requires the server-only test mode and exact server-only test-user allowlist.
- Does not accept a client user ID.
- Blocks before cleanup/Auth deletion while profile retention is unapproved.
- Supports the intended `AUTH_DELETE_FAILED` retry shape, but concurrent-request locking still requires a database-backed atomic claim/state-transition mechanism before enablement.

### Migrations 0042 and 0043

- 0042 protects orders only; it does not protect the other profile cascades.
- 0043 directly deletes only the approved cleanup categories and is service-role-only.
- Neither migration makes Auth deletion safe by itself.

## 8. Required state-transition controls

The intended states remain:

```text
ACTIVE → DELETION_PENDING → DATA_CLEANED → AUTH_DELETED → COMPLETED
```

Failure states remain:

```text
DATA_CLEANUP_FAILED
AUTH_DELETE_FAILED
FINALIZATION_FAILED
```

Before enablement, the database layer should provide an atomic claim/transition so two requests cannot both perform cleanup or Auth deletion. A unique `auth_user_id` constraint prevents duplicate rows, but the current REST update pattern alone is not a sufficient lock.

## 9. Rollback considerations

The FK correction is forward-only and changes future delete behavior; it does not restore rows already deleted by an earlier operation. Before application, take a schema/data backup appropriate to the environment and verify the exact live constraint identities.

If the migration fails its catalog checks, it must abort before changing any FK. If an application deletion fails after `DATA_CLEANED`, retry only Auth deletion; do not rerun relational cleanup unnecessarily.

## 10. Dedicated test-account procedure

Do not enable `ACCOUNT_DELETION_TEST_MODE` yet.

When approved, use an isolated test project and a dedicated test Auth UUID with controlled fixtures:

1. Pre-check all FK definitions through `pg_constraint`, `pg_class`, `pg_namespace`, and `pg_attribute`.
2. Record counts and primary keys for orders, order items, reviews, support tickets, replies, consultations, coupon usage, and approved cleanup tables.
3. Record Auth-user existence and provider identities through the approved server-side test tooling.
4. Record object paths only in `users` and `room-visualizer` under the test UUID.
5. Test email re-auth success/failure; verify Google and phone fail closed.
6. Test duplicate/concurrent requests and Auth-delete retry.
7. After the FK correction, run deletion only for the test UUID.
8. Post-check that orders/order items and every retained record remain, with retained user IDs set to `NULL` where the policy requires.
9. Confirm approved child rows and approved storage objects are removed, while `documents`/`support` objects remain.
10. Verify the test Auth user is absent and the deletion request reaches `COMPLETED`.

## Final answer

**Can we safely call `auth.admin.deleteUser(authUserId)` with the current schema? No.**

The exact unsafe path is:

```text
auth.users → profiles (CASCADE)
profiles → reviews, support_tickets, support_ticket_replies,
           consultations, coupon_usage (CASCADE)
```

Do not enable deletion. The minimum safe correction is a new forward-only catalog-validated migration making the five retained profile FKs nullable with `ON DELETE SET NULL`, followed by live-schema verification and dedicated test-account E2E testing. That schema correction has not been implemented in this review.
