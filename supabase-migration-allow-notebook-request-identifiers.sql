-- Align request notebook identifiers with the inventory model.
-- Keeps legacy 6-digit request codes compatible while allowing the current
-- canonical 4-digit notebook label and 9-character equipment identifiers.

alter table public.ete_requests
  drop constraint if exists ete_requests_code_check;

alter table public.ete_requests
  add constraint ete_requests_code_check
  check (
    code is null
    or code ~ '^[0-9]{4}$'
    or code ~ '^[0-9]{6}$'
    or code ~ '^[A-Za-z0-9]{9}$'
  );
