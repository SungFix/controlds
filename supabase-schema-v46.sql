
-- Control Ds / ETE Controle de Notebooks
-- Backend seguro e normalizado (V46)
-- Migração aditiva: preserva public.app_state para compatibilidade temporária.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ete_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('adm','diretor','monitor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ete_students (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(trim(name)) between 2 and 120),
  class_name text not null check (class_name in ('1°A','1°B','2°A','2°B')),
  course text not null check (course in ('DS','EDF')),
  use_count integer not null default 0 check (use_count >= 0),
  last_used timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ete_students_identity_uq
on public.ete_students (lower(trim(name)), class_name, course);

create table if not exists public.ete_requests (
  id text primary key default gen_random_uuid()::text,
  student_name text not null check (length(trim(student_name)) between 2 and 120),
  student_class text not null check (student_class in ('1°A','1°B','2°A','2°B')),
  student_course text not null check (student_course in ('DS','EDF')),
  student_id text null references public.ete_students(id) on delete set null,
  reason text not null check (length(trim(reason)) between 2 and 1000),
  period text not null default 'Horário definido',
  start_time time not null,
  end_time time not null,
  date_key date not null,
  status text not null default 'wait' check (status in ('wait','use','done')),
  code text null check (code is null or code ~ '^[0-9]{6}$'),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_by_username text not null,
  requested_by_label text not null,
  picked_at timestamptz null,
  picked_by uuid null references auth.users(id) on delete set null,
  picked_by_label text null,
  returned_at timestamptz null,
  returned_by uuid null references auth.users(id) on delete set null,
  returned_by_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time >= time '07:30' and start_time <= time '16:40'),
  check (end_time >= time '07:30' and end_time <= time '16:40'),
  check (end_time > start_time)
);

create index if not exists ete_requests_date_status_idx
on public.ete_requests(date_key, status);

create index if not exists ete_requests_code_status_idx
on public.ete_requests(code, status);

