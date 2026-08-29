-- Phase 6 read helpers. Both follow the same "RLS-bypass-for-lookup"
-- pattern create_request already established: the caller's own row is
-- selectable under RLS (transactions_select_participant,
-- money_requests_select_participant), but the counterparty's account row
-- (to show a wallet number) is not -- accounts_select_own only permits an
-- account's owner to read it. Rather than have the client stitch together
-- two RLS-partial queries, each function resolves the caller's own account
-- from auth.uid() (never a parameter) and does the counterparty join itself
-- as SECURITY DEFINER, returning only a wallet_number -- never the
-- counterparty's other account/profile columns.

-- Cursor transaction history, enriched with the transaction type, note, and
-- counterparty wallet number a dashboard needs to render one row -- the
-- plain ledger_entries select the Phase 3 repository used has none of that.
create function public.list_transaction_history(p_cursor bigint, p_limit integer)
returns table (
  ledger_entry_id bigint,
  transaction_id uuid,
  type public.transaction_type,
  direction public.ledger_direction,
  amount_poisha bigint,
  balance_after_poisha bigint,
  note text,
  counterparty_wallet_number text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_account_id uuid;
begin
  v_user_id := public.assert_active_session();

  select id into v_account_id from public.accounts where user_id = v_user_id;
  if v_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
    select
      le.id,
      le.transaction_id,
      t.type,
      le.direction,
      le.amount_poisha,
      le.balance_after_poisha,
      t.note,
      ca.wallet_number,
      le.created_at
    from public.ledger_entries le
    join public.transactions t on t.id = le.transaction_id
    -- A DEBIT's counterparty is who received it (the destination); a
    -- CREDIT's counterparty is who sent it (the source).
    join public.accounts ca
      on ca.id = case when le.direction = 'DEBIT' then t.destination_account_id else t.source_account_id end
    where le.account_id = v_account_id
      and (p_cursor is null or le.id < p_cursor)
    order by le.id desc
    limit p_limit;
end;
$$;

grant execute on function public.list_transaction_history(bigint, integer) to authenticated;

-- Request inbox: the caller's own pending requests to pay, newest first,
-- with the requester's wallet number so the UI can identify who is asking.
-- Matches money_requests_payer_status_created_at_idx exactly.
create function public.list_pending_requests_for_payer()
returns table (
  id uuid,
  requester_wallet_number text,
  amount_poisha bigint,
  note text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_account_id uuid;
begin
  v_user_id := public.assert_active_session();

  -- Table-qualified: this function's RETURNS TABLE(id, ...) declares "id" as
  -- a PL/pgSQL variable in scope, ambiguous against the bare accounts.id
  -- column name -- same shadowing pattern as _move_money's RETURNING clause
  -- and activate_account_after_kyc's RETURNS TABLE(status, ...).
  select public.accounts.id into v_account_id from public.accounts where user_id = v_user_id;
  if v_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
    select mr.id, ra.wallet_number, mr.amount_poisha, mr.note, mr.expires_at, mr.created_at
    from public.money_requests mr
    join public.accounts ra on ra.id = mr.requester_account_id
    where mr.payer_account_id = v_account_id
      and mr.status = 'PENDING'
      and mr.expires_at > now()
    order by mr.created_at desc;
end;
$$;

grant execute on function public.list_pending_requests_for_payer() to authenticated;
