import { InvalidPhoneError, normalizePhone } from "@/lib/auth/phone";
import { WeakPinError, assertPinIsStrong } from "@/lib/auth/pin";
import {
  derivePasswordCredential,
  derivePinFingerprint,
  generateDeviceToken,
  hashDeviceToken,
} from "@/lib/auth/credentials";
import type { AuthRepository } from "@/lib/auth/auth.repository";
import type { DemoSmsMessage, OtpPurpose } from "@/lib/auth/auth.types";
import { type Result, ok, err } from "@/lib/shared/result";
import { type AppError, appError, defaultMessageForErrorCode } from "@/lib/shared/errors/app-error";

export class AuthService {
  constructor(private readonly auth: AuthRepository) {}

  private parsePhone(rawPhone: string): Result<string, AppError> {
    try {
      return ok(normalizePhone(rawPhone));
    } catch (error) {
      if (error instanceof InvalidPhoneError) {
        return err(appError("PHONE_INVALID", defaultMessageForErrorCode("PHONE_INVALID")));
      }
      throw error;
    }
  }

  async checkPhone(rawPhone: string): Promise<Result<{ phone: string; available: boolean }, AppError>> {
    const phoneResult = this.parsePhone(rawPhone);
    if (!phoneResult.ok) return phoneResult;

    const registeredResult = await this.auth.isPhoneRegistered(phoneResult.value);
    if (!registeredResult.ok) return registeredResult;

    return ok({ phone: phoneResult.value, available: !registeredResult.value });
  }

  /**
   * REGISTRATION/DEVICE_LOGIN happen pre-auth, so the client-supplied phone
   * is the only option and is safe there (no account exists yet to corrupt
   * for REGISTRATION; DEVICE_LOGIN just gates a login attempt for whatever
   * phone is given). PIN_CHANGE is different: the caller already has a
   * session, and using anything other than *their own* registered phone
   * here would derive credential/fingerprint material for the wrong
   * account -- so for that purpose the client-supplied phone is ignored
   * entirely in favor of the authenticated caller's own profile phone.
   */
  private async resolvePhoneForOtp(rawPhone: string, purpose: OtpPurpose): Promise<Result<string, AppError>> {
    if (purpose === "PIN_CHANGE") {
      return this.auth.getOwnPhone();
    }
    return this.parsePhone(rawPhone);
  }

  async sendOtp(rawPhone: string, purpose: OtpPurpose): Promise<Result<{ inboxToken: string }, AppError>> {
    const phoneResult = await this.resolvePhoneForOtp(rawPhone, purpose);
    if (!phoneResult.ok) return phoneResult;

    const sendResult = await this.auth.sendOtp(phoneResult.value, purpose);
    if (!sendResult.ok) return sendResult;

    return ok({ inboxToken: sendResult.value });
  }

  readDemoSms(inboxToken: string): Promise<Result<DemoSmsMessage | null, AppError>> {
    return this.auth.readDemoSms(inboxToken);
  }

  async verifyOtp(rawPhone: string, purpose: OtpPurpose, code: string): Promise<Result<void, AppError>> {
    const phoneResult = await this.resolvePhoneForOtp(rawPhone, purpose);
    if (!phoneResult.ok) return phoneResult;

    return this.auth.verifyOtp(phoneResult.value, purpose, code);
  }

  /**
   * Finalizes registration: caller must have already verified a
   * REGISTRATION OTP for this phone (checked server-side by
   * complete_registration itself). Creates the Supabase Auth user, signs
   * them in, and sets up profiles/security_profiles/trusted_devices/pin_history.
   *
   * Note on partial failure: if createAuthUser succeeds but a later step
   * fails, the auth.users row is orphaned (no profile). Acceptable for the
   * hackathon's scope -- a full saga/compensation pattern is not worth
   * building for this.
   */
  async register(params: {
    phone: string;
    pin: string;
    confirmPin: string;
    userAgent: string;
  }): Promise<Result<{ deviceToken: string }, AppError>> {
    const phoneResult = this.parsePhone(params.phone);
    if (!phoneResult.ok) return phoneResult;
    const phone = phoneResult.value;

    if (params.pin !== params.confirmPin) {
      return err(appError("PIN_MISMATCH", defaultMessageForErrorCode("PIN_MISMATCH")));
    }

    try {
      assertPinIsStrong(params.pin, phone);
    } catch (error) {
      if (error instanceof WeakPinError) {
        return err(appError("PIN_WEAK", defaultMessageForErrorCode("PIN_WEAK")));
      }
      throw error;
    }

    const passwordCredential = derivePasswordCredential(phone, params.pin);

    const createResult = await this.auth.createAuthUser(phone, passwordCredential);
    if (!createResult.ok) return createResult;

    const signInResult = await this.auth.signInWithPassword(phone, passwordCredential);
    if (!signInResult.ok) return signInResult;

    const deviceToken = generateDeviceToken();
    const completeResult = await this.auth.completeRegistration({
      phone,
      pinFingerprint: derivePinFingerprint(phone, params.pin),
      deviceTokenHash: hashDeviceToken(deviceToken),
      userAgent: params.userAgent,
    });
    if (!completeResult.ok) return completeResult;

    return ok({ deviceToken });
  }

