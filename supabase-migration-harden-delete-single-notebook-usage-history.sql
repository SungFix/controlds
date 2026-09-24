-- Support older request history rows that predate request_id linkage.
-- Removes only the selected completed request's own request/pickup/return events.

create or replace function public.ete_delete_request_history(p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  v_profile public.ete_profiles;
  v_request public.ete_requests;
  v_removed_history integer:=0;
  v_detail text;
  v_history_end timestamptz;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if not public.ete_has_capability('control_ds_access') then raise exception 'forbidden'; end if;

  select * into v_request
  from public.ete_requests
  where id=p_request_id
  for update;

  if not found then raise exception 'request_not_found'; end if;
  if v_request.status<>'done' then raise exception 'invalid_status'; end if;
  if coalesce(v_profile.role,'') not in ('adm','professor') and v_request.requested_by<>auth.uid() then
    raise exception 'forbidden';
  end if;

  v_detail:=v_request.student_class||' '||v_request.student_course||' · '||
    to_char(v_request.start_time,'HH24:MI')||'–'||to_char(v_request.end_time,'HH24:MI');
  v_history_end:=coalesce(v_request.returned_at,v_request.updated_at,v_request.created_at)+interval '5 seconds';

  delete from public.ete_history h
  where h.request_id=p_request_id
     or (
       h.request_id is null
       and h.student_id is not distinct from v_request.student_id
       and h.detail=v_detail
       and h.type in ('request','pickup','return')
       and h.at_iso between v_request.created_at-interval '5 seconds' and v_history_end
     );
  get diagnostics v_removed_history = row_count;

  delete from public.ete_requests where id=p_request_id;

  return jsonb_build_object(
    'ok',true,
    'request_id',p_request_id,
    'history_removed',v_removed_history
  );
end;
$function$;

revoke all on function public.ete_delete_request_history(text) from public, anon;
grant execute on function public.ete_delete_request_history(text) to authenticated;
