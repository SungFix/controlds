-- Internal trigger function is not part of the public RPC surface.
-- Applied live as migration: harden_internal_trigger_acl

revoke execute on function public.ete_atestados_set_updated_at()
from public, anon, authenticated;
