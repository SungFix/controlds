-- Control Ds / Portal ETE
-- Registro da migration já aplicada em produção em 2026-09-10:
-- relational_frontend_rpcs_and_student_reputation
--
-- Mantém as RPCs antigas e adiciona versões que aceitam student_id,
-- além do cálculo centralizado de reputação. Não remove colunas legadas.

create or replace function public.ete_create_request_v2(
  p_student_id text,
  p_student_name text,
  p_student_class text,
  p_student_course text,
  p_reason text,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_date_key date,
  p_pin text
)
returns public.ete_requests
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions'
as $function$
declare
  v_profile public.ete_profiles;
  v_student public.ete_students;
  v_request public.ete_requests;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if coalesce(v_profile.role,'') not in ('adm','diretor','professor') then raise exception 'forbidden'; end if;

  if p_start_time < time '07:30' or p_end_time > time '16:40' or p_end_time <= p_start_time then raise exception 'invalid_time'; end if;
  if p_pin !~ '^[0-9]{4,8}$' then raise exception 'invalid_pin'; end if;
  if p_date_key < (now() at time zone 'America/Recife')::date then raise exception 'past_date'; end if;

  if nullif(trim(coalesce(p_student_id,'')),'') is not null then
    select * into v_student from public.ete_students where id=p_student_id for update;
    if not found then raise exception 'student_not_found'; end if;

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
  else
    if not (
      (p_student_course='DS' and p_student_class in ('1°A','1°B','2°A','2°B')) or
      (p_student_course='EDF' and p_student_class in ('1°A','1°B','2°A','2°B','3°A','3°B')) or
      (p_student_course='GTU' and p_student_class='3°')
    ) then raise exception 'invalid_group'; end if;

    if exists(
      select 1 from public.ete_requests r
      where r.date_key=p_date_key
        and lower(trim(r.student_name))=lower(trim(p_student_name))
        and r.student_class=p_student_class and r.student_course=p_student_course
        and r.status in ('wait','use')
        and p_start_time<r.end_time and r.start_time<p_end_time
    ) then raise exception 'duplicate_overlap'; end if;

    insert into public.ete_students(name,class_name,course,use_count,last_used,created_by)
    values(trim(p_student_name),p_student_class,p_student_course,1,now(),auth.uid())
    on conflict (lower(trim(name)),class_name,course)
    do update set use_count=public.ete_students.use_count+1,last_used=now(),updated_at=now()
    returning * into v_student;
  end if;

  insert into public.ete_requests(
    student_name,student_class,student_course,student_id,class_id,
    reason,start_time,end_time,date_key,
    requested_by,requested_by_username,requested_by_label
  ) values(
    v_student.name,v_student.class_name,v_student.course,v_student.id,v_student.class_id,
    trim(p_reason),p_start_time,p_end_time,p_date_key,
    auth.uid(),v_profile.username,v_profile.display_name
  ) returning * into v_request;

  insert into public.ete_request_secrets(request_id,pin_hash)
  values(v_request.id,extensions.crypt(p_pin,extensions.gen_salt('bf',10)));

  perform public.ete_log_student_event(
    v_student.id,
    'Pedido criado para '||v_request.student_name,
    v_request.student_class||' '||v_request.student_course||' · '||to_char(v_request.start_time,'HH24:MI')||'–'||to_char(v_request.end_time,'HH24:MI'),
    'request'
  );
  return v_request;
end
$function$;

