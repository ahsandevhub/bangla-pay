-- Accounts (wallets), transactions, the append-only ledger, and money requests.
-- All money columns are bigint poisha; never numeric/float.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  kind public.account_kind not null default 'USER',
  wallet_number text not null unique,
  balance_poisha bigint not null default 0,
  status public.wallet_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_system_has_no_user check (
    (kind = 'SYSTEM' and user_id is null) or (kind = 'USER' and user_id is not null)
  ),
  -- User wallets must never go negative. The hidden system account is the
  -- double-entry counterparty for every INITIAL_FUNDING transaction (it is
  -- debited so a user account can be credited), so its balance is the
  -- negative of total funds issued -- allowed to go negative by design.
  constraint accounts_user_balance_non_negative check (kind = 'SYSTEM' or balance_poisha >= 0)
);

-- One wallet per user (the hidden system account has no user_id, so a plain
-- UNIQUE constraint on the column can't express this -- it must be partial).
create unique index accounts_user_id_idx on public.accounts (user_id) where user_id is not null;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type public.transaction_type not null,
  status public.transaction_status not null default 'COMPLETED',
  source_account_id uuid not null references public.accounts (id),
  destination_account_id uuid not null references public.accounts (id),
  amount_poisha bigint not null check (amount_poisha > 0),
  idempotency_key uuid not null,
  note text,
  created_at timestamptz not null default now(),
  constraint transactions_no_self_transfer check (source_account_id <> destination_account_id)
);

-- Idempotency is scoped per source account: replaying the same key from a
-- different source must not collide with someone else's transaction.
create unique index transactions_source_idempotency_key_idx
  on public.transactions (source_account_id, idempotency_key);

-- Append-only, double-entry ledger. accounts.balance_poisha is a
-- read-optimized cache; this table is the authoritative source of truth and
-- must always reconcile with it (see verify_ledger_integrity).
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.transactions (id),
  account_id uuid not null references public.accounts (id),
  direction public.ledger_direction not null,
  amount_poisha bigint not null check (amount_poisha > 0),
  -- No non-negative check here: this is a snapshot of accounts.balance_poisha,
  -- which is itself allowed to go negative for the system account (see
  -- accounts_user_balance_non_negative). The snapshot must be free to match.
  balance_after_poisha bigint not null,
  created_at timestamptz not null default now()
);

-- Cursor-based transaction history for one account; never offset pagination.
create index ledger_entries_account_id_id_idx on public.ledger_entries (account_id, id desc);
create index ledger_entries_transaction_id_idx on public.ledger_entries (transaction_id);

-- Defense in depth beyond grants: even a role with UPDATE/DELETE privileges
-- (e.g. a future migration bug that over-grants) cannot mutate ledger history.
-- Exempts the table owner (postgres) specifically, since that is the role
-- migrations, disaster-recovery scripts, and integration-test cleanup run
-- as -- anon/authenticated (the actual "application roles" this defends
-- against) never have that privilege to begin with.
create function public.forbid_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'postgres' then
    raise exception 'LEDGER_IMMUTABLE' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger ledger_entries_forbid_update
  before update on public.ledger_entries
  for each row execute function public.forbid_ledger_mutation();

create trigger ledger_entries_forbid_delete
  before delete on public.ledger_entries
  for each row execute function public.forbid_ledger_mutation();

create table public.money_requests (
  id uuid primary key default gen_random_uuid(),
  requester_account_id uuid not null references public.accounts (id),
  payer_account_id uuid not null references public.accounts (id),
  amount_poisha bigint not null check (amount_poisha > 0),
  note text,
  status public.request_status not null default 'PENDING',
  settlement_transaction_id uuid references public.transactions (id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint money_requests_no_self_request check (requester_account_id <> payer_account_id)
);

-- Supports the request inbox query: a payer's pending requests, newest first.
create index money_requests_payer_status_created_at_idx
  on public.money_requests (payer_account_id, status, created_at desc);
