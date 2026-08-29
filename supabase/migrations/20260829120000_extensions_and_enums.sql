-- Extensions
create extension if not exists pgcrypto with schema extensions;

-- Enums
create type public.profile_kyc_status as enum ('PENDING_KYC', 'ACTIVE');
create type public.wallet_status as enum ('ACTIVE', 'INACTIVE');
create type public.account_kind as enum ('USER', 'SYSTEM');
create type public.transaction_type as enum ('INITIAL_FUNDING', 'TRANSFER', 'REQUEST_SETTLEMENT');
create type public.transaction_status as enum ('COMPLETED');
create type public.ledger_direction as enum ('DEBIT', 'CREDIT');
create type public.kyc_verification_status as enum ('VERIFIED', 'REJECTED');
create type public.request_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
create type public.otp_purpose as enum ('REGISTRATION', 'DEVICE_LOGIN', 'PIN_CHANGE');
