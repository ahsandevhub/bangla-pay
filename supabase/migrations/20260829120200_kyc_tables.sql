-- Synthetic NID registry and KYC verification attempts.
-- fake_nid_records holds plaintext synthetic (non-real) identity fields so the
-- verification function can match on them directly; the registry never
-- returns these rows to a client. Real BanglaPay users never have their true
-- NID stored here -- only the fixture identities seeded for the hackathon.
create table public.fake_nid_records (
  id uuid primary key default gen_random_uuid(),
  nid_number text not null unique,
  date_of_birth date not null,
  bangla_name text not null,
  english_name text not null,
  created_at timestamptz not null default now()
);

-- One row per verification attempt (including rejections), so the hourly
-- attempt limit (three failures/hour) can be counted directly from this table.
create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_path text not null,
  submitted_nid_number text not null,
  submitted_date_of_birth date not null,
  submitted_bangla_name text,
  submitted_english_name text,
  nid_fingerprint text not null,
  status public.kyc_verification_status not null,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index kyc_verifications_user_id_status_created_at_idx
  on public.kyc_verifications (user_id, status, created_at desc);

-- Only a VERIFIED row claims the fingerprint; rejected attempts must not
-- block a different, correctly-matched submission from reusing the same NID.
create unique index kyc_verifications_verified_nid_fingerprint_idx
  on public.kyc_verifications (nid_fingerprint)
  where status = 'VERIFIED';
