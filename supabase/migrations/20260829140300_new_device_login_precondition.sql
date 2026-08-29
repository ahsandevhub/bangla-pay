-- Gap found while designing the login service: "a different browser must
-- complete OTP before PIN login" (docs/ARCHITECTURE.md) means the OTP check
-- has to gate the *attempt* to sign in, not just the device-rotation that
-- happens afterward -- but rotate_device_session needs auth.uid(), which
-- only exists once sign-in has already succeeded. So this precondition
-- (lock status + recent DEVICE_LOGIN OTP proof) has to run pre-auth, same as
-- assert_device_trusted_for_login does for the trusted-device path.
create function public.assert_new_device_login_allowed(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_not_pin_locked(p_phone);
  perform public.assert_recent_otp_verified(p_phone, 'DEVICE_LOGIN');
end;
$$;

grant execute on function public.assert_new_device_login_allowed(text) to anon, authenticated;
