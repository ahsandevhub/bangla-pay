-- OTP lifecycle. otp_challenges.demo_code holds the plaintext code only
-- transiently (cleared on verification) -- this is the "virtual SMS inbox"
-- docs/ARCHITECTURE.md describes; the code_hash column remains the
-- authoritative value verify_otp actually checks against.
alter table public.otp_challenges add column demo_code text;

-- Public (anon-callable): registration/device-login OTPs are requested
-- before any session exists. Rate limiting is the caller's responsibility
-- (check_rate_limit), not this function's.
create function public.request_otp(p_phone text, p_purpose public.otp_purpose)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_sent_at timestamptz;
  v_code text;
  v_inbox_token uuid;
begin
  if p_phone !~ '^\+8801[3-9][0-9]{8}$' then
    raise exception 'PHONE_INVALID' using errcode = 'P0001';
  end if;

  select created_at into v_last_sent_at
  from public.otp_challenges
  where phone = p_phone and purpose = p_purpose
  order by created_at desc
  limit 1;

  if v_last_sent_at is not null and v_last_sent_at > now() - interval '60 seconds' then
    raise exception 'OTP_RESEND_TOO_SOON' using errcode = 'P0001';
  end if;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.otp_challenges (phone, purpose, code_hash, demo_code, expires_at)
  values (
    p_phone, p_purpose,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    v_code,
    now() + interval '2 minutes'
  )
  returning inbox_token into v_inbox_token;

  insert into public.security_events (event_type, metadata)
  values ('OTP_SENT', jsonb_build_object('purpose', p_purpose));

  return v_inbox_token;
end;
$$;

grant execute on function public.request_otp(text, public.otp_purpose) to anon, authenticated;

-- Public (anon-callable): the "check your phone" step of the demo flow.
-- Returns zero rows once the code is consumed or expired, matching
-- "becomes inaccessible after verification or expiry" -- callers treat an
-- empty result as "no message yet / no longer available", not an error.
create function public.read_demo_sms(p_inbox_token uuid)
returns table (code text, purpose public.otp_purpose, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select demo_code, otp_challenges.purpose, otp_challenges.expires_at
  from public.otp_challenges
  where inbox_token = p_inbox_token
    and demo_code is not null
    and consumed_at is null
    and otp_challenges.expires_at > now();
$$;

grant execute on function public.read_demo_sms(uuid) to anon, authenticated;

-- Public (anon-callable): verifies against the *latest* challenge for this
-- phone+purpose regardless of its consumed state, so a stale retry gets the
-- precise OTP_ALREADY_CONSUMED code rather than a generic OTP_INVALID.
--
-- Returns a result row instead of raising for every outcome that requires a
-- preceding write to persist (specifically: incrementing `attempts` on a
-- wrong code). A RAISE EXCEPTION aborts and rolls back the *entire*
-- function call, including any UPDATE earlier in that same call -- found by
-- testing against real Postgres: `attempts` stayed at 0 forever through
-- repeated wrong-code calls, since the increment-then-raise pattern this
-- function originally used could never actually commit the increment. Not
-- raising at all (uniformly, for every outcome) sidesteps that entirely,
-- rather than special-casing just the one path that writes.
create function public.verify_otp(p_phone text, p_purpose public.otp_purpose, p_code text)
returns table (verified boolean, failure_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.otp_challenges%rowtype;
  v_code_hash text;
begin
  select * into v_challenge
  from public.otp_challenges
  where phone = p_phone and purpose = p_purpose
  order by created_at desc
  limit 1
  for update;

  if v_challenge.id is null then
    return query select false, 'OTP_INVALID'::text;
    return;
  end if;

  if v_challenge.consumed_at is not null then
    return query select false, 'OTP_ALREADY_CONSUMED'::text;
    return;
  end if;

  if v_challenge.expires_at < now() then
    return query select false, 'OTP_EXPIRED'::text;
    return;
  end if;

  if v_challenge.attempts >= 5 then
    return query select false, 'OTP_ATTEMPTS_EXCEEDED'::text;
    return;
  end if;

  v_code_hash := encode(extensions.digest(p_code, 'sha256'), 'hex');

  if v_code_hash <> v_challenge.code_hash then
    update public.otp_challenges set attempts = attempts + 1 where id = v_challenge.id;
    insert into public.security_events (event_type, metadata)
    values ('OTP_FAILED', jsonb_build_object('purpose', p_purpose));
    return query select false, 'OTP_INVALID'::text;
    return;
  end if;

  update public.otp_challenges
  set consumed_at = now(), demo_code = null
  where id = v_challenge.id;

  insert into public.security_events (event_type, metadata)
  values ('OTP_VERIFIED', jsonb_build_object('purpose', p_purpose));

  return query select true, null::text;
end;
$$;

grant execute on function public.verify_otp(text, public.otp_purpose, text) to anon, authenticated;

-- Shared precondition for complete_registration and change_pin: both require
-- proof that the caller verified an OTP for this phone+purpose recently
-- (verify_otp doesn't itself establish a session, so this is how a later,
-- separate request proves that step actually happened).
create function public.assert_recent_otp_verified(p_phone text, p_purpose public.otp_purpose)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.otp_challenges
    where phone = p_phone
      and purpose = p_purpose
      and consumed_at is not null
      and consumed_at > now() - interval '10 minutes'
  ) then
    raise exception 'OTP_REQUIRED' using errcode = 'P0001';
  end if;
end;
$$;
