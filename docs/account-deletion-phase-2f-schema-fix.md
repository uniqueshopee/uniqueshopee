# UniqueShopee Web Account Deletion — Phase 2F Schema Fix

Status: migration created and repository-validated. It has not been applied to Supabase.

## 1. Migration filename

`supabase/migrations/0044_account_deletion_retained_fk_protection.sql`

Migration 0044 is the next available migration number. Migrations 0042 and 0043 were not modified.

## 2. Exact constraints changed

The migration catalog-validates and changes only these five exact relationships:

| Source | Referenced target | Before | After |
|---|---|---|---|
| `public.reviews.user_id` | `public.profiles.id` | `ON DELETE CASCADE` | `ON DELETE SET NULL` |
| `public.coupon_usage.user_id` | `public.profiles.id` | `ON DELETE CASCADE` | `ON DELETE SET NULL` |
| `public.support_tickets.user_id` | `public.profiles.id` | `ON DELETE CASCADE` | `ON DELETE SET NULL` |
| `public.support_ticket_replies.user_id` | `public.profiles.id` | `ON DELETE CASCADE` | `ON DELETE SET NULL` |
| `public.consultations.user_id` | `public.profiles.id` | `ON DELETE CASCADE` | `ON DELETE SET NULL` |

Constraint names are resolved from `pg_constraint.conname`, preserved where practical, and never assumed. The existing `ON UPDATE` action is read from `confupdtype` and recreated unchanged.

The migration fails closed unless each target is exactly one single-column FK with the expected source table/column, referenced table/column, and current `ON DELETE CASCADE`. It also requires each source column to still be `NOT NULL` before alteration. PostgreSQL migration transaction rollback means a validation or DDL error leaves all five relationships unchanged.

## 3. Nullability

Before:

```text
reviews.user_id                 NOT NULL
coupon_usage.user_id            NOT NULL
support_tickets.user_id         NOT NULL
support_ticket_replies.user_id NOT NULL
consultations.user_id           NOT NULL
```

After:

```text
reviews.user_id                 NULLABLE
coupon_usage.user_id            NULLABLE
support_tickets.user_id         NULLABLE
support_ticket_replies.user_id NULLABLE
consultations.user_id           NULLABLE
```

No existing ownership values are updated.

## 4. Remaining FKs referencing `public.profiles`

After 0044, the repository still contains these profile relationships:

| Table/column | ON DELETE | Decision and safety |
|---|---|---|
| `public.profile_roles.profile_id` | `CASCADE` | Approved direct cleanup category; does not delete retained tables. |
| `public.profile_roles.assigned_by` | `SET NULL` | Safe; assignment rows survive. |
| `public.addresses.user_id` | `CASCADE` | Approved direct cleanup category; orders reference addresses with `SET NULL`. |
| `public.cart_items.user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.wishlist_items.user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.orders.user_id` | `SET NULL` from 0042 | Orders survive; `order_items` therefore survive. |
| `public.reviews.user_id` | `SET NULL` from 0044 | Retained review rows survive with nullable ownership. |
| `public.coupon_usage.user_id` | `SET NULL` from 0044 | Retained coupon rows survive with nullable ownership. |
| `public.notifications.user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.support_tickets.user_id` | `SET NULL` from 0044 | Retained support tickets survive with nullable ownership. |
| `public.support_tickets.assigned_to_profile_id` | `SET NULL` | Does not delete support tickets. |
| `public.paint_calculations.user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.room_visualizations.user_id` | `CASCADE` | Approved direct cleanup category. |
| `public.settings.updated_by` | `SET NULL` | Does not delete settings. |
| `public.consultations.user_id` | `SET NULL` from 0044 | Retained consultation rows survive with nullable ownership. |

`public.profiles.id → auth.users.id ON DELETE CASCADE` remains intentionally unchanged. The five protected child FKs now prevent profile deletion from deleting retained rows. `support_ticket_replies.user_id` is protected by 0044, and its separate `ticket_id → support_tickets.id ON DELETE CASCADE` is safe because support tickets themselves survive. `reviews.order_item_id → order_items.id ON DELETE SET NULL` is also safe because order items survive.

