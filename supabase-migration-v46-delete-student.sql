-- Control Ds V46 — remoção de aluno da lista
-- Aplicada em produção em 2026-08-28.
-- Mantém pedidos e histórico antigos; ete_requests.student_id usa ON DELETE SET NULL.

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
  select * into v_profile
  from public.ete_profiles
  where user_id = auth.uid();

  if v_profile.role not in ('adm','diretor') then
    raise exception 'forbidden';
  end if;

  select * into v_student
  from public.ete_students
  where id = p_student_id
  for update;

  if not found then
    raise exception 'student_not_found';
  end if;

  perform public.ete_log_event(
    'Aluno removido: ' || v_student.name,
    v_student.class_name || ' · ' || v_student.course,
    'system'
  );

  delete from public.ete_students
  where id = p_student_id;
end;
$function$;

revoke execute on function public.ete_delete_student(text) from public;
revoke execute on function public.ete_delete_student(text) from anon;
grant execute on function public.ete_delete_student(text) to authenticated;
