-- Registered-student-only request flow.
-- Keeps legacy RPCs intact for compatibility while the current UI uses v3 without a student PIN.

create or replace function public.ete_create_request_v3(
  p_student_id text,
  p_reason text,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_date_key date
)
returns public.ete_requests
language plpgsql
security definer
set search_path to 'public','auth','extensions'
as $function$
declare
  v_profile public.ete_profiles;
  v_student public.ete_students;
  v_request public.ete_requests;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if coalesce(v_profile.role,'') not in ('adm','diretor','professor') then raise exception 'forbidden'; end if;

  if nullif(trim(coalesce(p_student_id,'')),'') is null then raise exception 'student_not_found'; end if;
  select * into v_student from public.ete_students where id=p_student_id for update;
  if not found then raise exception 'student_not_found'; end if;

  if p_start_time < time '07:30' or p_end_time > time '16:40' or p_end_time <= p_start_time then raise exception 'invalid_time'; end if;
  if p_date_key < (now() at time zone 'America/Recife')::date then raise exception 'past_date'; end if;

  if exists(
    select 1 from public.ete_requests r
    where r.date_key=p_date_key
      and (r.student_id=v_student.id or (r.student_id is null and lower(trim(r.student_name))=lower(trim(v_student.name)) and r.student_class=v_student.class_name and r.student_course=v_student.course))
      and r.status in ('wait','use')
      and p_start_time<r.end_time and r.start_time<p_end_time
  ) then raise exception 'duplicate_overlap'; end if;

  update public.ete_students
  set use_count=use_count+1,last_used=now(),updated_at=now()
  where id=v_student.id
  returning * into v_student;

  insert into public.ete_requests(
    student_name,student_class,student_course,student_id,class_id,
    reason,start_time,end_time,date_key,
    requested_by,requested_by_username,requested_by_label
  ) values(
    v_student.name,v_student.class_name,v_student.course,v_student.id,v_student.class_id,
    trim(p_reason),p_start_time,p_end_time,p_date_key,
    auth.uid(),v_profile.username,v_profile.display_name
  ) returning * into v_request;

  perform public.ete_log_student_event(
    v_student.id,
    'Pedido criado para '||v_request.student_name,
    v_request.student_class||' '||v_request.student_course||' · '||to_char(v_request.start_time,'HH24:MI')||'–'||to_char(v_request.end_time,'HH24:MI'),
    'request'
  );

  return v_request;
end
$function$;

create or replace function public.ete_pickup_request_v3(
  p_request_id text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','extensions'
as $function$
declare
  v_profile public.ete_profiles;
  v_request public.ete_requests;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if coalesce(v_profile.role,'') not in ('adm','professor','monitor') then raise exception 'forbidden'; end if;
  if p_code !~ '^(?:[0-9]{6}|[0-9]{9})$' then raise exception 'invalid_code'; end if;

  select * into v_request from public.ete_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status<>'wait' then raise exception 'invalid_status'; end if;

  if exists(select 1 from public.ete_requests where code=p_code and status='use' and id<>p_request_id) then raise exception 'code_in_use'; end if;

  update public.ete_requests
  set code=p_code,status='use',picked_at=now(),picked_by=auth.uid(),picked_by_label=v_profile.display_name,updated_at=now()
  where id=p_request_id
  returning * into v_request;

  perform public.ete_log_student_event(
    v_request.student_id,
    'Notebook '||p_code||' retirado por '||v_request.student_name,
    v_request.student_class||' '||v_request.student_course||' · '||to_char(v_request.start_time,'HH24:MI')||'–'||to_char(v_request.end_time,'HH24:MI'),
    'pickup'
  );

  return jsonb_build_object('ok',true,'request',to_jsonb(v_request));
end
$function$;

revoke all on function public.ete_create_request_v3(text,text,time without time zone,time without time zone,date) from public, anon;
grant execute on function public.ete_create_request_v3(text,text,time without time zone,time without time zone,date) to authenticated;
revoke all on function public.ete_pickup_request_v3(text,text) from public, anon;
grant execute on function public.ete_pickup_request_v3(text,text) to authenticated;