The other FKs from retained tables are unchanged: `reviews.product_id → products.id CASCADE` and `reviews.order_item_id → order_items.id SET NULL`; `coupon_usage.coupon_id → coupons.id CASCADE` and `coupon_usage.order_id → orders.id SET NULL`; `support_tickets.order_id → orders.id SET NULL`, `product_id → products.id SET NULL`, and `assigned_to_profile_id → profiles.id SET NULL`; `support_ticket_replies.ticket_id → support_tickets.id CASCADE`; and `consultations.product_id → products.id CASCADE`. None is changed by 0044, and none is caused by deleting the target profile to delete a retained row after the five profile ownership FKs are protected.

## 5. Data-preservation proof

After 0044, deleting a profile causes the five retained ownership columns to become `NULL`; it does not remove their rows. The orders relationship already behaves the same way. Since `orders` survives, `order_items.order_id ON DELETE CASCADE` is not activated. Totals, payment references, status, snapshots, notes, and order items remain unchanged.

The approved cleanup function remains the only direct deletion mechanism for its approved child categories. It does not delete profiles, retained tables, orders, order items, or phone verifications.

## 6. Production verification SQL

Run these read-only queries after manually applying 0044. Replace the UUID literal in the row-count query with the dedicated test-account UUID only when test execution is separately approved.

### A. Column nullability

```sql
select table_schema, table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('reviews', 'user_id'),
    ('coupon_usage', 'user_id'),
    ('support_tickets', 'user_id'),
    ('support_ticket_replies', 'user_id'),
    ('consultations', 'user_id')
  )
order by table_name;
```

### B. Exact five FK definitions

```sql
select
  n_src.nspname as source_schema,
  src.relname as source_table,
  a_src.attname as source_column,
  c.conname as constraint_name,
  n_ref.nspname as referenced_schema,
  ref.relname as referenced_table,
  a_ref.attname as referenced_column,
  case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as delete_action,
  case c.confupdtype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as update_action
from pg_constraint c
join pg_class src on src.oid = c.conrelid
join pg_namespace n_src on n_src.oid = src.relnamespace
join pg_attribute a_src on a_src.attrelid = c.conrelid and a_src.attnum = c.conkey[1]
join pg_class ref on ref.oid = c.confrelid
join pg_namespace n_ref on n_ref.oid = ref.relnamespace
join pg_attribute a_ref on a_ref.attrelid = c.confrelid and a_ref.attnum = c.confkey[1]
where n_src.nspname = 'public'
  and n_ref.nspname = 'public'
  and ref.relname = 'profiles'
  and c.contype = 'f'
  and array_length(c.conkey, 1) = 1
  and array_length(c.confkey, 1) = 1
  and (src.relname, a_src.attname) in (
    ('reviews', 'user_id'),
    ('coupon_usage', 'user_id'),
    ('support_tickets', 'user_id'),
    ('support_ticket_replies', 'user_id'),
    ('consultations', 'user_id')
  )
order by source_table;
```

### C. All FKs referencing profiles

```sql
select
  n_src.nspname as source_schema,
  src.relname as source_table,
  a_src.attname as source_column,
  c.conname as constraint_name,
  a_ref.attname as referenced_column,
  case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as delete_action
from pg_constraint c
join pg_class src on src.oid = c.conrelid
join pg_namespace n_src on n_src.oid = src.relnamespace
join pg_attribute a_src on a_src.attrelid = c.conrelid and a_src.attnum = c.conkey[1]
join pg_attribute a_ref on a_ref.attrelid = c.confrelid and a_ref.attnum = c.confkey[1]
where c.contype = 'f'
  and c.confrelid = 'public.profiles'::regclass
order by source_table, source_column;
```

### D. Orders FK

```sql
select
  c.conname,
  pg_get_constraintdef(c.oid) as constraint_definition,
  col.is_nullable
from pg_constraint c
join information_schema.columns col
  on col.table_schema = 'public'
 and col.table_name = 'orders'
 and col.column_name = 'user_id'
where c.conrelid = 'public.orders'::regclass
  and c.confrelid = 'public.profiles'::regclass
  and c.contype = 'f';
```

