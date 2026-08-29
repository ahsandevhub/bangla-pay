-- Hidden system funding account. Structural, not test data: it must exist in
-- every environment (local, hosted) since activate_account_after_kyc debits
-- it for every user's initial funding. Fixture NID records are test-only
-- data and belong in supabase/seed.sql instead.
insert into public.accounts (kind, wallet_number, status, balance_poisha)
values ('SYSTEM', 'SYSTEM-FUNDING', 'ACTIVE', 0)
on conflict (wallet_number) do nothing;
