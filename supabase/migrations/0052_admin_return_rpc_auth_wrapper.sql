-- Phase 3A: separate authenticated admin authorization from the privileged
-- normalized return mutation function.
-- 0050 and 0051 are intentionally left unchanged.

alter function public.admin_transition_return(uuid, text, text, text, text)
  rename to admin_transition_return_internal;

-- Preserve the 0050 mutation behavior while allowing trusted service-role
-- calls that do not carry an end-user JWT. The authenticated wrapper below
-- remains responsible for public.is_admin_user() authorization.
create or replace function public.admin_transition_return_internal(
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
  if auth.uid() is not null and not public.is_admin_user() then
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

comment on function public.admin_transition_return_internal(uuid, text, text, text, text) is
  'Trusted internal normalized return transition operation. Callable only by service_role or the authenticated admin wrapper.';

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
begin
  if not public.is_admin_user() then
    raise exception using errcode = 'P3001', message = 'RETURN_ADMIN_REQUIRED';
  end if;

  return query
  select *
  from public.admin_transition_return_internal(
    p_return_id,
    p_to_status,
    p_rejection_reason,
    p_inspection_result,
    p_inspection_notes
  );
end;
$$;

comment on function public.admin_transition_return(uuid, text, text, text, text) is
  'Authenticated admin wrapper for the trusted normalized return transition operation.';

revoke all on function public.admin_transition_return_internal(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_transition_return_internal(uuid, text, text, text, text)
  to service_role;

revoke all on function public.admin_transition_return(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.admin_transition_return(uuid, text, text, text, text)
  to authenticated, service_role;
