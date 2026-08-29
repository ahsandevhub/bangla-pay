-- Gap found while building the Phase 4 registration flow: checking whether
-- a phone is already registered happens before the caller has any session,
-- but profiles' only RLS policy (profiles_select_own) requires id = auth.uid().
-- A plain SELECT would tell an unauthenticated caller nothing either way, so
-- this needs the same RLS-bypass-for-existence-check treatment as
-- create_request. Returns only a boolean -- never the matching row -- so it
-- can't be used to enumerate anything beyond "taken or not".
create function public.is_phone_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where phone = p_phone);
$$;

grant execute on function public.is_phone_registered(text) to anon, authenticated;
