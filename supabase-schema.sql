-- =========================================================
-- ETE - Controle de Notebooks
-- Supabase: banco compartilhado + Realtime
-- Execute no SQL Editor do projeto.
-- =========================================================

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

alter table public.app_state enable row level security;
alter table public.app_state replica identity full;

-- O visitante sem login NÃO pode ler nem alterar o banco.
revoke all on table public.app_state from anon;

-- Usuários autenticados pelo Supabase podem usar a tabela.
grant usage on schema public to authenticated;
grant select, insert, update on table public.app_state to authenticated;

drop policy if exists "ete_authenticated_select" on public.app_state;
create policy "ete_authenticated_select"
on public.app_state
for select
to authenticated
using (true);

drop policy if exists "ete_authenticated_insert" on public.app_state;
create policy "ete_authenticated_insert"
on public.app_state
for insert
to authenticated
with check (true);

drop policy if exists "ete_authenticated_update" on public.app_state;
create policy "ete_authenticated_update"
on public.app_state
for update
to authenticated
using (true)
with check (true);

-- Atualiza automaticamente auditoria da linha.
create or replace function public.ete_touch_app_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists ete_touch_app_state_trigger on public.app_state;
create trigger ete_touch_app_state_trigger
before insert or update on public.app_state
for each row
execute function public.ete_touch_app_state();

-- Habilita Realtime para a tabela, apenas se ainda não estiver na publicação.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
