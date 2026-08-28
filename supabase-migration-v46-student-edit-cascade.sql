-- Control Ds V46 — edição de aluno e exclusão total em cascata
-- Migração já aplicada em produção em 2026-08-28.
-- NÃO execute novamente sem antes verificar o estado atual do banco.

alter table public.ete_requests
  drop constraint if exists ete_requests_student_id_fkey;

alter table public.ete_requests
  add constraint ete_requests_student_id_fkey
  foreign key (student_id) references public.ete_students(id) on delete cascade;

create or replace function public.ete_update_student(
  p_student_id text,
  p_name text,
  p_class_name text,
  p_course text
)
returns public.ete_students
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_profile public.ete_profiles;
  v_old public.ete_students;
  v_student public.ete_students;
  v_name text := trim(p_name);
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor') then raise exception 'forbidden'; end if;

  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid_student_name'; end if;
  if p_class_name not in ('1°A','1°B','2°A','2°B') or p_course not in ('DS','EDF') then
    raise exception 'invalid_group';
  end if;

  select * into v_old from public.ete_students where id=p_student_id for update;
  if not found then raise exception 'student_not_found'; end if;

  if exists (
    select 1 from public.ete_students s
    where s.id <> p_student_id
      and lower(trim(s.name))=lower(v_name)
      and s.class_name=p_class_name
      and s.course=p_course
  ) then raise exception 'student_already_exists'; end if;

  update public.ete_requests
  set student_id=p_student_id,
      student_name=v_name,
      student_class=p_class_name,
      student_course=p_course,
      updated_at=now()
  where student_id=p_student_id
     or (
       student_id is null
       and lower(trim(student_name))=lower(trim(v_old.name))
       and student_class=v_old.class_name
       and student_course=v_old.course
     );

  update public.ete_permissions
  set student=v_name,
      class_name=p_class_name || ' ' || p_course,
      updated_at=now()
  where lower(trim(student))=lower(trim(v_old.name));

  update public.ete_history
  set text=replace(text,v_old.name,v_name),
      detail=replace(
        replace(detail,v_old.class_name || ' ' || v_old.course,p_class_name || ' ' || p_course),
        v_old.class_name || ' · ' || v_old.course,
        p_class_name || ' · ' || p_course
      )
  where position(lower(trim(v_old.name)) in lower(text)) > 0;

  update public.ete_students
  set name=v_name,class_name=p_class_name,course=p_course,updated_at=now()
  where id=p_student_id
  returning * into v_student;

  perform public.ete_log_event(
    'Aluno atualizado: ' || v_student.name,
    v_old.name || ' · ' || v_old.class_name || ' ' || v_old.course ||
      ' → ' || v_student.name || ' · ' || v_student.class_name || ' ' || v_student.course,
    'system'
  );

  return v_student;
end;
$function$;

revoke execute on function public.ete_update_student(text,text,text,text) from public;
revoke execute on function public.ete_update_student(text,text,text,text) from anon;
grant execute on function public.ete_update_student(text,text,text,text) to authenticated;

create or replace function public.ete_delete_student(p_student_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_profile public.ete_profiles;
  v_student public.ete_students;
begin
  select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if v_profile.role not in ('adm','diretor') then raise exception 'forbidden'; end if;

  select * into v_student from public.ete_students where id=p_student_id for update;
  if not found then raise exception 'student_not_found'; end if;

  delete from public.ete_history
  where position(lower(trim(v_student.name)) in lower(text)) > 0;

  delete from public.ete_permissions
  where lower(trim(student))=lower(trim(v_student.name));

  delete from public.ete_requests
  where student_id is null
    and lower(trim(student_name))=lower(trim(v_student.name))
    and student_class=v_student.class_name
    and student_course=v_student.course;

  delete from public.ete_students where id=p_student_id;
end;
$function$;

revoke execute on function public.ete_delete_student(text) from public;
revoke execute on function public.ete_delete_student(text) from anon;
grant execute on function public.ete_delete_student(text) to authenticated;

-- Limpeza dos restos de exclusões anteriores ao comportamento em cascata.
do $cleanup$
declare
  r record;
begin
  for r in
    select distinct student_name,student_class,student_course
    from public.ete_requests
    where student_id is null
  loop
    delete from public.ete_history
    where position(lower(trim(r.student_name)) in lower(text)) > 0;

    delete from public.ete_permissions
    where lower(trim(student))=lower(trim(r.student_name));
  end loop;

  delete from public.ete_requests where student_id is null;
end;
$cleanup$;
