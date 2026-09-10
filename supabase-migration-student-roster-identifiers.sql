-- Non-destructive support for official student roster imports.
-- Student rows remain linked to ete_classes; legacy rows may keep null identifiers.

alter table public.ete_students
  add column if not exists registration_number text,
  add column if not exists sex text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ete_students'::regclass
      and conname = 'ete_students_registration_number_check'
  ) then
    alter table public.ete_students
      add constraint ete_students_registration_number_check
      check (registration_number is null or length(trim(registration_number)) between 1 and 30);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ete_students'::regclass
      and conname = 'ete_students_sex_check'
  ) then
    alter table public.ete_students
      add constraint ete_students_sex_check
      check (sex is null or sex in ('F','M'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ete_students'::regclass
      and conname = 'ete_students_registration_number_key'
  ) then
    alter table public.ete_students
      add constraint ete_students_registration_number_key unique (registration_number);
  end if;
end $$;

comment on column public.ete_students.registration_number is
  'Número de matrícula escolar importado da listagem oficial.';
comment on column public.ete_students.sex is
  'Sexo informado na listagem escolar: F ou M.';
