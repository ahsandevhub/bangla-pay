-- Fixed-window rate limit counters and redacted audit events.

-- bucket_key is a hash of "<action>:<ip-or-user>" computed by check_rate_limit;
-- callers never pass raw IP/user identifiers as the key directly.
create table public.rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count >= 0),
  primary key (bucket_key, window_start)
);

-- Redacted audit trail for OTP, PIN, KYC and device events. Never store raw
-- phone/OTP/PIN/NID/token/secret values here -- metadata must be pre-redacted
-- by the caller before insert.
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index security_events_user_id_created_at_idx on public.security_events (user_id, created_at desc);
create index security_events_event_type_created_at_idx on public.security_events (event_type, created_at desc);
