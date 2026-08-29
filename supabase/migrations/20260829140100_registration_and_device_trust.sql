-- Registration finalization. The auth.users row itself is created via the
-- Supabase Admin API from the route handler (TypeScript) -- Postgres cannot
-- drive GoTrue's own password hashing/session issuance -- so this function
-- only sets up the tables this project owns, for the now-authenticated
-- caller (auth.uid() is populated because the route signs the new user in
-- immediately after admin-creating them, before calling this).
create function public.complete_registration(
  p_phone text,
  p_pin_fingerprint text,
  p_device_token_hash text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_device_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  perform public.assert_recent_otp_verified(p_phone, 'REGISTRATION');

  begin
    insert into public.profiles (id, phone, status) values (v_user_id, p_phone, 'PENDING_KYC');
  exception when unique_violation then
    -- The /api/auth/phone/check step already rejects a known-duplicate
    -- phone; reaching this exception means two registrations of the same
    -- phone raced to this point -- the uniqueness constraint is the final
    -- defense docs/ARCHITECTURE.md calls for.
    raise exception 'PHONE_ALREADY_REGISTERED' using errcode = 'P0001';
  end;

  insert into public.security_profiles (user_id) values (v_user_id);

  insert into public.trusted_devices (user_id, token_hash, user_agent, trusted_at)
  values (v_user_id, p_device_token_hash, p_user_agent, now())
  returning id into v_device_id;

  update public.security_profiles
  set active_device_id = v_device_id,
      active_session_id = (auth.jwt() ->> 'session_id')::uuid,
      updated_at = now()
  where user_id = v_user_id;

  insert into public.pin_history (user_id, pin_fingerprint) values (v_user_id, p_pin_fingerprint);

  insert into public.security_events (user_id, event_type)
  values (v_user_id, 'DEVICE_TRUSTED');
end;
$$;

grant execute on function public.complete_registration(text, text, text, text) to authenticated;

-- Precondition check for the *trusted-device* PIN login path, called before
-- the route handler attempts supabase.auth.signInWithPassword. Returns
-- nothing meaningful -- callers only care whether it raises. Deliberately
-- does nothing (does not raise) when no account exists for the phone, so
-- that path falls through to a normal failed sign-in (PIN_INVALID) instead
-- of a distinct signal that would tell a caller "this phone has an account".
create function public.assert_device_trusted_for_login(p_phone text, p_device_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_active_device_id uuid;
  v_locked_until timestamptz;
  v_stored_hash text;
begin
  select p.id, sp.active_device_id, sp.pin_locked_until
    into v_user_id, v_active_device_id, v_locked_until
  from public.profiles p
  join public.security_profiles sp on sp.user_id = p.id
  where p.phone = p_phone;

  if v_user_id is null then
    return;
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'PIN_LOCKED' using errcode = 'P0001';
  end if;

  if v_active_device_id is not null then
    select token_hash into v_stored_hash
    from public.trusted_devices
    where id = v_active_device_id and revoked_at is null;
  end if;

  if p_device_token_hash is null or v_stored_hash is null or v_stored_hash <> p_device_token_hash then
    raise exception 'DEVICE_UNTRUSTED' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.assert_device_trusted_for_login(text, text) to anon, authenticated;

-- Precondition for the *new-device* (OTP-verified) PIN login path: only
-- checks the lockout, since device trust is proven by a recent consumed
-- DEVICE_LOGIN challenge instead (checked by the route handler via
-- assert_recent_otp_verified before this is called).
create function public.assert_not_pin_locked(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locked_until timestamptz;
begin
  select sp.pin_locked_until into v_locked_until
  from public.profiles p
  join public.security_profiles sp on sp.user_id = p.id
  where p.phone = p_phone;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'PIN_LOCKED' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.assert_not_pin_locked(text) to anon, authenticated;

-- Called by the route handler after a failed/successful
-- signInWithPassword -- Postgres has no visibility into that GoTrue call's
-- outcome, so the route reports it back explicitly.
create function public.record_pin_failure(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_new_count smallint;
begin
  select p.id into v_user_id from public.profiles p where p.phone = p_phone;
  if v_user_id is null then
    return;
  end if;

  update public.security_profiles
  set pin_failed_attempts = pin_failed_attempts + 1,
      updated_at = now()
  where user_id = v_user_id
  returning pin_failed_attempts into v_new_count;

  if v_new_count >= 5 then
    update public.security_profiles
    set pin_locked_until = now() + interval '15 minutes'
    where user_id = v_user_id;

    insert into public.security_events (user_id, event_type) values (v_user_id, 'PIN_LOCKED');
  else
    insert into public.security_events (user_id, event_type) values (v_user_id, 'PIN_LOGIN_FAILED');
  end if;
end;
$$;

grant execute on function public.record_pin_failure(text) to anon, authenticated;

create function public.record_pin_success(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select p.id into v_user_id from public.profiles p where p.phone = p_phone;
  if v_user_id is null then
    return;
  end if;

  update public.security_profiles
  set pin_failed_attempts = 0, pin_locked_until = null, updated_at = now()
  where user_id = v_user_id;

  insert into public.security_events (user_id, event_type) values (v_user_id, 'PIN_LOGIN_SUCCESS');
end;
$$;

grant execute on function public.record_pin_success(text) to anon, authenticated;

-- Called after a new-device login succeeds (OTP + PIN both verified): trusts
-- the new device, revokes the old one, and rotates active_device_id /
-- active_session_id so the old browser's still-valid access token starts
-- failing DEVICE_REPLACED on its very next protected call. The route
-- handler separately calls supabase.auth.signOut({ scope: "others" }) --
-- that's a GoTrue call this function cannot make.
create function public.rotate_device_session(p_new_device_token_hash text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_device_id uuid;
  v_new_device_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  select active_device_id into v_old_device_id
  from public.security_profiles
  where user_id = v_user_id;

  if v_old_device_id is not null then
    update public.trusted_devices
    set revoked_at = now()
    where id = v_old_device_id and revoked_at is null;

    insert into public.security_events (user_id, event_type) values (v_user_id, 'DEVICE_REVOKED');
  end if;

  insert into public.trusted_devices (user_id, token_hash, user_agent, trusted_at)
  values (v_user_id, p_new_device_token_hash, p_user_agent, now())
  returning id into v_new_device_id;

  update public.security_profiles
  set active_device_id = v_new_device_id,
      active_session_id = (auth.jwt() ->> 'session_id')::uuid,
      updated_at = now()
  where user_id = v_user_id;

  insert into public.security_events (user_id, event_type) values (v_user_id, 'DEVICE_TRUSTED');
end;
$$;

grant execute on function public.rotate_device_session(text, text) to authenticated;

-- PIN change: split into a read-only reuse check (called before the route
-- updates the Supabase Auth password) and a record step (called only after
-- that update actually succeeds), so a fingerprint is never recorded for a
-- password change that didn't happen.
create function public.assert_pin_not_reused(p_new_fingerprint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- The three most recently used PINs, per docs/ARCHITECTURE.md -- this
  -- naturally includes the current PIN (its fingerprint is the latest row),
  -- so setting the same PIN again is rejected too.
  if exists (
    select 1 from (
      select pin_fingerprint from public.pin_history
      where user_id = v_user_id
      order by created_at desc
      limit 3
    ) recent
    where recent.pin_fingerprint = p_new_fingerprint
  ) then
    raise exception 'PIN_REUSED' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.assert_pin_not_reused(text) to authenticated;

create function public.record_pin_change(p_phone text, p_new_fingerprint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  perform public.assert_recent_otp_verified(p_phone, 'PIN_CHANGE');

  insert into public.pin_history (user_id, pin_fingerprint) values (v_user_id, p_new_fingerprint);

  -- Keep only the three most recent fingerprints.
  delete from public.pin_history
  where user_id = v_user_id
    and id not in (
      select id from public.pin_history
      where user_id = v_user_id
      order by created_at desc
      limit 3
    );

  insert into public.security_events (user_id, event_type) values (v_user_id, 'PIN_CHANGED');
end;
$$;

grant execute on function public.record_pin_change(text, text) to authenticated;