### E. Existing row counts before/after

Run the first query before the eventual dedicated test-account deletion and save the returned IDs/counts. Afterward, run the second query with those saved IDs substituted into the `values` list. This avoids confusing pre-existing `NULL` ownership rows with rows detached by the test. Both queries are read-only.

Before deletion:

```sql
with target as (select '00000000-0000-0000-0000-000000000000'::uuid as user_id)
select 'reviews' as table_name, count(*) as owned_rows, array_agg(r.id order by r.id) as row_ids
from public.reviews r cross join target where r.user_id = target.user_id
union all
select 'coupon_usage', count(*), array_agg(c.id order by c.id)
from public.coupon_usage c cross join target where c.user_id = target.user_id
union all
select 'support_tickets', count(*), array_agg(s.id order by s.id)
from public.support_tickets s cross join target where s.user_id = target.user_id
union all
select 'support_ticket_replies', count(*), array_agg(r.id order by r.id)
from public.support_ticket_replies r cross join target where r.user_id = target.user_id
union all
select 'consultations', count(*), array_agg(c.id order by c.id)
from public.consultations c cross join target where c.user_id = target.user_id
union all
select 'orders', count(*), array_agg(o.id order by o.id)
from public.orders o cross join target where o.user_id = target.user_id;
```

After deletion, replace the placeholder IDs with the IDs saved from the first query:

```sql
with expected(table_name, row_id) as (
  values
    ('reviews', '00000000-0000-0000-0000-000000000000'::uuid),
    ('coupon_usage', '00000000-0000-0000-0000-000000000000'::uuid),
    ('support_tickets', '00000000-0000-0000-0000-000000000000'::uuid),
    ('support_ticket_replies', '00000000-0000-0000-0000-000000000000'::uuid),
    ('consultations', '00000000-0000-0000-0000-000000000000'::uuid),
    ('orders', '00000000-0000-0000-0000-000000000000'::uuid)
)
select e.table_name, count(p.row_exists) as surviving_rows,
       count(*) filter (where p.row_exists and p.user_id is null) as rows_with_null_owner
from expected e
left join lateral (
  select true as row_exists, user_id from public.reviews where e.table_name = 'reviews' and id = e.row_id
  union all select true, user_id from public.coupon_usage where e.table_name = 'coupon_usage' and id = e.row_id
  union all select true, user_id from public.support_tickets where e.table_name = 'support_tickets' and id = e.row_id
  union all select true, user_id from public.support_ticket_replies where e.table_name = 'support_ticket_replies' and id = e.row_id
  union all select true, user_id from public.consultations where e.table_name = 'consultations' and id = e.row_id
  union all select true, user_id from public.orders where e.table_name = 'orders' and id = e.row_id
) p on true
group by e.table_name
order by e.table_name;
```

## 7. Rollback considerations

The migration is forward-only and transactional. If catalog validation or any DDL fails, PostgreSQL rolls back all changes in the migration. There is no data rollback requirement because no row values are changed.

Reverting the behavior would require a separately reviewed forward migration that catalog-validates the new `SET NULL` FKs, makes the columns `NOT NULL` only after proving no nulls exist, and restores `ON DELETE CASCADE`. Such a rollback is not safe to run automatically after account data may have been detached.

## 8. Remaining blockers

- Do not apply 0044 to production until the exact live FK inventory is reviewed.
- Do not enable `ACCOUNT_DELETION_TEST_MODE` yet.
- Add an atomic database-backed deletion-request claim before concurrent deletion is enabled.
- Resolve operational holds for open orders, returns, refunds, disputes, support, and consultations.
- Approve retention/anonymization treatment for order snapshots, notes, documents, and support attachments.
- Run a dedicated isolated test-account E2E after 0044 is applied.

0044 protects the retained rows from the known profile/Auth cascade, but it does not by itself authorize or complete account deletion.
