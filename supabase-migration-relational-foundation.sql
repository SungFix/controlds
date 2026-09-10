-- Control Ds / Portal ETE — fundação relacional não destrutiva
-- IMPORTANTE: preparada em 2026-09-10. Aplicar somente após conferir migrations do Supabase.
-- Esta migration NÃO remove colunas, tabelas, dados, RPCs, RLS ou autenticação existentes.
-- Objetivo: adicionar IDs/FKs claros mantendo compatibilidade com o frontend atual.

create extension if not exists pgcrypto with schema extensions;

-- 1) Catálogo único de turmas. Evita cada módulo inventar sua própria representação.
create table if not exists public.ete_classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  course text not null check (course in ('DS','EDF','GTU')),
  year smallint not null check (year between 1 and 3),
  section text null check (section is null or section in ('A','B')),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ete_classes_identity_uq
on public.ete_classes(course, year, coalesce(section,''));

insert into public.ete_classes(code,course,year,section,display_name)
values
  ('DS-1-A','DS',1,'A','1°A DS'),
  ('DS-1-B','DS',1,'B','1°B DS'),
  ('DS-2-A','DS',2,'A','2°A DS'),
  ('DS-2-B','DS',2,'B','2°B DS'),
  ('EDF-1-A','EDF',1,'A','1°A EDF'),
  ('EDF-1-B','EDF',1,'B','1°B EDF'),
  ('EDF-2-A','EDF',2,'A','2°A EDF'),
  ('EDF-2-B','EDF',2,'B','2°B EDF'),
  ('EDF-3-A','EDF',3,'A','3°A EDF'),
  ('EDF-3-B','EDF',3,'B','3°B EDF'),
  ('GTU-3','GTU',3,null,'3°GTU')
on conflict (code) do update
set course=excluded.course,
    year=excluded.year,
    section=excluded.section,
    display_name=excluded.display_name,
    active=true,
    updated_at=now();

-- 2) Alunos passam a apontar para uma turma real.
alter table public.ete_students add column if not exists class_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ete_students_class_id_fkey') then
    alter table public.ete_students
      add constraint ete_students_class_id_fkey
      foreign key (class_id) references public.ete_classes(id) on delete set null;
  end if;
end $$;
create index if not exists ete_students_class_id_idx on public.ete_students(class_id);

update public.ete_students s
set class_id=c.id
from public.ete_classes c
where s.class_id is null
  and c.code = case
    when s.course='DS'  and s.class_name='1°A' then 'DS-1-A'
    when s.course='DS'  and s.class_name='1°B' then 'DS-1-B'
    when s.course='DS'  and s.class_name='2°A' then 'DS-2-A'
    when s.course='DS'  and s.class_name='2°B' then 'DS-2-B'
    when s.course='EDF' and s.class_name='1°A' then 'EDF-1-A'
    when s.course='EDF' and s.class_name='1°B' then 'EDF-1-B'
    when s.course='EDF' and s.class_name='2°A' then 'EDF-2-A'
    when s.course='EDF' and s.class_name='2°B' then 'EDF-2-B'
    when s.course='EDF' and s.class_name='3°A' then 'EDF-3-A'
    when s.course='EDF' and s.class_name='3°B' then 'EDF-3-B'
    when s.course='GTU' and s.class_name='3°'  then 'GTU-3'
    else null
  end;

-- 3) Notebooks tornam-se entidade própria, em vez de existir apenas como código no pedido.
create table if not exists public.ete_notebooks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ete_notebooks(code)
select distinct r.code
from public.ete_requests r
where r.code is not null and r.code ~ '^[0-9]{6}$'
on conflict (code) do nothing;

alter table public.ete_requests add column if not exists class_id uuid;
alter table public.ete_requests add column if not exists notebook_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='ete_requests_class_id_fkey') then
    alter table public.ete_requests
      add constraint ete_requests_class_id_fkey
      foreign key (class_id) references public.ete_classes(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='ete_requests_notebook_id_fkey') then
    alter table public.ete_requests
      add constraint ete_requests_notebook_id_fkey
      foreign key (notebook_id) references public.ete_notebooks(id) on delete set null;
  end if;
end $$;

create index if not exists ete_requests_student_id_idx on public.ete_requests(student_id);
create index if not exists ete_requests_class_id_idx on public.ete_requests(class_id);
create index if not exists ete_requests_notebook_id_idx on public.ete_requests(notebook_id);

-- Prioriza o relacionamento já existente com o aluno.
update public.ete_requests r
set class_id=s.class_id
from public.ete_students s
where r.class_id is null and r.student_id=s.id and s.class_id is not null;

-- Fallback para pedidos legados ainda representados por texto.
update public.ete_requests r
set class_id=c.id
from public.ete_classes c
where r.class_id is null
  and c.code = case
    when r.student_course='DS'  and r.student_class='1°A' then 'DS-1-A'
    when r.student_course='DS'  and r.student_class='1°B' then 'DS-1-B'
    when r.student_course='DS'  and r.student_class='2°A' then 'DS-2-A'
    when r.student_course='DS'  and r.student_class='2°B' then 'DS-2-B'
    when r.student_course='EDF' and r.student_class='1°A' then 'EDF-1-A'
    when r.student_course='EDF' and r.student_class='1°B' then 'EDF-1-B'
    when r.student_course='EDF' and r.student_class='2°A' then 'EDF-2-A'
    when r.student_course='EDF' and r.student_class='2°B' then 'EDF-2-B'
    when r.student_course='EDF' and r.student_class='3°A' then 'EDF-3-A'
    when r.student_course='EDF' and r.student_class='3°B' then 'EDF-3-B'
    when r.student_course='GTU' and r.student_class='3°'  then 'GTU-3'
    else null
  end;

