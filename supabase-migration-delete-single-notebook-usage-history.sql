-- Remove only one completed notebook usage record and its linked history events.
-- The notebook inventory row and all unrelated requests/history remain intact.

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

  delete from public.ete_history where request_id=p_request_id;
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
