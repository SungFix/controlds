-- Control Ds V46 — correção da limpeza do histórico
-- Evita o erro "DELETE requires a WHERE clause" do pg_safeupdate.

create or replace function public.ete_clear_history()
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_role text;
  v_count integer;
begin
  select role into v_role
  from public.ete_profiles
  where user_id = auth.uid();

  if v_role not in ('adm','diretor') then
    raise exception 'forbidden';
  end if;

  select count(*) into v_count
  from public.ete_history;

  delete from public.ete_history
  where id is not null;

  return v_count;
end;
$function$;

revoke execute on function public.ete_clear_history() from public;
revoke execute on function public.ete_clear_history() from anon;
grant execute on function public.ete_clear_history() to authenticated;