update public.ete_requests r
set notebook_id=n.id
from public.ete_notebooks n
where r.notebook_id is null and r.code=n.code;

-- 4) Permissões passam a referenciar aluno/turma por FK, sem remover os textos legados.
alter table public.ete_permissions add column if not exists student_id text;
alter table public.ete_permissions add column if not exists class_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='ete_permissions_student_id_fkey') then
    alter table public.ete_permissions
      add constraint ete_permissions_student_id_fkey
      foreign key (student_id) references public.ete_students(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='ete_permissions_class_id_fkey') then
    alter table public.ete_permissions
      add constraint ete_permissions_class_id_fkey
      foreign key (class_id) references public.ete_classes(id) on delete set null;
  end if;
end $$;

create index if not exists ete_permissions_student_id_idx on public.ete_permissions(student_id);
create index if not exists ete_permissions_class_id_idx on public.ete_permissions(class_id);

update public.ete_permissions p
set student_id=s.id,
    class_id=s.class_id
from public.ete_students s
where p.student_id is null
  and lower(trim(p.student))=lower(trim(s.name))
  and trim(p.class_name)=trim(s.class_name || ' ' || s.course);

-- 5) Atestados: adiciona vínculos apenas se o módulo existir no banco atual.
do $rel_atestados$
begin
  if to_regclass('public.ete_atestados_justified_absences') is not null then
    execute 'alter table public.ete_atestados_justified_absences add column if not exists student_id text';
    execute 'alter table public.ete_atestados_justified_absences add column if not exists class_id uuid';

    if not exists (select 1 from pg_constraint where conname='ete_atestados_student_id_fkey') then
      execute 'alter table public.ete_atestados_justified_absences add constraint ete_atestados_student_id_fkey foreign key (student_id) references public.ete_students(id) on delete set null';
    end if;
    if not exists (select 1 from pg_constraint where conname='ete_atestados_class_id_fkey') then
      execute 'alter table public.ete_atestados_justified_absences add constraint ete_atestados_class_id_fkey foreign key (class_id) references public.ete_classes(id) on delete set null';
    end if;

    execute 'create index if not exists ete_atestados_student_id_idx on public.ete_atestados_justified_absences(student_id)';
    execute 'create index if not exists ete_atestados_class_id_idx on public.ete_atestados_justified_absences(class_id)';

    -- Turma pode ser preenchida mesmo quando ainda não existe aluno correspondente.
    execute $sql$
      update public.ete_atestados_justified_absences a
      set class_id=c.id
      from public.ete_classes c
      where a.class_id is null
        and c.code = case trim(a.class_name)
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
          else null
        end
    $sql$;

    -- Só relaciona aluno quando nome E turma coincidem, evitando homônimos.
    execute $sql$
      update public.ete_atestados_justified_absences a
      set student_id=s.id
      from public.ete_students s
      where a.student_id is null
        and a.class_id=s.class_id
        and lower(trim(a.student_name))=lower(trim(s.name))
    $sql$;
  end if;
end
$rel_atestados$;

-- 6) Histórico mantém o texto atual, mas ganha referências relacionais opcionais
-- para novos eventos. Não fazemos backfill por texto porque seria inseguro.
alter table public.ete_history add column if not exists student_id text;
alter table public.ete_history add column if not exists request_id text;
alter table public.ete_history add column if not exists permission_id text;
alter table public.ete_history add column if not exists notebook_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='ete_history_student_id_fkey') then
    alter table public.ete_history add constraint ete_history_student_id_fkey
      foreign key (student_id) references public.ete_students(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='ete_history_request_id_fkey') then
    alter table public.ete_history add constraint ete_history_request_id_fkey
      foreign key (request_id) references public.ete_requests(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='ete_history_permission_id_fkey') then
    alter table public.ete_history add constraint ete_history_permission_id_fkey
      foreign key (permission_id) references public.ete_permissions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='ete_history_notebook_id_fkey') then
    alter table public.ete_history add constraint ete_history_notebook_id_fkey
      foreign key (notebook_id) references public.ete_notebooks(id) on delete set null;
  end if;
end $$;

create index if not exists ete_history_student_id_idx on public.ete_history(student_id);
create index if not exists ete_history_request_id_idx on public.ete_history(request_id);
create index if not exists ete_history_permission_id_idx on public.ete_history(permission_id);
create index if not exists ete_history_notebook_id_idx on public.ete_history(notebook_id);

-- 7) Segurança mínima das novas tabelas: RLS ligada.
-- Políticas específicas devem seguir os papéis/RPCs já usados pelo projeto antes de exposição direta ao cliente.
alter table public.ete_classes enable row level security;
alter table public.ete_notebooks enable row level security;

-- Leitura autenticada do catálogo é segura e necessária aos módulos.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ete_classes' and policyname='ete_classes_authenticated_read') then
    create policy ete_classes_authenticated_read on public.ete_classes
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ete_notebooks' and policyname='ete_notebooks_authenticated_read') then
    create policy ete_notebooks_authenticated_read on public.ete_notebooks
      for select to authenticated using (true);
  end if;
end $$;

-- Nenhuma política de INSERT/UPDATE/DELETE é criada para as tabelas novas.
-- Alterações continuam centralizadas nas RPCs atuais até uma segunda etapa controlada.
