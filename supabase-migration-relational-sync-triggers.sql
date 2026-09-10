-- Control Ds / Portal ETE — sincronização relacional para RPCs legadas
-- Aplicada em produção em 2026-09-10.
-- Mantém os novos relacionamentos preenchidos automaticamente sem reescrever as RPCs atuais.

create or replace function public.ete_resolve_class_id(p_class text,p_course text)
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id from public.ete_classes
  where code=case
    when p_course='DS' and p_class='1°A' then 'DS-1-A'
    when p_course='DS' and p_class='1°B' then 'DS-1-B'
    when p_course='DS' and p_class='2°A' then 'DS-2-A'
    when p_course='DS' and p_class='2°B' then 'DS-2-B'
    when p_course='EDF' and p_class='1°A' then 'EDF-1-A'
    when p_course='EDF' and p_class='1°B' then 'EDF-1-B'
    when p_course='EDF' and p_class='2°A' then 'EDF-2-A'
    when p_course='EDF' and p_class='2°B' then 'EDF-2-B'
    when p_course='EDF' and p_class='3°A' then 'EDF-3-A'
    when p_course='EDF' and p_class='3°B' then 'EDF-3-B'
    when p_course='GTU' and p_class='3°' then 'GTU-3'
    else null end
  limit 1
$$;

create or replace function public.ete_sync_student_relations()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  new.class_id:=public.ete_resolve_class_id(new.class_name,new.course);
  return new;
end
$$;

drop trigger if exists ete_students_sync_relations_trg on public.ete_students;
create trigger ete_students_sync_relations_trg
before insert or update of class_name,course on public.ete_students
for each row execute function public.ete_sync_student_relations();

create or replace function public.ete_sync_request_relations()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_class uuid;
  v_notebook uuid;
begin
  if new.student_id is not null then
    select class_id into v_class from public.ete_students where id=new.student_id;
  end if;

  new.class_id:=coalesce(v_class,public.ete_resolve_class_id(new.student_class,new.student_course));

  if new.code is not null then
    insert into public.ete_notebooks(code)
    values(new.code)
    on conflict(code) do update set active=true,updated_at=now()
    returning id into v_notebook;
    new.notebook_id:=v_notebook;
  else
    new.notebook_id:=null;
  end if;

  return new;
end
$$;

drop trigger if exists ete_requests_sync_relations_trg on public.ete_requests;
create trigger ete_requests_sync_relations_trg
before insert or update of student_id,student_class,student_course,code on public.ete_requests
for each row execute function public.ete_sync_request_relations();

create or replace function public.ete_sync_permission_relations()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_student public.ete_students%rowtype;
begin
  if new.student_id is not null then
    select * into v_student from public.ete_students where id=new.student_id;
  else
    select * into v_student
    from public.ete_students s
    where lower(trim(s.name))=lower(trim(new.student))
      and trim(s.class_name||' '||s.course)=trim(new.class_name)
    limit 1;
    if found then new.student_id:=v_student.id; end if;
  end if;

  if v_student.id is not null then
    new.class_id:=v_student.class_id;
  end if;

  return new;
end
$$;

drop trigger if exists ete_permissions_sync_relations_trg on public.ete_permissions;
create trigger ete_permissions_sync_relations_trg
before insert or update of student_id,student,class_name on public.ete_permissions
for each row execute function public.ete_sync_permission_relations();

create or replace function public.ete_sync_atestado_relations()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_code text;
  v_student public.ete_students%rowtype;
begin
  v_code:=case trim(new.class_name)
    when '1º DS A' then 'DS-1-A'
    when '1º DS B' then 'DS-1-B'
    when '2º DS A' then 'DS-2-A'
    when '2º DS B' then 'DS-2-B'
    when '1º EDF A' then 'EDF-1-A'
    when '1º EDF B' then 'EDF-1-B'
    when '2º EDF A' then 'EDF-2-A'
    when '2º EDF B' then 'EDF-2-B'
    when '3º EDF A' then 'EDF-3-A'
    when '3º EDF B' then 'EDF-3-B'
    when '3º GTU' then 'GTU-3'
    when '3A EDF' then 'EDF-3-A'
    when '3B EDF' then 'EDF-3-B'
    when '3GTU' then 'GTU-3'
    else null end;

  if v_code is not null then
    select id into new.class_id from public.ete_classes where code=v_code;
  end if;

  if new.class_id is not null then
    select * into v_student
    from public.ete_students s
    where s.class_id=new.class_id
      and lower(trim(s.name))=lower(trim(new.student_name))
    limit 1;
    if found then new.student_id:=v_student.id; end if;
  end if;

  return new;
end
$$;

drop trigger if exists ete_atestados_sync_relations_trg on public.ete_atestados_justified_absences;
create trigger ete_atestados_sync_relations_trg
before insert or update of student_name,class_name on public.ete_atestados_justified_absences
for each row execute function public.ete_sync_atestado_relations();

revoke execute on function public.ete_resolve_class_id(text,text) from public,anon,authenticated;
revoke execute on function public.ete_sync_student_relations() from public,anon,authenticated;
revoke execute on function public.ete_sync_request_relations() from public,anon,authenticated;
revoke execute on function public.ete_sync_permission_relations() from public,anon,authenticated;
revoke execute on function public.ete_sync_atestado_relations() from public,anon,authenticated;
