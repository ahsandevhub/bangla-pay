-- Rate limiting, request expiry, and ledger reconciliation.

-- Generic fixed-window limiter. p_identifier is typically a user id or IP;
-- it is hashed together with the action name so rate_limits never stores a
-- raw identifier. window_start is the identifier's epoch-second truncated to
-- the window size, giving every caller within the same window the same
-- bucket row to increment.
create function public.check_rate_limit(
  p_action text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket_key text;
  v_window_start timestamptz;
  v_count integer;
begin
  v_bucket_key := encode(extensions.digest(p_action || ':' || p_identifier, 'sha256'), 'hex');
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (bucket_key, window_start, attempt_count)
  values (v_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set attempt_count = public.rate_limits.attempt_count + 1
  returning attempt_count into v_count;

  if v_count > p_limit then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, text, integer, integer) to authenticated;

-- Lazily expiring pending requests on read (settle_request, decline_request)
-- covers correctness; this sweep is for display -- an EXPIRED status the
-- payer's inbox can show without them having to touch the row first.
-- Intended to run via pg_cron once scheduled (Phase 7), not called from the API.
create function public.expire_money_requests()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.money_requests
    set status = 'EXPIRED', updated_at = now()
    where status = 'PENDING' and expires_at < now()
    returning id
  )
  select count(*)::integer from expired;
$$;

-- Compares each account's cached balance against its ledger-derived balance.
-- Not granted to anon/authenticated: the admin reconcile route calls this
-- with the service-role client, per the RECONCILE_ADMIN_TOKEN-gated
-- GET /api/admin/reconcile contract in docs/ARCHITECTURE.md.
create function public.verify_ledger_integrity()
returns table (
  account_id uuid,
  cached_balance_poisha bigint,
  ledger_balance_poisha bigint,
  ok boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.balance_poisha,
    coalesce(sum(case when le.direction = 'CREDIT' then le.amount_poisha else -le.amount_poisha end), 0),
    a.balance_poisha = coalesce(sum(case when le.direction = 'CREDIT' then le.amount_poisha else -le.amount_poisha end), 0)
  from public.accounts a
  left join public.ledger_entries le on le.account_id = a.id
  group by a.id, a.balance_poisha;
$$;