create table if not exists public.ete_request_secrets (
  request_id text primary key references public.ete_requests(id) on delete cascade,
  pin_hash text null,
  legacy_hash text null,
  failed_attempts integer not null default 0,
  locked_until timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ete_permissions (
  id text primary key default gen_random_uuid()::text,
  student text not null check (length(trim(student)) between 2 and 120),
  class_name text not null check (length(trim(class_name)) between 1 and 80),
  interval text not null check (interval in ('morning','lunch','afternoon')),
  reason text not null check (length(trim(reason)) between 2 and 1000),
  active boolean not null default true,
  exit_confirmed boolean not null default false,
  exit_confirmed_at timestamptz null,
  exit_verifier_role text null check (exit_verifier_role is null or exit_verifier_role in ('Monitor','Professor')),
  exit_verifier_name text null,
  exit_recorded_by uuid null references auth.users(id) on delete set null,
  exit_recorded_by_label text null,
  restore_until timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ete_history (
  id text primary key default gen_random_uuid()::text,
  at_iso timestamptz not null default now(),
  text text not null,
  detail text not null default '',
  type text not null default 'system' check (type in ('request','pickup','return','system','warning')),
  responsible text not null default 'Sistema',
  created_by uuid null references auth.users(id) on delete set null
);

create index if not exists ete_history_at_idx on public.ete_history(at_iso desc);

-- Perfis oficiais: vinculados ao Auth pelo e-mail, sem IDs hardcoded.
insert into public.ete_profiles (user_id, username, display_name, role)
select id, 'klenio', 'Klenio', 'adm' from auth.users where lower(email)='klenio@email.com'
on conflict (user_id) do update set username=excluded.username, display_name=excluded.display_name, role=excluded.role, updated_at=now();

insert into public.ete_profiles (user_id, username, display_name, role)
select id, 'miguel', 'Miguel', 'diretor' from auth.users where lower(email)='miguel@email.com'
on conflict (user_id) do update set username=excluded.username, display_name=excluded.display_name, role=excluded.role, updated_at=now();

insert into public.ete_profiles (user_id, username, display_name, role)
select id, 'ronaldo', 'Ronaldo', 'diretor' from auth.users where lower(email)='ronaldo@email.com'
on conflict (user_id) do update set username=excluded.username, display_name=excluded.display_name, role=excluded.role, updated_at=now();

insert into public.ete_profiles (user_id, username, display_name, role)
select id, 'monitor', 'Monitor', 'monitor' from auth.users where lower(email)='monitor@email.com'
on conflict (user_id) do update set username=excluded.username, display_name=excluded.display_name, role=excluded.role, updated_at=now();

create or replace function public.ete_current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.ete_profiles where user_id = auth.uid()
$$;

create or replace function public.ete_current_username()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select username from public.ete_profiles where user_id = auth.uid()
$$;

create or replace function public.ete_current_display_name()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select display_name from public.ete_profiles where user_id = auth.uid()
$$;

create or replace function public.ete_log_event(
  p_text text,
  p_detail text default '',
  p_type text default 'system'
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select display_name into v_name
  from public.ete_profiles
  where user_id = auth.uid();

  insert into public.ete_history(text, detail, type, responsible, created_by)
  values (
    left(coalesce(p_text,''), 500),
    left(coalesce(p_detail,''), 1500),
    case when p_type in ('request','pickup','return','system','warning') then p_type else 'system' end,
    coalesce(v_name,'Sistema'),
    auth.uid()
  );
end;
$$;

create or replace function public.ete_upsert_student(
  p_name text,
  p_class_name text,
  p_course text
)
returns public.ete_students
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
  v_student public.ete_students;
begin
  select role into v_role from public.ete_profiles where user_id=auth.uid();
  if v_role not in ('adm','diretor') then
    raise exception 'forbidden';
  end if;

  if p_class_name not in ('1°A','1°B','2°A','2°B') or p_course not in ('DS','EDF') then
    raise exception 'invalid_group';
  end if;

  insert into public.ete_students(name,class_name,course,created_by)
  values (trim(p_name), p_class_name, p_course, auth.uid())
  on conflict (lower(trim(name)), class_name, course)
  do update set updated_at=now()
  returning * into v_student;

  perform public.ete_log_event(
    'Aluno cadastrado: ' || v_student.name,
    v_student.class_name || ' · ' || v_student.course,
    'system'
  );

  return v_student;
end;
$$;

create or replace function public.ete_create_request(
  p_student_name text,
  p_student_class text,
  p_student_course text,
  p_reason text,
  p_start_time time,
  p_end_time time,
  p_date_key date,
  p_pin text
)
returns public.ete_requests
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_profile public.ete_profiles;
  v_student public.ete_students;
  v_request public.ete_requests;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor') then raise exception 'forbidden'; end if;

  if p_student_class not in ('1°A','1°B','2°A','2°B') or p_student_course not in ('DS','EDF') then
    raise exception 'invalid_group';
  end if;
  if p_start_time < time '07:30' or p_end_time > time '16:40' or p_end_time <= p_start_time then
    raise exception 'invalid_time';
  end if;
  if p_pin !~ '^[0-9]{4,8}$' then raise exception 'invalid_pin'; end if;
  if p_date_key < (now() at time zone 'America/Recife')::date then raise exception 'past_date'; end if;

  if exists (
    select 1 from public.ete_requests r
    where r.date_key=p_date_key
      and lower(trim(r.student_name))=lower(trim(p_student_name))
      and r.status in ('wait','use')
      and p_start_time < r.end_time and r.start_time < p_end_time
  ) then
    raise exception 'duplicate_overlap';
  end if;

  insert into public.ete_students(name,class_name,course,use_count,last_used,created_by)
  values (trim(p_student_name),p_student_class,p_student_course,1,now(),auth.uid())
  on conflict (lower(trim(name)), class_name, course)
  do update set use_count=public.ete_students.use_count+1,last_used=now(),updated_at=now()
  returning * into v_student;

  insert into public.ete_requests(
    student_name,student_class,student_course,student_id,reason,start_time,end_time,date_key,
    requested_by,requested_by_username,requested_by_label
  ) values (
    trim(p_student_name),p_student_class,p_student_course,v_student.id,trim(p_reason),p_start_time,p_end_time,p_date_key,
    auth.uid(),v_profile.username,v_profile.display_name
  ) returning * into v_request;

  insert into public.ete_request_secrets(request_id,pin_hash)
  values(v_request.id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)));

  perform public.ete_log_event(
    'Pedido criado para ' || v_request.student_name,
    v_request.student_class || ' ' || v_request.student_course || ' · ' ||
      to_char(v_request.start_time,'HH24:MI') || '–' || to_char(v_request.end_time,'HH24:MI'),
    'request'
  );

  return v_request;
end;
$$;

create or replace function public.ete_fnv1a_hex(p_text text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  h bigint := 2166136261;
  i integer;
begin
  for i in 1..length(coalesce(p_text,'')) loop
    h := (h # ascii(substr(p_text,i,1)));
    h := (h * 16777619) % 4294967296;
  end loop;
  return lpad(to_hex(h),8,'0');
end;
$$;

create or replace function public.ete_pickup_request(
  p_request_id text,
  p_pin text,
  p_code text
)
returns public.ete_requests
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_profile public.ete_profiles;
  v_request public.ete_requests;
  v_secret public.ete_request_secrets;
  v_valid boolean := false;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','monitor') then raise exception 'forbidden'; end if;
  if p_code !~ '^[0-9]{6}$' then raise exception 'invalid_code'; end if;

  select * into v_request from public.ete_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'wait' then raise exception 'invalid_status'; end if;

  select * into v_secret from public.ete_request_secrets where request_id=p_request_id for update;
  if not found then raise exception 'pin_missing'; end if;
  if v_secret.locked_until is not null and v_secret.locked_until > now() then raise exception 'pin_locked'; end if;

  if v_secret.pin_hash is not null then
    v_valid := extensions.crypt(p_pin,v_secret.pin_hash)=v_secret.pin_hash;
  elsif v_secret.legacy_hash is not null and length(v_secret.legacy_hash)=64 then
    v_valid := encode(extensions.digest(p_pin,'sha256'),'hex')=v_secret.legacy_hash;
  elsif v_secret.legacy_hash is not null and length(v_secret.legacy_hash)=8 then
    v_valid := public.ete_fnv1a_hex(p_pin)=lower(v_secret.legacy_hash);
  end if;

  if not v_valid then
    update public.ete_request_secrets
      set failed_attempts=failed_attempts+1,
          locked_until=case when failed_attempts+1 >= 5 then now()+interval '5 minutes' else locked_until end,
          updated_at=now()
      where request_id=p_request_id;
    raise exception 'invalid_pin';
  end if;

  if exists (
    select 1 from public.ete_requests
    where code=p_code and status='use' and id<>p_request_id
  ) then raise exception 'code_in_use'; end if;

  update public.ete_request_secrets
  set failed_attempts=0,locked_until=null,updated_at=now()
  where request_id=p_request_id;

  update public.ete_requests
  set code=p_code,status='use',picked_at=now(),picked_by=auth.uid(),
      picked_by_label=v_profile.display_name,updated_at=now()
  where id=p_request_id
  returning * into v_request;

  perform public.ete_log_event(
    'Notebook ' || p_code || ' retirado por ' || v_request.student_name,
    v_request.student_class || ' ' || v_request.student_course || ' · ' ||
      to_char(v_request.start_time,'HH24:MI') || '–' || to_char(v_request.end_time,'HH24:MI'),
    'pickup'
  );

  return v_request;
end;
$$;

create or replace function public.ete_return_request(p_request_id text)
returns public.ete_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.ete_profiles;
  v_request public.ete_requests;
  v_late boolean;
  v_now_local timestamp;
  v_deadline time;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor','monitor') then raise exception 'forbidden'; end if;

  select * into v_request from public.ete_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'use' then raise exception 'invalid_status'; end if;

  v_now_local := now() at time zone 'America/Recife';
  v_deadline := least(v_request.end_time + interval '15 minutes', time '16:40');
  v_late := (v_now_local::date > v_request.date_key)
            or (v_now_local::date = v_request.date_key and v_now_local::time > v_deadline);

  update public.ete_requests
  set status='done',returned_at=now(),returned_by=auth.uid(),
      returned_by_label=v_profile.display_name,updated_at=now()
  where id=p_request_id
  returning * into v_request;

  perform public.ete_log_event(
    'Notebook ' || coalesce(v_request.code,'') || ' devolvido por ' || v_request.student_name,
    v_request.student_class || ' ' || v_request.student_course || ' · ' ||
      to_char(v_request.start_time,'HH24:MI') || '–' || to_char(v_request.end_time,'HH24:MI') ||
      case when v_late then ' · devolução atrasada' else '' end,
    'return'
  );

  return v_request;
end;
$$;

create or replace function public.ete_delete_request(p_request_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.ete_profiles;
  v_request public.ete_requests;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  select * into v_request from public.ete_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  if v_profile.role <> 'adm' and v_request.requested_by <> auth.uid() then raise exception 'forbidden'; end if;
  if v_request.status='use' then raise exception 'request_in_use'; end if;

  perform public.ete_log_event(
    'Pedido apagado · ' || v_request.student_name,
    v_request.student_class || ' ' || v_request.student_course || ' · ' ||
      to_char(v_request.start_time,'HH24:MI') || '–' || to_char(v_request.end_time,'HH24:MI'),
    'system'
  );

  delete from public.ete_requests where id=p_request_id;
end;
$$;

create or replace function public.ete_create_permission(
  p_student text,
  p_class_name text,
  p_interval text,
  p_reason text
)
returns public.ete_permissions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.ete_profiles;
  v_permission public.ete_permissions;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor') then raise exception 'forbidden'; end if;
  if p_interval not in ('morning','lunch','afternoon') then raise exception 'invalid_interval'; end if;

  insert into public.ete_permissions(student,class_name,interval,reason,created_by)
  values(trim(p_student),trim(p_class_name),p_interval,trim(p_reason),auth.uid())
  returning * into v_permission;

  perform public.ete_log_event(
    'Permissão de entrada criada para ' || v_permission.student,
    case p_interval when 'morning' then 'Intervalo da manhã · 09:10–09:30'
                    when 'lunch' then 'Horário de almoço · 12:00–13:00'
                    else 'Intervalo da tarde · 14:40–15:00' end,
    'system'
  );

  return v_permission;
end;
$$;

create or replace function public.ete_confirm_exit(
  p_permission_id text,
  p_verifier_role text,
  p_verifier_name text
)
returns public.ete_permissions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.ete_profiles;
  v_permission public.ete_permissions;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor','monitor') then raise exception 'forbidden'; end if;
  if p_verifier_role not in ('Monitor','Professor') then raise exception 'invalid_verifier_role'; end if;
  if length(trim(p_verifier_name)) < 2 then raise exception 'invalid_verifier_name'; end if;

  select * into v_permission from public.ete_permissions where id=p_permission_id for update;
  if not found then raise exception 'permission_not_found'; end if;
  if not v_permission.active then raise exception 'permission_inactive'; end if;
  if v_permission.exit_confirmed then raise exception 'already_confirmed'; end if;

  update public.ete_permissions
  set exit_confirmed=true,exit_confirmed_at=now(),exit_verifier_role=p_verifier_role,
      exit_verifier_name=trim(p_verifier_name),exit_recorded_by=auth.uid(),
      exit_recorded_by_label=v_profile.display_name,updated_at=now()
  where id=p_permission_id
  returning * into v_permission;

  perform public.ete_log_event(
    'Saída da sala confirmada para ' || v_permission.student,
    p_verifier_role || ' · ' || trim(p_verifier_name) || ' · registrado por ' || v_profile.display_name,
    'system'
  );

  return v_permission;
end;
$$;

create or replace function public.ete_cancel_permission(p_permission_id text)
returns public.ete_permissions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.ete_profiles;
  v_permission public.ete_permissions;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor') then raise exception 'forbidden'; end if;

  update public.ete_permissions
  set active=false,restore_until=now()+interval '5 minutes',updated_at=now()
  where id=p_permission_id and active=true
  returning * into v_permission;

  if not found then raise exception 'permission_not_found_or_inactive'; end if;

  perform public.ete_log_event(
    'Permissão cancelada para ' || v_permission.student,
    'Restauração disponível por 5 minutos',
    'system'
  );
  return v_permission;
end;
$$;

create or replace function public.ete_restore_permission(p_permission_id text)
returns public.ete_permissions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.ete_profiles;
  v_permission public.ete_permissions;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor') then raise exception 'forbidden'; end if;

  update public.ete_permissions
  set active=true,restore_until=null,updated_at=now()
  where id=p_permission_id and active=false and restore_until > now()
  returning * into v_permission;

  if not found then raise exception 'restore_window_expired'; end if;

  perform public.ete_log_event(
    'Permissão restaurada para ' || v_permission.student,
    'Permissão novamente ativa',
    'system'
  );
  return v_permission;
end;
$$;

create or replace function public.ete_clear_history()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
  v_count integer;
begin
  select role into v_role from public.ete_profiles where user_id=auth.uid();
  if v_role not in ('adm','diretor') then raise exception 'forbidden'; end if;

  select count(*) into v_count from public.ete_history;
  delete from public.ete_history;
  return v_count;
end;
$$;

-- Migração dos dados V43 existentes, sem duplicar.
do $$
declare
  base jsonb;
  item jsonb;
  v_student_id text;
  v_req_id text;
  v_requested_by uuid;
begin
  select data->'v43' into base from public.app_state where id='main';
  if base is null then return; end if;

  for item in select * from jsonb_array_elements(coalesce(base->'students','[]'::jsonb))
  loop
    insert into public.ete_students(id,name,class_name,course,use_count,last_used)
    values(
      coalesce(nullif(item->>'id',''),gen_random_uuid()::text),
      coalesce(nullif(trim(item->>'name'),''),'Aluno'),
      case when item->>'className' in ('1°A','1°B','2°A','2°B') then item->>'className' else '1°A' end,
      case when upper(item->>'course') in ('DS','EDF') then upper(item->>'course') else 'DS' end,
      greatest(coalesce((item->>'useCount')::int,0),0),
      null
    )
    on conflict do nothing;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(base->'requests','[]'::jsonb))
  loop
    select user_id into v_requested_by from public.ete_profiles where username=lower(coalesce(item->>'requestedBy',''));
    if v_requested_by is null then
      select user_id into v_requested_by from public.ete_profiles where role='adm' order by created_at limit 1;
    end if;
    v_req_id := coalesce(nullif(item->>'id',''),gen_random_uuid()::text);

    select id into v_student_id from public.ete_students
      where lower(trim(name))=lower(trim(coalesce(item->>'student',item->>'studentName','Aluno')))
      and class_name=case when item->>'studentClass' in ('1°A','1°B','2°A','2°B') then item->>'studentClass' else '1°A' end
      and course=case when upper(item->>'studentCourse') in ('DS','EDF') then upper(item->>'studentCourse') else 'DS' end
      limit 1;

    insert into public.ete_requests(
      id,student_name,student_class,student_course,student_id,reason,period,start_time,end_time,date_key,status,code,
      requested_by,requested_by_username,requested_by_label,created_at,updated_at
    ) values(
      v_req_id,
      coalesce(item->>'student',item->>'studentName','Aluno'),
      case when item->>'studentClass' in ('1°A','1°B','2°A','2°B') then item->>'studentClass' else '1°A' end,
      case when upper(item->>'studentCourse') in ('DS','EDF') then upper(item->>'studentCourse') else 'DS' end,
      v_student_id,
      coalesce(nullif(item->>'reason',''),'Migrado'),
      coalesce(nullif(item->>'period',''),'Horário definido'),
      coalesce(nullif(item->>'startTime','')::time,time '07:30'),
      coalesce(nullif(item->>'endTime','')::time,time '08:20'),
      coalesce(nullif(item->>'dateKey','')::date,(now() at time zone 'America/Recife')::date),
      case when item->>'status' in ('wait','use','done') then item->>'status' when item->>'status'='late' then 'use' else 'wait' end,
      nullif(item->>'code',''),
      v_requested_by,
      coalesce(nullif(item->>'requestedBy',''),'klenio'),
      coalesce(nullif(item->>'requestedByLabel',''),'Migrado'),
      coalesce(nullif(item->>'createdAt','')::timestamptz,now()),
      coalesce(nullif(item->>'updatedAt','')::timestamptz,now())
    )
    on conflict do nothing;

    if nullif(item->>'passwordHash','') is not null then
      insert into public.ete_request_secrets(request_id,legacy_hash)
      values(v_req_id,item->>'passwordHash')
      on conflict (request_id) do nothing;
    end if;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(base->'permissions','[]'::jsonb))
  loop
    insert into public.ete_permissions(
      id,student,class_name,interval,reason,active,exit_confirmed,exit_verifier_role,exit_verifier_name,
      created_by,created_at,updated_at
    )
    values(
      coalesce(nullif(item->>'id',''),gen_random_uuid()::text),
      coalesce(nullif(item->>'student',''),'Aluno'),
      coalesce(nullif(item->>'className',''),'—'),
      case when item->>'interval' in ('morning','lunch','afternoon') then item->>'interval' else 'morning' end,
      coalesce(nullif(item->>'reason',''),'Migrado'),
      coalesce((item->>'active')::boolean,true),
      coalesce((item->>'exitConfirmed')::boolean,false),
      nullif(item->>'exitVerifierRole',''),
      nullif(item->>'exitVerifierName',''),
      coalesce((select user_id from public.ete_profiles where role='adm' order by created_at limit 1),
               (select id from auth.users order by created_at limit 1)),
      coalesce(nullif(item->>'createdAt','')::timestamptz,now()),
      coalesce(nullif(item->>'updatedAt','')::timestamptz,now())
    )
    on conflict do nothing;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(base->'history','[]'::jsonb))
  loop
    insert into public.ete_history(id,at_iso,text,detail,type,responsible)
    values(
      coalesce(nullif(item->>'id',''),gen_random_uuid()::text),
      coalesce(nullif(item->>'atISO','')::timestamptz,now()),
      coalesce(nullif(item->>'text',''),'Evento migrado'),
      coalesce(item->>'detail',''),
      case when item->>'type' in ('request','pickup','return','system','warning') then item->>'type' else 'system' end,
      coalesce(nullif(item->>'responsible',''),'Sistema')
    )
    on conflict do nothing;
  end loop;
end $$;

-- RLS e privilégios: leitura autenticada; gravações somente por RPC.
alter table public.ete_profiles enable row level security;
alter table public.ete_students enable row level security;
alter table public.ete_requests enable row level security;
alter table public.ete_request_secrets enable row level security;
alter table public.ete_permissions enable row level security;
alter table public.ete_history enable row level security;

revoke all on public.ete_profiles, public.ete_students, public.ete_requests,
  public.ete_request_secrets, public.ete_permissions, public.ete_history from anon, authenticated;

grant select on public.ete_profiles, public.ete_students, public.ete_requests,
  public.ete_permissions, public.ete_history to authenticated;

drop policy if exists ete_profile_self_select on public.ete_profiles;
create policy ete_profile_self_select on public.ete_profiles for select to authenticated
using (user_id=auth.uid());

drop policy if exists ete_students_select on public.ete_students;
create policy ete_students_select on public.ete_students for select to authenticated using (true);

drop policy if exists ete_requests_select on public.ete_requests;
create policy ete_requests_select on public.ete_requests for select to authenticated using (true);

drop policy if exists ete_permissions_select on public.ete_permissions;
create policy ete_permissions_select on public.ete_permissions for select to authenticated using (true);

drop policy if exists ete_history_select on public.ete_history;
create policy ete_history_select on public.ete_history for select to authenticated using (true);

revoke all on function public.ete_current_role() from public, anon;
revoke all on function public.ete_current_username() from public, anon;
revoke all on function public.ete_current_display_name() from public, anon;
revoke all on function public.ete_log_event(text,text,text) from public, anon;
revoke all on function public.ete_upsert_student(text,text,text) from public, anon;
revoke all on function public.ete_create_request(text,text,text,text,time,time,date,text) from public, anon;
revoke all on function public.ete_pickup_request(text,text,text) from public, anon;
revoke all on function public.ete_return_request(text) from public, anon;
revoke all on function public.ete_delete_request(text) from public, anon;
revoke all on function public.ete_create_permission(text,text,text,text) from public, anon;
revoke all on function public.ete_confirm_exit(text,text,text) from public, anon;
revoke all on function public.ete_cancel_permission(text) from public, anon;
revoke all on function public.ete_restore_permission(text) from public, anon;
revoke all on function public.ete_clear_history() from public, anon;

grant execute on function public.ete_current_role() to authenticated;
grant execute on function public.ete_current_username() to authenticated;
grant execute on function public.ete_current_display_name() to authenticated;
grant execute on function public.ete_log_event(text,text,text) to authenticated;
grant execute on function public.ete_upsert_student(text,text,text) to authenticated;
grant execute on function public.ete_create_request(text,text,text,text,time,time,date,text) to authenticated;
grant execute on function public.ete_pickup_request(text,text,text) to authenticated;
grant execute on function public.ete_return_request(text) to authenticated;
grant execute on function public.ete_delete_request(text) to authenticated;
grant execute on function public.ete_create_permission(text,text,text,text) to authenticated;
grant execute on function public.ete_confirm_exit(text,text,text) to authenticated;
grant execute on function public.ete_cancel_permission(text) to authenticated;
grant execute on function public.ete_restore_permission(text) to authenticated;
grant execute on function public.ete_clear_history() to authenticated;

-- Realtime das tabelas normalizadas.
do $$
declare t text;
begin
  foreach t in array array['ete_students','ete_requests','ete_permissions','ete_history']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

-- Hardening adicional V46: helpers internos não são RPCs públicas.
revoke all on function public.ete_log_event(text,text,text) from public, anon, authenticated;
revoke all on function public.ete_fnv1a_hex(text) from public, anon, authenticated;
