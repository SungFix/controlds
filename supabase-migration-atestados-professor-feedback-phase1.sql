-- Feedback do professor — Atestados / fase 1
-- Não remove a coluna legacy justified_rate; ela permanece apenas para compatibilidade histórica.

alter table public.ete_atestados_justified_absences
  add column if not exists absence_scope text not null default 'full_day',
  add column if not exists absence_start_time time without time zone,
  add column if not exists absence_end_time time without time zone,
  add column if not exists reason_codes text[] not null default '{}'::text[],
  add column if not exists reason_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ete_atestados_justified_absences'::regclass
      and conname = 'ete_atestados_absence_scope_check'
  ) then
    alter table public.ete_atestados_justified_absences
      add constraint ete_atestados_absence_scope_check
      check (absence_scope in ('full_day','partial'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ete_atestados_justified_absences'::regclass
      and conname = 'ete_atestados_absence_time_check'
  ) then
    alter table public.ete_atestados_justified_absences
      add constraint ete_atestados_absence_time_check
      check (
        (absence_scope = 'full_day' and absence_start_time is null and absence_end_time is null)
        or
        (absence_scope = 'partial' and absence_start_time is not null and absence_end_time is not null and absence_end_time > absence_start_time)
      );
  end if;
end $$;

comment on column public.ete_atestados_justified_absences.absence_scope is 'full_day para dia inteiro; partial para ausência em horário específico.';
comment on column public.ete_atestados_justified_absences.reason_codes is 'Códigos selecionados na lista de motivos de falta justificada apresentada no módulo.';
comment on column public.ete_atestados_justified_absences.reason_note is 'Detalhe livre usado quando o motivo exige complemento.';
