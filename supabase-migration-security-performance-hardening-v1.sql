-- Security and performance hardening verified against the live Supabase project.
-- Applied live as migration: security_performance_hardening_v1

-- Cover foreign keys used by deletes/updates/joins.
create index if not exists app_state_updated_by_idx
  on public.app_state(updated_by);

create index if not exists ete_atestados_created_by_idx
  on public.ete_atestados_justified_absences(created_by);

create index if not exists ete_history_created_by_idx
  on public.ete_history(created_by);

create index if not exists ete_permissions_created_by_idx
  on public.ete_permissions(created_by);

create index if not exists ete_permissions_exit_recorded_by_idx
  on public.ete_permissions(exit_recorded_by);

create index if not exists ete_requests_picked_by_idx
  on public.ete_requests(picked_by);

create index if not exists ete_requests_requested_by_idx
  on public.ete_requests(requested_by);

create index if not exists ete_requests_returned_by_idx
  on public.ete_requests(returned_by);

create index if not exists ete_students_created_by_idx
  on public.ete_students(created_by);

-- Cache auth.uid() once per statement in the RLS predicates.
alter policy ete_profile_self_select
on public.ete_profiles
using (user_id = (select auth.uid()));

alter policy atestados_authenticated_read
on public.ete_atestados_justified_absences
using (
  exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text,'professor'::text,'monitor'::text])
  )
);

alter policy atestados_management_insert
on public.ete_atestados_justified_absences
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text])
  )
);

alter policy atestados_management_update
on public.ete_atestados_justified_absences
using (
  exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text])
  )
)
with check (
  exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text])
  )
);

alter policy atestados_management_delete
on public.ete_atestados_justified_absences
using (
  exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text])
  )
);

-- These helpers only read the caller's own profile; definer privileges are unnecessary.
alter function public.ete_current_role() security invoker;
alter function public.ete_current_username() security invoker;
alter function public.ete_current_display_name() security invoker;
