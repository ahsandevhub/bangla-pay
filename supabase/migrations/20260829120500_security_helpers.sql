-- Active-session and active-device assertion helpers. These are the single
-- place that implements the "single active device" rule so RLS policies and
-- every money RPC stay in agreement; duplicating this logic per-callsite is
-- how that rule quietly drifts.
--
-- SECURITY DEFINER functions run as their owner (the migration role, which
-- owns every table here and therefore bypasses RLS), which is what lets
-- current_session_is_active() read security_profiles from inside a policy on
-- a *different* table without recursing into security_profiles' own RLS.

-- A raw ::uuid cast on a JWT claim throws a hard error (invalid_text_representation)
-- if the claim is absent or malformed, which would crash an RLS policy
-- evaluation instead of the policy simply denying access. This makes that
-- cast fail closed -- an unparseable claim reads as "no session", not an error.
create function public._safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- Boolean form for use inside RLS policy USING/WITH CHECK expressions.
create function public.current_session_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.security_profiles sp
    where sp.user_id = auth.uid()
      and sp.active_session_id is not null
      and sp.active_session_id = public._safe_uuid(auth.jwt() ->> 'session_id')
  );
$$;

-- Raising form for use at the top of every sensitive RPC. Returns the caller's
-- user_id so functions can chain it directly: `v_user_id := public.assert_active_session();`
create function public.assert_active_session()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim_session_id uuid;
  v_active_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  v_claim_session_id := public._safe_uuid(auth.jwt() ->> 'session_id');

  select sp.active_session_id into v_active_session_id
  from public.security_profiles sp
  where sp.user_id = v_user_id;

  if v_active_session_id is null
     or v_claim_session_id is null
     or v_active_session_id <> v_claim_session_id then
    raise exception 'INACTIVE_SESSION' using errcode = 'P0001';
  end if;

  return v_user_id;
end;
$$;

-- Validates the server-supplied device token against the caller's active
-- device. Money RPCs call this in addition to assert_active_session(), since
-- a stolen-but-still-valid session token must not be enough to move money
-- once the trusted device has been replaced.
create function public.assert_active_device(p_user_id uuid, p_device_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active_device_id uuid;
  v_stored_hash text;
  v_supplied_hash text;
begin
  select sp.active_device_id into v_active_device_id
  from public.security_profiles sp
  where sp.user_id = p_user_id;

  if v_active_device_id is null then
    raise exception 'DEVICE_REPLACED' using errcode = 'P0001';
  end if;

  select td.token_hash into v_stored_hash
  from public.trusted_devices td
  where td.id = v_active_device_id
    and td.revoked_at is null;

  v_supplied_hash := encode(extensions.digest(p_device_token, 'sha256'), 'hex');

  if v_stored_hash is null or v_stored_hash <> v_supplied_hash then
    raise exception 'DEVICE_REPLACED' using errcode = 'P0001';
  end if;
end;
$$;
