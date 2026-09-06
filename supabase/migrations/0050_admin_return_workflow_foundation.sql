-- Phase 3A: database-enforced normalized return workflow transitions.
-- Legacy support_tickets rows are intentionally untouched.

create table if not exists public.return_status_history (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete restrict,
  from_status text not null,
  to_status text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  reason text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.return_status_history enable row level security;

revoke all on table public.return_status_history from public, anon, authenticated;
grant select on table public.return_status_history to authenticated;
grant all on table public.return_status_history to service_role;

drop policy if exists return_status_history_admin_select on public.return_status_history;
create policy return_status_history_admin_select
on public.return_status_history
for select
using (public.is_admin_user());

create or replace function public.enforce_return_status_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if not (
    (old.status = 'RETURN_REQUESTED' and new.status in ('RETURN_APPROVED', 'RETURN_REJECTED'))
    or (old.status = 'RETURN_APPROVED' and new.status in ('PICKUP_SCHEDULED', 'RETURN_REJECTED'))
    or (old.status = 'PICKUP_SCHEDULED' and new.status in ('PICKED_UP', 'RETURN_REJECTED'))
    or (old.status = 'PICKED_UP' and new.status in ('RECEIVED', 'RETURN_REJECTED'))
    or (old.status = 'RECEIVED' and new.status in ('UNDER_INSPECTION', 'RETURN_REJECTED'))
    or (old.status = 'UNDER_INSPECTION' and new.status in ('REFUND_PENDING', 'RETURN_REJECTED'))
    or (old.status = 'REFUND_PENDING' and new.status = 'REFUNDED')
  ) then
    raise exception using errcode = 'P3010', message = 'RETURN_INVALID_STATUS_TRANSITION';
  end if;

  if new.status = 'RETURN_REJECTED' and new.rejected_at is null then
    raise exception using errcode = 'P3011', message = 'RETURN_REJECTION_TIMESTAMP_REQUIRED';
  end if;

  if new.status = 'RETURN_APPROVED' and new.approved_at is null then
    raise exception using errcode = 'P3013', message = 'RETURN_APPROVAL_TIMESTAMP_REQUIRED';
  end if;

  if new.status = 'PICKED_UP' and new.picked_up_at is null then
    raise exception using errcode = 'P3014', message = 'RETURN_PICKUP_TIMESTAMP_REQUIRED';
  end if;

  if new.status = 'RECEIVED' and new.received_at is null then
    raise exception using errcode = 'P3015', message = 'RETURN_RECEIPT_TIMESTAMP_REQUIRED';
  end if;

  if new.status = 'UNDER_INSPECTION' and new.inspection_started_at is null then
    raise exception using errcode = 'P3016', message = 'RETURN_INSPECTION_START_TIMESTAMP_REQUIRED';
  end if;

  if new.status = 'REFUNDED' and new.inspected_at is null then
    raise exception using errcode = 'P3012', message = 'RETURN_INSPECTION_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_return_status_transition() from public, anon, authenticated;
grant execute on function public.enforce_return_status_transition() to service_role;

drop trigger if exists trg_enforce_return_status_transition on public.returns;
create trigger trg_enforce_return_status_transition
before update of status on public.returns
for each row
execute function public.enforce_return_status_transition();

create or replace function public.admin_transition_return(
  p_return_id uuid,
  p_to_status text,
  p_rejection_reason text default null,
  p_inspection_result text default null,
  p_inspection_notes text default null
)
returns table (
  return_id uuid,
  status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_return public.returns%rowtype;
  v_actor_profile_id uuid;
  v_reason text := nullif(btrim(p_rejection_reason), '');
  v_inspection_result text := nullif(upper(btrim(p_inspection_result)), '');
  v_inspection_notes text := nullif(btrim(p_inspection_notes), '');
begin
  if not public.is_admin_user() then
    raise exception using errcode = 'P3001', message = 'RETURN_ADMIN_REQUIRED';
  end if;

  if p_return_id is null or p_to_status is null then
    raise exception using errcode = 'P3002', message = 'RETURN_INVALID_INPUT';
  end if;

  if p_to_status not in (
    'RETURN_APPROVED', 'RETURN_REJECTED', 'PICKUP_SCHEDULED',
    'PICKED_UP', 'RECEIVED', 'UNDER_INSPECTION', 'REFUND_PENDING', 'REFUNDED'
  ) then
    raise exception using errcode = 'P3002', message = 'RETURN_INVALID_INPUT';
  end if;

  if p_to_status = 'REFUNDED' then
    raise exception using errcode = 'P3009', message = 'RETURN_REFUNDED_PHASE_DISABLED';
  end if;

  select r.*
    into v_return
  from public.returns r
  where r.id = p_return_id
  for update;

  if not found then
    raise exception using errcode = 'P3003', message = 'RETURN_NOT_FOUND';
  end if;

  if p_to_status = 'RETURN_REJECTED' then
    if v_reason is null then
      raise exception using errcode = 'P3005', message = 'RETURN_REJECTION_REASON_REQUIRED';
    end if;
    if length(v_reason) > 1000 then
      raise exception using errcode = 'P3002', message = 'RETURN_INVALID_INPUT';
    end if;
  elsif v_reason is not null then
    raise exception using errcode = 'P3002', message = 'RETURN_INVALID_INPUT';
  end if;

  if p_to_status in ('REFUND_PENDING', 'RETURN_REJECTED')
     and v_return.status = 'UNDER_INSPECTION' then
    if v_inspection_result not in ('GOOD', 'FAILED') then
      raise exception using errcode = 'P3006', message = 'RETURN_INSPECTION_RESULT_REQUIRED';
    end if;
    if p_to_status = 'REFUND_PENDING' and v_inspection_result <> 'GOOD' then
      raise exception using errcode = 'P3006', message = 'RETURN_GOOD_INSPECTION_REQUIRED';
    end if;
    if p_to_status = 'RETURN_REJECTED' and v_inspection_result <> 'FAILED' then
      raise exception using errcode = 'P3006', message = 'RETURN_FAILED_INSPECTION_REQUIRED';
    end if;
    if v_inspection_notes is not null and length(v_inspection_notes) > 2000 then
      raise exception using errcode = 'P3002', message = 'RETURN_INVALID_INPUT';
    end if;
  elsif v_inspection_result is not null or v_inspection_notes is not null then
    raise exception using errcode = 'P3002', message = 'RETURN_INVALID_INPUT';
  end if;

  select auth.uid()
    into v_actor_profile_id;

  if p_to_status = 'RETURN_REJECTED' then
    update public.returns
    set status = p_to_status,
        rejected_at = now(),
        admin_rejection_reason = v_reason,
        inspection_result = case when v_return.status = 'UNDER_INSPECTION' then v_inspection_result else inspection_result end,
        inspection_notes = case when v_return.status = 'UNDER_INSPECTION' then v_inspection_notes else inspection_notes end,
        inspected_at = case when v_return.status = 'UNDER_INSPECTION' then now() else inspected_at end
    where id = p_return_id;
  elsif p_to_status = 'RETURN_APPROVED' then
    update public.returns set status = p_to_status, approved_at = now() where id = p_return_id;
  elsif p_to_status = 'PICKED_UP' then
    update public.returns set status = p_to_status, picked_up_at = now() where id = p_return_id;
  elsif p_to_status = 'RECEIVED' then
    update public.returns set status = p_to_status, received_at = now() where id = p_return_id;
  elsif p_to_status = 'UNDER_INSPECTION' then
    update public.returns set status = p_to_status, inspection_started_at = now() where id = p_return_id;
  elsif p_to_status = 'REFUND_PENDING' then
    update public.returns
    set status = p_to_status,
        inspection_result = v_inspection_result,
        inspection_notes = v_inspection_notes,
        inspected_at = now()
    where id = p_return_id;
  else
    update public.returns set status = p_to_status where id = p_return_id;
  end if;

  insert into public.return_status_history (
    return_id, from_status, to_status, actor_profile_id, reason, notes
  ) values (
    p_return_id, v_return.status, p_to_status, v_actor_profile_id, v_reason, v_inspection_notes
  );

  return query select p_return_id, p_to_status;
end;
$$;

comment on function public.admin_transition_return(uuid, text, text, text, text) is
  'Server-authorized, locked normalized return transition operation for Phase 3A. Refund processing is intentionally excluded.';

revoke all on function public.admin_transition_return(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.admin_transition_return(uuid, text, text, text, text)
  to authenticated, service_role;

-- Direct authenticated table updates are removed so status/lifecycle metadata
-- changes go through the locked, admin-authorized operation above.
revoke update on public.returns from authenticated;