create or replace function public.ete_create_permission_v2(
  p_student_id text,
  p_student text,
  p_class_name text,
  p_interval text,
  p_reason text
)
returns public.ete_permissions
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_profile public.ete_profiles;
  v_permission public.ete_permissions;
  v_student public.ete_students;
  v_student_id text;
  v_class_id uuid;
  v_student_name text:=trim(p_student);
  v_class_name text:=trim(p_class_name);
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if coalesce(v_profile.role,'') not in ('adm','diretor','professor') then raise exception 'forbidden'; end if;
  if p_interval not in ('morning','lunch','afternoon') then raise exception 'invalid_interval'; end if;

  if nullif(trim(coalesce(p_student_id,'')),'') is not null then
    select * into v_student from public.ete_students where id=p_student_id;
    if not found then raise exception 'student_not_found'; end if;
    v_student_id:=v_student.id;
    v_class_id:=v_student.class_id;
    v_student_name:=v_student.name;
    v_class_name:=v_student.class_name||' '||v_student.course;
  else
    select * into v_student
    from public.ete_students
    where lower(trim(name))=lower(trim(p_student))
      and class_name||' '||course=trim(p_class_name)
    limit 1;
    if found then
      v_student_id:=v_student.id;
      v_class_id:=v_student.class_id;
      v_student_name:=v_student.name;
      v_class_name:=v_student.class_name||' '||v_student.course;
    end if;
  end if;

  insert into public.ete_permissions(student,class_name,interval,reason,created_by,student_id,class_id)
  values(v_student_name,v_class_name,p_interval,trim(p_reason),auth.uid(),v_student_id,v_class_id)
  returning * into v_permission;

  perform public.ete_log_student_event(
    v_student_id,
    'Permissão de entrada criada para '||v_permission.student,
    case p_interval
      when 'morning' then 'Intervalo da manhã · 09:10–09:30'
      when 'lunch' then 'Horário de almoço · 12:00–13:00'
      else 'Intervalo da tarde · 14:40–15:00'
    end,
    'system'
  );
  return v_permission;
end
$function$;

create or replace function public.ete_get_student_reputation()
returns table(
  student_id text,
  total_returns bigint,
  on_time_returns bigint,
  late_returns bigint,
  score integer,
  level text
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $function$
begin
  if not exists(select 1 from public.ete_profiles where user_id=auth.uid()) then
    raise exception 'forbidden';
  end if;

  return query
  with return_rows as (
    select
      r.student_id,
      (
        (r.returned_at at time zone 'America/Recife')::date > r.date_key
        or (
          (r.returned_at at time zone 'America/Recife')::date = r.date_key
          and (r.returned_at at time zone 'America/Recife')::time > least((r.end_time + interval '15 minutes')::time,time '16:40')
        )
      ) as is_late
    from public.ete_requests r
    where r.student_id is not null and r.returned_at is not null
  ), stats as (
    select
      s.id as student_id,
      count(rr.student_id)::bigint as total_returns,
      count(rr.student_id) filter (where rr.is_late is false)::bigint as on_time_returns,
      count(rr.student_id) filter (where rr.is_late is true)::bigint as late_returns
    from public.ete_students s
    left join return_rows rr on rr.student_id=s.id
    group by s.id
  ), scored as (
    select
      stats.*,
      case when total_returns>0 then round((on_time_returns::numeric/total_returns::numeric)*100)::integer else null end as score
    from stats
  )
  select
    scored.student_id,
    scored.total_returns,
    scored.on_time_returns,
    scored.late_returns,
    scored.score,
    case
      when scored.score is null then 'Sem histórico'
      when scored.score>=90 then 'Excelente'
      when scored.score>=75 then 'Boa'
      when scored.score>=50 then 'Regular'
      else 'Atenção'
    end as level
  from scored;
end
$function$;

revoke all on function public.ete_create_request_v2(text,text,text,text,text,time without time zone,time without time zone,date,text) from public, anon;
revoke all on function public.ete_create_permission_v2(text,text,text,text,text) from public, anon;
revoke all on function public.ete_get_student_reputation() from public, anon;

grant execute on function public.ete_create_request_v2(text,text,text,text,text,time without time zone,time without time zone,date,text) to authenticated;
grant execute on function public.ete_create_permission_v2(text,text,text,text,text) to authenticated;
grant execute on function public.ete_get_student_reputation() to authenticated;