  /**
   * Unified login: tries the fast trusted-device path first (existing
   * cookie matches the account's active device, no OTP needed). Falls back
   * to the new-device path only on DEVICE_UNTRUSTED specifically -- never
   * on PIN_LOCKED, which must short-circuit immediately either way.
   *
   * This fallback (rather than the caller choosing a path up front) matters
   * for a real case: a *revoked* device's browser still carries its old,
   * now-mismatched cookie. If the route picked "trusted" purely because a
   * cookie is present, that browser could never recover even after
   * completing OTP -- it would keep hitting DEVICE_UNTRUSTED on the trusted
   * path forever, since presence of a (wrong) cookie would always win.
   * Falling back to the OTP-gated path here is what actually lets it back in.
   *
   * Returns deviceToken: null when the existing trusted device was used (no
   * cookie change needed), or the new raw token when a new device was
   * trusted (the route must set a fresh cookie).
   */
  async login(params: {
    phone: string;
    pin: string;
    deviceToken: string | null;
    userAgent: string;
  }): Promise<Result<{ deviceToken: string | null }, AppError>> {
    const phoneResult = this.parsePhone(params.phone);
    if (!phoneResult.ok) return phoneResult;
    const phone = phoneResult.value;

    const deviceTokenHash = params.deviceToken ? hashDeviceToken(params.deviceToken) : null;
    const trustResult = await this.auth.assertDeviceTrustedForLogin(phone, deviceTokenHash);

    if (trustResult.ok) {
      const signInResult = await this.attemptSignIn(phone, params.pin);
      if (!signInResult.ok) return signInResult;
      return ok({ deviceToken: null });
    }

    if (trustResult.error.code !== "DEVICE_UNTRUSTED") {
      return trustResult;
    }

    const preconditionResult = await this.auth.assertNewDeviceLoginAllowed(phone);
    if (!preconditionResult.ok) return preconditionResult;

    const signInResult = await this.attemptSignIn(phone, params.pin);
    if (!signInResult.ok) return signInResult;

    const deviceToken = generateDeviceToken();
    const rotateResult = await this.auth.rotateDeviceSession(hashDeviceToken(deviceToken), params.userAgent);
    if (!rotateResult.ok) return rotateResult;

    // Best-effort: the new session/device are already correctly set up
    // either way, so a signOut failure here doesn't need to fail the login.
    await this.auth.signOutOtherSessions();

    return ok({ deviceToken });
  }

  private async attemptSignIn(phone: string, pin: string): Promise<Result<void, AppError>> {
    const passwordCredential = derivePasswordCredential(phone, pin);
    const signInResult = await this.auth.signInWithPassword(phone, passwordCredential);

    if (!signInResult.ok) {
      await this.auth.recordPinFailure(phone);
      return signInResult;
    }

    await this.auth.recordPinSuccess(phone);
    return ok(undefined);
  }

  /**
   * PIN change: requires an active session and a recently verified
   * PIN_CHANGE OTP (checked by record_pin_change itself). Reuse is checked
   * before touching the Supabase Auth password, so a rejected change never
   * records a fingerprint for a password that didn't actually change.
   * Resolves the phone from the caller's own session, same as
   * resolvePhoneForOtp -- never from client input, for the same reason.
   */
  async changePin(params: {
    newPin: string;
    confirmNewPin: string;
  }): Promise<Result<void, AppError>> {
    const phoneResult = await this.auth.getOwnPhone();
    if (!phoneResult.ok) return phoneResult;
    const phone = phoneResult.value;

    if (params.newPin !== params.confirmNewPin) {
      return err(appError("PIN_MISMATCH", defaultMessageForErrorCode("PIN_MISMATCH")));
    }

    try {
      assertPinIsStrong(params.newPin, phone);
    } catch (error) {
      if (error instanceof WeakPinError) {
        return err(appError("PIN_WEAK", defaultMessageForErrorCode("PIN_WEAK")));
      }
      throw error;
    }

    const newFingerprint = derivePinFingerprint(phone, params.newPin);

    const reuseResult = await this.auth.assertPinNotReused(newFingerprint);
    if (!reuseResult.ok) return reuseResult;

    const updateResult = await this.auth.updatePassword(derivePasswordCredential(phone, params.newPin));
    if (!updateResult.ok) return updateResult;

    return this.auth.recordPinChange(phone, newFingerprint);
  }
}
