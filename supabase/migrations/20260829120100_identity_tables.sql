-- Identity: profiles, trusted devices, security profile, PIN history, OTP challenges.
-- Table creation order matters: profiles -> trusted_devices -> security_profiles,
-- since security_profiles.active_device_id references trusted_devices.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique check (phone ~ '^\+8801[3-9][0-9]{8}$'),
  bangla_name text,
  english_name text,
  status public.profile_kyc_status not null default 'PENDING_KYC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  trusted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index trusted_devices_user_id_idx on public.trusted_devices (user_id);

-- One row per user. active_device_id/active_session_id are the single source of
-- truth for the "one active device" rule: every sensitive RLS policy and RPC
-- compares the caller's JWT session_id against active_session_id, and money RPCs
-- additionally verify the caller's device token hash against the device pointed
-- to by active_device_id (see 20260829120600_security_helpers.sql).
create table public.security_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_failed_attempts smallint not null default 0 check (pin_failed_attempts >= 0),
  pin_locked_until timestamptz,
  active_device_id uuid references public.trusted_devices (id),
  active_session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Domain-separated HMAC fingerprints of the three most recently used PINs.
-- The raw PIN is never stored; fingerprints are computed application-side
-- with APP_SECURITY_PEPPER before being passed into RPCs.
create table public.pin_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pin_fingerprint text not null,
  created_at timestamptz not null default now()
);

create index pin_history_user_id_created_at_idx on public.pin_history (user_id, created_at desc);

-- Keyed by phone rather than user_id: registration OTPs are sent before a
-- profile exists, so phone is the only identifier guaranteed to be present
-- across all three purposes (registration, device login, PIN change).
create table public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^\+8801[3-9][0-9]{8}$'),
  purpose public.otp_purpose not null,
  code_hash text not null,
  inbox_token uuid not null default gen_random_uuid() unique,
  attempts smallint not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index otp_challenges_phone_purpose_created_at_idx
  on public.otp_challenges (phone, purpose, created_at desc);
