-- Atestados: imagem comprobatória privada
-- Aplicado em produção como migration: atestados_image_attachments

alter table public.ete_atestados_justified_absences
  add column if not exists image_path text;

comment on column public.ete_atestados_justified_absences.image_path is
  'Private Supabase Storage object path for the supporting atestado image.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ete_atestados_image_path_check'
      and conrelid = 'public.ete_atestados_justified_absences'::regclass
  ) then
    alter table public.ete_atestados_justified_absences
      add constraint ete_atestados_image_path_check
      check (
        image_path is null
        or (
          char_length(image_path) between 1 and 512
          and image_path !~ '(^/|\.\.)'
        )
      );
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'atestados-images',
  'atestados-images',
  false,
  6291456,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do nothing;

create policy atestados_images_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'atestados-images'
  and exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text,'professor'::text,'monitor'::text])
  )
);

create policy atestados_images_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'atestados-images'
  and name like ((select auth.uid())::text || '/%')
  and exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text])
  )
);

create policy atestados_images_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'atestados-images'
  and exists (
    select 1
    from public.ete_profiles p
    where p.user_id = (select auth.uid())
      and p.role = any (array['adm'::text,'diretor'::text,'vice_diretor'::text])
  )
);
