-- Control Ds V46 — endurecimento de segurança das RPCs
-- Aplicado em produção em 2026-08-28.
-- Corrige bypass de autorização quando uma conta autenticada não possui perfil/role.

do $harden$
declare
  r record;
  ddl text;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef=true
      and p.proname in (
        'ete_cancel_permission','ete_clear_history','ete_confirm_exit',
        'ete_create_permission','ete_create_request','ete_delete_student',
        'ete_pickup_request_v2','ete_restore_permission','ete_return_request',
        'ete_update_student','ete_upsert_student'
      )
  loop
    ddl := pg_get_functiondef(r.oid);
    ddl := replace(ddl,
      'if v_profile.role not in (',
      'if coalesce(v_profile.role,'''') not in ('
    );
    ddl := replace(ddl,
      'if v_role not in (',
      'if coalesce(v_role,'''') not in ('
    );
    execute ddl;
  end loop;

  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='ete_delete_request'
    and pg_get_function_identity_arguments(p.oid)='p_request_id text';

  ddl := replace(
    ddl,
    'select * into v_profile from public.ete_profiles where user_id=auth.uid();',
    'select * into v_profile from public.ete_profiles where user_id=auth.uid();
  if coalesce(v_profile.role,'''') not in (''adm'',''diretor'',''monitor'') then raise exception ''forbidden''; end if;'
  );
  ddl := replace(ddl,
    'if v_profile.role<>''adm'' and v_request.requested_by<>auth.uid() then',
    'if coalesce(v_profile.role,'''')<>''adm'' and v_request.requested_by<>auth.uid() then'
  );
  execute ddl;
end;
$harden$;

-- Helpers internos/legados não devem ser chamáveis pelo navegador.
revoke execute on function public.ete_log_event(text,text,text) from public, anon, authenticated;
revoke execute on function public.ete_log_student_event(text,text,text,text) from public, anon, authenticated;
revoke execute on function public.ete_pickup_request(text,text,text) from public, anon, authenticated;

-- A versão V2 é a única retirada exposta ao cliente.
revoke execute on function public.ete_pickup_request_v2(text,text,text) from public, anon;
grant execute on function public.ete_pickup_request_v2(text,text,text) to authenticated;
