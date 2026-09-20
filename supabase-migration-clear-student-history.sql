-- Control Ds — limpeza do histórico de um aluno específico
-- Usa student_id relacional para não atingir alunos homônimos.
-- Mantém cadastro, pedidos, permissões e atestados intactos.

create or replace function public.ete_clear_student_history(p_student_id text)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_count integer := 0;
begin
  if not public.ete_has_capability('can_clear_history') then
    raise exception 'forbidden';
  end if;

  if p_student_id is null
     or not exists (
       select 1
       from public.ete_students
       where id = p_student_id
     ) then
    raise exception 'student_not_found';
  end if;

  delete from public.ete_history
  where student_id = p_student_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke execute on function public.ete_clear_student_history(text) from public;
revoke execute on function public.ete_clear_student_history(text) from anon;
grant execute on function public.ete_clear_student_history(text) to authenticated;
