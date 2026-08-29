-- Gap found while building the Phase 3 requests repository: Phase 1 never
-- added a way to create a money request. money_requests only has an RLS
-- SELECT policy, and even granting authenticated INSERT wouldn't be enough
-- on its own -- resolving the payer's account by wallet number requires
-- reading a row RLS would normally hide (accounts_select_own requires
-- ownership), the exact reason transfer_money is SECURITY DEFINER. Request
-- creation doesn't move money, so it doesn't need _move_money's concurrency
-- defenses, but it needs the same RLS-bypass-for-lookup treatment.
create function public.create_request(
  p_payer_wallet text,
  p_amount_poisha bigint,
  p_note text
)
returns public.money_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_requester_account_id uuid;
  v_payer_account_id uuid;
  v_request public.money_requests%rowtype;
begin
  v_user_id := public.assert_active_session();

  if p_amount_poisha is null or p_amount_poisha <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  select id into v_requester_account_id from public.accounts where user_id = v_user_id;
  if v_requester_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select id into v_payer_account_id from public.accounts where wallet_number = p_payer_wallet;
  if v_payer_account_id is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_requester_account_id = v_payer_account_id then
    raise exception 'SELF_TRANSFER' using errcode = 'P0001';
  end if;

  -- 24-hour expiry is not frozen anywhere in docs/ARCHITECTURE.md or
  -- docs/CONTRACTS.md; picked as a reasonable default rather than left as a
  -- client-supplied parameter (which would let a client mint arbitrarily
  -- long-lived requests). Revisit if the team wants this configurable.
  insert into public.money_requests (requester_account_id, payer_account_id, amount_poisha, note, expires_at)
  values (v_requester_account_id, v_payer_account_id, p_amount_poisha, p_note, now() + interval '24 hours')
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.create_request(text, bigint, text) to authenticated;
