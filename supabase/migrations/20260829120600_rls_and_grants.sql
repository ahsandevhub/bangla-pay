-- Row Level Security and role grants.
--
-- Strategy: enable RLS everywhere, then grant SELECT only on the tables a
-- user legitimately reads (their own identity/financial rows, gated by both
-- ownership and current_session_is_active()), and grant EXECUTE only on the
-- RPC functions that are meant to be called directly from the API. Every
-- write to identity/financial tables happens exclusively inside SECURITY
-- DEFINER functions, which run as the table owner and bypass RLS -- direct
-- INSERT/UPDATE/DELETE from anon/authenticated is never granted, full stop.

alter table public.profiles enable row level security;
alter table public.security_profiles enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.pin_history enable row level security;
alter table public.otp_challenges enable row level security;
alter table public.fake_nid_records enable row level security;
alter table public.kyc_verifications enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.money_requests enable row level security;
alter table public.rate_limits enable row level security;
alter table public.security_events enable row level security;

-- Revoke every default/implicit privilege, then re-grant precisely.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- profiles: a user may read (and, via a narrow policy, update their own
-- display fields) their own row. Status transitions still only happen inside
-- activate_account_after_kyc.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

grant select on public.profiles to authenticated;

-- security_profiles, trusted_devices, pin_history, otp_challenges,
-- fake_nid_records, kyc_verifications: no client policies at all. These hold
-- session/device secrets, PIN fingerprint history, OTP state, and the fake
-- registry. They are only ever read or written through SECURITY DEFINER
-- functions (which bypass RLS as the table owner) or a service-role server
-- client. RLS is enabled with zero policies, which denies all direct API
-- access by default -- there is nothing more to add here.

-- accounts: owner + active-session read only. The hidden system account has
-- user_id = null, which never equals auth.uid(), so it is unreachable here.
create policy accounts_select_own on public.accounts
  for select to authenticated
  using (user_id = auth.uid() and public.current_session_is_active());

grant select on public.accounts to authenticated;

-- transactions: readable by either party (source or destination account
-- owner), gated by active session.
create policy transactions_select_participant on public.transactions
  for select to authenticated
  using (
    public.current_session_is_active()
    and exists (
      select 1 from public.accounts a
      where a.id in (transactions.source_account_id, transactions.destination_account_id)
        and a.user_id = auth.uid()
    )
  );

grant select on public.transactions to authenticated;

-- ledger_entries: the transaction-history read path. Cursor pagination reads
-- this table directly by (account_id, id desc).
create policy ledger_entries_select_own_account on public.ledger_entries
  for select to authenticated
  using (
    public.current_session_is_active()
    and exists (
      select 1 from public.accounts a
      where a.id = ledger_entries.account_id
        and a.user_id = auth.uid()
    )
  );

grant select on public.ledger_entries to authenticated;

-- money_requests: readable by either the requester (who is owed) or the payer.
create policy money_requests_select_participant on public.money_requests
  for select to authenticated
  using (
    public.current_session_is_active()
    and exists (
      select 1 from public.accounts a
      where a.id in (money_requests.requester_account_id, money_requests.payer_account_id)
        and a.user_id = auth.uid()
    )
  );

grant select on public.money_requests to authenticated;

-- rate_limits, security_events: server/audit-only, no client policies or grants.

-- Private bucket for KYC document images. Objects are uploaded via signed
-- URLs generated server-side (Phase 5); RLS here is defense in depth in case
-- a client ever holds a plain authenticated storage session.
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy kyc_documents_owner_only on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
