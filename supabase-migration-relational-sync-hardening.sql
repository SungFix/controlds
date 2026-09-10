-- Control Ds / Portal ETE — evita relacionamentos normalizados obsoletos
-- Aplicada em produção em 2026-09-10.
-- Mantém compatibilidade com as rotinas legadas que ainda gravam aluno/turma em texto.

create or replace function public.ete_sync_permission_relations()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_student public.ete_students%rowtype;
begin
  -- Se uma rotina legada alterou a identidade textual mas carregou os IDs antigos,
  -- descarte apenas os vínculos derivados e resolva novamente.
  if tg_op='UPDATE'
     and (new.student is distinct from old.student
          or new.class_name is distinct from old.class_name)
     and new.student_id is not distinct from old.student_id then
    new.student_id:=null;
    new.class_id:=null;
  end if;

  if new.student_id is not null then
    select * into v_student
    from public.ete_students
    where id=new.student_id;
  else
    new.class_id:=null;

    select * into v_student
    from public.ete_students s
    where lower(trim(s.name))=lower(trim(new.student))
      and trim(s.class_name||' '||s.course)=trim(new.class_name)
    limit 1;

    if found then
      new.student_id:=v_student.id;
    end if;
  end if;

  if v_student.id is not null then
    new.class_id:=v_student.class_id;
  else
    new.class_id:=null;
  end if;

  return new;
end
$$;

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

  -- Em updates legados, nome/turma podem mudar sem os IDs serem enviados.
  -- Nesse caso, invalide os vínculos antigos antes de tentar um novo casamento seguro.
  if tg_op='UPDATE'
     and (new.student_name is distinct from old.student_name
          or new.class_name is distinct from old.class_name)
     and new.student_id is not distinct from old.student_id
     and new.class_id is not distinct from old.class_id then
    new.student_id:=null;
    new.class_id:=null;
  end if;

  if new.class_id is null and v_code is not null then
    select id into new.class_id
    from public.ete_classes
    where code=v_code;
  end if;

  if new.student_id is null and new.class_id is not null then
    select * into v_student
    from public.ete_students s
    where s.class_id=new.class_id
      and lower(trim(s.name))=lower(trim(new.student_name))
    limit 1;

    if found then
      new.student_id:=v_student.id;
    end if;
  end if;

  return new;
end
$$;

revoke execute on function public.ete_sync_permission_relations() from public,anon,authenticated;
revoke execute on function public.ete_sync_atestado_relations() from public,anon,authenticated;
