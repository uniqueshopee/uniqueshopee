-- Account-deletion retained-record FK protection.
--
-- This migration changes only the five profile ownership FKs that must survive
-- Auth/profile deletion. It performs no data updates or deletes. Every target
-- FK is resolved from the live PostgreSQL catalog and the whole migration
-- aborts if any expected relationship is missing or ambiguous.

do $$
declare
  v_expected record;
  v_constraint_name text;
  v_constraint_count integer;
  v_update_action text;
  v_update_clause text;
begin
  for v_expected in
    select *
    from (values
      ('reviews'::text, 'user_id'::text),
      ('coupon_usage'::text, 'user_id'::text),
      ('support_tickets'::text, 'user_id'::text),
      ('support_ticket_replies'::text, 'user_id'::text),
      ('consultations'::text, 'user_id'::text)
    ) as expected(source_table, source_column)
  loop
    select
      count(*)::integer,
      min(c.conname),
      case min(c.confupdtype)
        when 'a' then 'NO ACTION'
        when 'r' then 'RESTRICT'
        when 'c' then 'CASCADE'
        when 'n' then 'SET NULL'
        when 'd' then 'SET DEFAULT'
        else null
      end
    into v_constraint_count, v_constraint_name, v_update_action
    from pg_constraint c
    join pg_class source_table
      on source_table.oid = c.conrelid
    join pg_namespace source_schema
      on source_schema.oid = source_table.relnamespace
    join pg_class referenced_table
      on referenced_table.oid = c.confrelid
    join pg_namespace referenced_schema
      on referenced_schema.oid = referenced_table.relnamespace
    join pg_attribute source_column
      on source_column.attrelid = c.conrelid
     and source_column.attnum = c.conkey[1]
     and source_column.attname = v_expected.source_column
    join pg_attribute referenced_column
      on referenced_column.attrelid = c.confrelid
     and referenced_column.attnum = c.confkey[1]
     and referenced_column.attname = 'id'
    where source_schema.nspname = 'public'
      and source_table.relname = v_expected.source_table
      and referenced_schema.nspname = 'public'
      and referenced_table.relname = 'profiles'
      and c.contype = 'f'
      and c.confdeltype = 'c'
      and array_length(c.conkey, 1) = 1
      and array_length(c.confkey, 1) = 1
      and (select attnotnull from pg_attribute
           where attrelid = c.conrelid
             and attnum = c.conkey[1]);

    if v_constraint_count <> 1 or v_constraint_name is null or v_update_action is null then
      raise exception
        'Expected exactly one public.%.% -> public.profiles.id ON DELETE CASCADE FK with a supported ON UPDATE action; found %',
        v_expected.source_table, v_expected.source_column, v_constraint_count;
    end if;

    v_update_clause := format(' on update %s', v_update_action);

    execute format(
      'alter table public.%I alter column %I drop not null',
      v_expected.source_table,
      v_expected.source_column
    );

    execute format(
      'alter table public.%I drop constraint %I',
      v_expected.source_table,
      v_constraint_name
    );

    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.profiles(id)%s on delete set null',
      v_expected.source_table,
      v_constraint_name,
      v_expected.source_column,
      v_update_clause
    );
  end loop;
end;
$$;
