-- Core money-movement functions. _move_money implements the four transfer
-- concurrency defenses exactly once; transfer_money, settle_request, and
-- activate_account_after_kyc are thin callers that resolve which two
-- accounts move money and why, then delegate to it. This keeps "how a
-- transfer is made race-safe" in one place instead of duplicated per caller.

-- Internal only (no grants to anon/authenticated): source/destination are
-- passed in by an already-authorized caller, so this function does not
-- itself re-derive or check the acting user.
create function public._move_money(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount_poisha bigint,
  p_idempotency_key uuid,
  p_note text,
  p_type public.transaction_type
)
returns table (
  transaction_id uuid,
  source_account_id uuid,
  destination_account_id uuid,
  amount_poisha bigint,
  type public.transaction_type,
  note text,
  created_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first uuid;
  v_second uuid;
  v_source public.accounts%rowtype;
  v_destination public.accounts%rowtype;
  v_existing record;
  v_transaction_id uuid;
  v_created_at timestamptz;
  v_source_balance_after bigint;
  v_destination_balance_after bigint;
begin
  if p_amount_poisha is null or p_amount_poisha <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  if p_source_account_id = p_destination_account_id then
    raise exception 'SELF_TRANSFER' using errcode = 'P0001';
  end if;

  -- Defense 1 (idempotent replay): a retried request (client timeout, double
  -- click, request queue redelivery) carrying the same source account and
  -- idempotency key must return the original result instead of moving money
  -- twice. Checked before any lock is taken, so replays are cheap.
  select t.id, t.source_account_id, t.destination_account_id, t.amount_poisha,
         t.type, t.note, t.created_at
    into v_existing
  from public.transactions t
  where t.source_account_id = p_source_account_id
    and t.idempotency_key = p_idempotency_key;

  if found then
    return query select v_existing.id, v_existing.source_account_id, v_existing.destination_account_id,
      v_existing.amount_poisha, v_existing.type, v_existing.note, v_existing.created_at, true;
    return;
  end if;

  -- Defense 2 (deadlock-free lock order): always lock the lower UUID first,
  -- never the caller-determined source-then-destination order. Two transfers
  -- moving money in opposite directions between the same pair of accounts
  -- (A->B and B->A) then always request their locks in the same sequence and
  -- can never deadlock against each other.
  if p_source_account_id < p_destination_account_id then
    v_first := p_source_account_id;
    v_second := p_destination_account_id;
  else
    v_first := p_destination_account_id;
    v_second := p_source_account_id;
  end if;

  perform 1 from public.accounts where id = v_first for update;
  perform 1 from public.accounts where id = v_second for update;

  select * into v_source from public.accounts where id = p_source_account_id;
  select * into v_destination from public.accounts where id = p_destination_account_id;

  if v_source.id is null or v_destination.id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_source.status <> 'ACTIVE' or v_destination.status <> 'ACTIVE' then
    raise exception 'ACCOUNT_INACTIVE' using errcode = 'P0001';
  end if;

  -- Defense 3 (atomic check-and-write): the sufficiency check and the debit
  -- happen in one UPDATE ... WHERE balance_poisha >= amount RETURNING
  -- statement rather than a separate SELECT-then-UPDATE, so correctness does
  -- not depend on the lock above alone -- this single statement is also the
  -- authoritative INSUFFICIENT_FUNDS check. The SYSTEM account is exempt: it
  -- is the double-entry counterparty that issues every INITIAL_FUNDING
  -- credit and is allowed to run negative (see accounts_user_balance_non_negative).
  update public.accounts
  set balance_poisha = balance_poisha - p_amount_poisha,
      updated_at = now()
  where id = p_source_account_id
    and (kind = 'SYSTEM' or balance_poisha >= p_amount_poisha)
  returning balance_poisha into v_source_balance_after;

  if not found then
    raise exception 'INSUFFICIENT_FUNDS' using errcode = 'P0001';
  end if;

  update public.accounts
  set balance_poisha = balance_poisha + p_amount_poisha,
      updated_at = now()
  where id = p_destination_account_id
  returning balance_poisha into v_destination_balance_after;

  -- Defense 4 (unique-index race catch): if two requests somehow reached
  -- here for the same source + idempotency key (e.g. two retries issued
  -- close enough together to both miss Defense 1's read), the unique index
  -- on (source_account_id, idempotency_key) rejects the second INSERT.
  -- Catch that and hand back the winner's row as a replay, so the caller
  -- never sees a spurious error for a request it legitimately retried.
  begin
    insert into public.transactions (
      type, source_account_id, destination_account_id, amount_poisha, idempotency_key, note
    ) values (
      p_type, p_source_account_id, p_destination_account_id, p_amount_poisha, p_idempotency_key, p_note
    )
    -- Table-qualified: this function's RETURNS TABLE(..., created_at, ...)
    -- implicitly declares "created_at" as a PL/pgSQL variable in scope, which
    -- makes the bare column name ambiguous against public.transactions.created_at.
    returning public.transactions.id, public.transactions.created_at
    into v_transaction_id, v_created_at;
  exception when unique_violation then
    select t.id, t.source_account_id, t.destination_account_id, t.amount_poisha,
           t.type, t.note, t.created_at
      into v_existing
    from public.transactions t
    where t.source_account_id = p_source_account_id
      and t.idempotency_key = p_idempotency_key;

    return query select v_existing.id, v_existing.source_account_id, v_existing.destination_account_id,
      v_existing.amount_poisha, v_existing.type, v_existing.note, v_existing.created_at, true;
    return;
  end;

  insert into public.ledger_entries (transaction_id, account_id, direction, amount_poisha, balance_after_poisha)
  values
    (v_transaction_id, p_source_account_id, 'DEBIT', p_amount_poisha, v_source_balance_after),
    (v_transaction_id, p_destination_account_id, 'CREDIT', p_amount_poisha, v_destination_balance_after);

  return query select v_transaction_id, p_source_account_id, p_destination_account_id,
    p_amount_poisha, p_type, p_note, v_created_at, false;
end;
$$;

-- Public entry point. Source is always the caller's own account -- never a
-- parameter -- so a client can only ever move money out of their own wallet.
create function public.transfer_money(
  p_destination_wallet text,
  p_amount_poisha bigint,
  p_idempotency_key uuid,
  p_note text,
  p_transaction_type public.transaction_type,
  p_device_token text
)
returns table (
  transaction_id uuid,
  source_account_id uuid,
  destination_account_id uuid,
  amount_poisha bigint,
  type public.transaction_type,
  note text,
  created_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_source_account_id uuid;
  v_destination_account_id uuid;
begin
  v_user_id := public.assert_active_session();
  perform public.assert_active_device(v_user_id, p_device_token);

  -- INITIAL_FUNDING is only ever created internally by
  -- activate_account_after_kyc; a client calling this RPC directly must not
  -- be able to self-label an ordinary transfer as system funding.
  if p_transaction_type = 'INITIAL_FUNDING' then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  select id into v_source_account_id from public.accounts where user_id = v_user_id;
  if v_source_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select id into v_destination_account_id from public.accounts where wallet_number = p_destination_wallet;
  if v_destination_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
    select * from public._move_money(
      v_source_account_id, v_destination_account_id, p_amount_poisha, p_idempotency_key, p_note, p_transaction_type
    );
end;
$$;

grant execute on function public.transfer_money(text, bigint, uuid, text, public.transaction_type, text) to authenticated;

-- Accept a pending money request: only the designated payer may settle it,
-- and it is settled at most once. Uses the request's own id as the
-- idempotency key, so a retried accept can never double-pay.
create function public.settle_request(p_request_id uuid, p_device_token text)
returns table (
  transaction_id uuid,
  source_account_id uuid,
  destination_account_id uuid,
  amount_poisha bigint,
  type public.transaction_type,
  note text,
  created_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_request public.money_requests%rowtype;
  v_payer_user_id uuid;
  v_move record;
begin
  v_user_id := public.assert_active_session();
  perform public.assert_active_device(v_user_id, p_device_token);

  select * into v_request from public.money_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- No UPDATE-then-raise here: a raised exception aborts and rolls back this
  -- entire call (PostgREST/any RPC caller runs one function call as one
  -- transaction), so an UPDATE immediately before a RAISE can never persist
  -- -- it would silently be dead code. Actually flipping expired rows to
  -- EXPIRED in storage is expire_money_requests()'s job (Phase 7, pg_cron);
  -- this check only ever rejects the accept attempt.
  if v_request.status = 'PENDING' and v_request.expires_at < now() then
    raise exception 'REQUEST_EXPIRED' using errcode = 'P0001';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'REQUEST_NOT_PENDING' using errcode = 'P0001';
  end if;

  select user_id into v_payer_user_id from public.accounts where id = v_request.payer_account_id;
  if v_payer_user_id is distinct from v_user_id then
    raise exception 'REQUEST_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  select * into v_move from public._move_money(
    v_request.payer_account_id, v_request.requester_account_id, v_request.amount_poisha,
    v_request.id, v_request.note, 'REQUEST_SETTLEMENT'
  );

  update public.money_requests
  set status = 'ACCEPTED', settlement_transaction_id = v_move.transaction_id, updated_at = now()
  where id = p_request_id;

  return query select v_move.transaction_id, v_move.source_account_id, v_move.destination_account_id,
    v_move.amount_poisha, v_move.type, v_move.note, v_move.created_at, v_move.replayed;
end;
$$;

grant execute on function public.settle_request(uuid, text) to authenticated;

create function public.decline_request(p_request_id uuid)
returns public.money_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_request public.money_requests%rowtype;
  v_payer_user_id uuid;
begin
  v_user_id := public.assert_active_session();

  select * into v_request from public.money_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'REQUEST_NOT_PENDING' using errcode = 'P0001';
  end if;

  select user_id into v_payer_user_id from public.accounts where id = v_request.payer_account_id;
  if v_payer_user_id is distinct from v_user_id then
    raise exception 'REQUEST_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  update public.money_requests
  set status = 'DECLINED', updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.decline_request(uuid) to authenticated;

-- Verify submitted KYC fields against the fake registry and, on a match,
-- create and fund the user's wallet in the same atomic call. Matching,
-- recording the attempt, and activation must be one function: splitting
-- "verify" from "activate" would reopen the exact concurrent-duplicate-NID
-- race the nid_fingerprint lock below exists to close.
create function public.activate_account_after_kyc(
  p_document_path text,
  p_submitted_nid_number text,
  p_submitted_date_of_birth date,
  p_submitted_bangla_name text,
  p_submitted_english_name text,
  p_nid_fingerprint text
)
returns table (
  status public.kyc_verification_status,
  account_id uuid,
  wallet_number text,
  balance_poisha bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_profile public.profiles%rowtype;
  v_recent_failures integer;
  v_match public.fake_nid_records%rowtype;
  v_account_id uuid;
  v_system_account_id uuid;
begin
  v_user_id := public.assert_active_session();

  -- Lock the profile for the duration of this call: two concurrent
  -- activation attempts by the same user (e.g. a double-submitted form) must
  -- serialize here rather than both passing the ACCOUNT_ALREADY_VERIFIED
  -- check and racing on the accounts insert below.
  select * into v_profile from public.profiles where id = v_user_id for update;
  if v_profile.id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_profile.status = 'ACTIVE' then
    raise exception 'ACCOUNT_ALREADY_VERIFIED' using errcode = 'P0001';
  end if;

  select count(*) into v_recent_failures
  from public.kyc_verifications
  where user_id = v_user_id
    and status = 'REJECTED'
    and created_at > now() - interval '1 hour';

  if v_recent_failures >= 3 then
    raise exception 'KYC_ATTEMPTS_EXCEEDED' using errcode = 'P0001';
  end if;

  -- One verified user per NID fingerprint, under concurrency: lock any
  -- existing verified row for this fingerprint before deciding, so two
  -- concurrent submissions of the same NID cannot both observe "not yet
  -- claimed" and both proceed to activation.
  perform 1 from public.kyc_verifications
  where nid_fingerprint = p_nid_fingerprint and status = 'VERIFIED'
  for update;

  if found then
    insert into public.kyc_verifications (
      user_id, document_path, submitted_nid_number, submitted_date_of_birth,
      submitted_bangla_name, submitted_english_name, nid_fingerprint, status, rejection_reason
    ) values (
      v_user_id, p_document_path, p_submitted_nid_number, p_submitted_date_of_birth,
      p_submitted_bangla_name, p_submitted_english_name, p_nid_fingerprint, 'REJECTED', 'NID_ALREADY_USED'
    );
    raise exception 'NID_ALREADY_USED' using errcode = 'P0001';
  end if;

  -- Match requires exact NID + DOB plus at least one exact normalized name.
  select * into v_match
  from public.fake_nid_records r
  where r.nid_number = p_submitted_nid_number
    and r.date_of_birth = p_submitted_date_of_birth
    and (r.bangla_name = p_submitted_bangla_name or r.english_name = p_submitted_english_name);

  if v_match.id is null then
    insert into public.kyc_verifications (
      user_id, document_path, submitted_nid_number, submitted_date_of_birth,
      submitted_bangla_name, submitted_english_name, nid_fingerprint, status, rejection_reason
    ) values (
      v_user_id, p_document_path, p_submitted_nid_number, p_submitted_date_of_birth,
      p_submitted_bangla_name, p_submitted_english_name, p_nid_fingerprint, 'REJECTED', 'KYC_NO_MATCH'
    );
    raise exception 'KYC_NO_MATCH' using errcode = 'P0001';
  end if;

  insert into public.kyc_verifications (
    user_id, document_path, submitted_nid_number, submitted_date_of_birth,
    submitted_bangla_name, submitted_english_name, nid_fingerprint, status
  ) values (
    v_user_id, p_document_path, p_submitted_nid_number, p_submitted_date_of_birth,
    p_submitted_bangla_name, p_submitted_english_name, p_nid_fingerprint, 'VERIFIED'
  );

  update public.profiles set status = 'ACTIVE', updated_at = now() where id = v_user_id;

  insert into public.accounts (user_id, kind, wallet_number, status)
  values (v_user_id, 'USER', v_profile.phone, 'ACTIVE')
  returning id into v_account_id;

  select id into v_system_account_id from public.accounts where kind = 'SYSTEM';
  if v_system_account_id is null then
    raise exception 'INTERNAL_ERROR' using errcode = 'P0001';
  end if;

  -- BDT 100,000 in integer poisha (100,000 * 100).
  perform public._move_money(
    v_system_account_id, v_account_id, 10000000, gen_random_uuid(), 'Initial KYC funding', 'INITIAL_FUNDING'
  );

  -- Table-qualified for the same reason as _move_money above: this
  -- function's RETURNS TABLE(..., balance_poisha) declares "balance_poisha"
  -- as a PL/pgSQL variable, ambiguous against the bare column name.
  return query select 'VERIFIED'::public.kyc_verification_status, v_account_id, v_profile.phone,
    (select public.accounts.balance_poisha from public.accounts where public.accounts.id = v_account_id);
end;
$$;

grant execute on function public.activate_account_after_kyc(text, text, date, text, text, text) to authenticated;
