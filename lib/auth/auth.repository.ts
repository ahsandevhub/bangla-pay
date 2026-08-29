import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Result, ok, err } from "@/lib/shared/result";
import {
  type AppError,
  appError,
  defaultMessageForErrorCode,
  isAppErrorCode,
} from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";
import type { DemoSmsMessage, OtpPurpose } from "@/lib/auth/auth.types";

export interface AuthRepository {
  getOwnPhone(): Promise<Result<string, AppError>>;
  isPhoneRegistered(phone: string): Promise<Result<boolean, AppError>>;
  sendOtp(phone: string, purpose: OtpPurpose): Promise<Result<string, AppError>>;
  readDemoSms(inboxToken: string): Promise<Result<DemoSmsMessage | null, AppError>>;
  verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<Result<void, AppError>>;

  createAuthUser(phone: string, passwordCredential: string): Promise<Result<string, AppError>>;
  signInWithPassword(phone: string, passwordCredential: string): Promise<Result<void, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
  signOutOtherSessions(): Promise<Result<void, AppError>>;
  updatePassword(newPasswordCredential: string): Promise<Result<void, AppError>>;

  completeRegistration(params: {
    phone: string;
    pinFingerprint: string;
    deviceTokenHash: string;
    userAgent: string;
  }): Promise<Result<void, AppError>>;

  assertDeviceTrustedForLogin(phone: string, deviceTokenHash: string | null): Promise<Result<void, AppError>>;
  assertNewDeviceLoginAllowed(phone: string): Promise<Result<void, AppError>>;
  assertNotPinLocked(phone: string): Promise<Result<void, AppError>>;
  recordPinFailure(phone: string): Promise<Result<void, AppError>>;
  recordPinSuccess(phone: string): Promise<Result<void, AppError>>;
  refreshActiveSession(): Promise<Result<void, AppError>>;
  rotateDeviceSession(newDeviceTokenHash: string, userAgent: string): Promise<Result<void, AppError>>;
  assertPinNotReused(newFingerprint: string): Promise<Result<void, AppError>>;
  recordPinChange(phone: string, newFingerprint: string): Promise<Result<void, AppError>>;
}

export class SupabaseAuthRepository implements AuthRepository {
  /**
   * @param client Request-scoped client (respects RLS/session cookies) for
   *   every RPC call and for signIn/signOut/updateUser -- those must run as
   *   the actual browser session so GoTrue sets/clears the right cookies.
   * @param adminClient Service-role client, used only to create the
   *   auth.users row during registration (no session exists yet to do it as).
   */
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly adminClient: SupabaseClient<Database>,
  ) {}

  async getOwnPhone(): Promise<Result<string, AppError>> {
    const { data: userData, error: userError } = await this.client.auth.getClaims();
    const userId = userData?.claims.sub;
    if (userError || !userId) {
      return err(appError("UNAUTHENTICATED", defaultMessageForErrorCode("UNAUTHENTICATED")));
    }

    // RLS (profiles_select_own) scopes this to the caller's own row.
    const { data, error } = await this.client
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .maybeSingle();

    if (error) return err(appErrorFromSupabaseError(error));
    if (!data) return err(appError("ACCOUNT_NOT_FOUND", defaultMessageForErrorCode("ACCOUNT_NOT_FOUND")));
    return ok(data.phone);
  }

  async isPhoneRegistered(phone: string): Promise<Result<boolean, AppError>> {
    const { data, error } = await this.client.rpc("is_phone_registered", { p_phone: phone });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(data);
  }

  async sendOtp(phone: string, purpose: OtpPurpose): Promise<Result<string, AppError>> {
    const { data, error } = await this.client.rpc("request_otp", { p_phone: phone, p_purpose: purpose });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(data);
  }

  async readDemoSms(inboxToken: string): Promise<Result<DemoSmsMessage | null, AppError>> {
    const { data, error } = await this.client.rpc("read_demo_sms", { p_inbox_token: inboxToken });
    if (error) return err(appErrorFromSupabaseError(error));
    const row = data?.[0];
    if (!row) return ok(null);
    return ok({ code: row.code, purpose: row.purpose, expiresAt: row.expires_at });
  }

  async verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<Result<void, AppError>> {
    const { data, error } = await this.client.rpc("verify_otp", {
      p_phone: phone,
      p_purpose: purpose,
      p_code: code,
    });
    if (error) return err(appErrorFromSupabaseError(error));

    const row = data?.[0];
    if (row?.verified) return ok(undefined);

    // verify_otp returns a result row rather than raising, per the comment
    // on that function -- see supabase/migrations/20260829140000_otp_functions.sql.
    const failureCode = row?.failure_code;
    if (failureCode && isAppErrorCode(failureCode)) {
      return err(appError(failureCode, defaultMessageForErrorCode(failureCode)));
    }
    return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
  }

  async createAuthUser(phone: string, passwordCredential: string): Promise<Result<string, AppError>> {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      phone: toGoTruePhone(phone),
      password: passwordCredential,
      phone_confirm: true,
    });
    if (error || !data.user) {
      if (error?.code === "phone_exists") {
        return err(appError("PHONE_ALREADY_REGISTERED", defaultMessageForErrorCode("PHONE_ALREADY_REGISTERED")));
      }
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }
    return ok(data.user.id);
  }

  async signInWithPassword(phone: string, passwordCredential: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.signInWithPassword({
      phone: toGoTruePhone(phone),
      password: passwordCredential,
    });
    if (error) {
      return err(appError("PIN_INVALID", defaultMessageForErrorCode("PIN_INVALID")));
    }
    return ok(undefined);
  }

  // "local" scope only clears this browser's own session -- unlike
  // signOutOtherSessions()'s "others" scope, a plain sign-out must never
  // revoke the caller's own trusted device/active session, or the very next
  // login from this same browser would incorrectly look untrusted.
  async signOut(): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.signOut({ scope: "local" });
    if (error) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }
    return ok(undefined);
  }

  async signOutOtherSessions(): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.signOut({ scope: "others" });
    if (error) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }
    return ok(undefined);
  }

  async updatePassword(newPasswordCredential: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.updateUser({ password: newPasswordCredential });
    if (error) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }
    return ok(undefined);
  }

  async completeRegistration(params: {
    phone: string;
    pinFingerprint: string;
    deviceTokenHash: string;
    userAgent: string;
  }): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("complete_registration", {
      p_phone: params.phone,
      p_pin_fingerprint: params.pinFingerprint,
      p_device_token_hash: params.deviceTokenHash,
      p_user_agent: params.userAgent,
    });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async assertDeviceTrustedForLogin(phone: string, deviceTokenHash: string | null): Promise<Result<void, AppError>> {
    // The generated Args type doesn't mark p_device_token_hash nullable, but
    // the Postgres param is a nullable text -- see analogous notes in
    // money.repository.ts/request.repository.ts for the same codegen gap.
    const { error } = await this.client.rpc("assert_device_trusted_for_login", {
      p_phone: phone,
      p_device_token_hash: deviceTokenHash as string,
    });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async assertNewDeviceLoginAllowed(phone: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("assert_new_device_login_allowed", { p_phone: phone });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async assertNotPinLocked(phone: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("assert_not_pin_locked", { p_phone: phone });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async recordPinFailure(phone: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("record_pin_failure", { p_phone: phone });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async recordPinSuccess(phone: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("record_pin_success", { p_phone: phone });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async refreshActiveSession(): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("refresh_active_session");
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async rotateDeviceSession(newDeviceTokenHash: string, userAgent: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("rotate_device_session", {
      p_new_device_token_hash: newDeviceTokenHash,
      p_user_agent: userAgent,
    });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async assertPinNotReused(newFingerprint: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("assert_pin_not_reused", { p_new_fingerprint: newFingerprint });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }

  async recordPinChange(phone: string, newFingerprint: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.rpc("record_pin_change", {
      p_phone: phone,
      p_new_fingerprint: newFingerprint,
    });
    if (error) return err(appErrorFromSupabaseError(error));
    return ok(undefined);
  }
}

/**
 * GoTrue stores/looks up phone identities without a leading "+" (verified
 * empirically: admin.createUser({phone: "+8801..."}) persists auth.users.phone
 * as "8801..." with no plus, so a later signInWithPassword({phone: "+8801..."})
 * cannot find that user and fails as invalid credentials). Our own canonical
 * phone format (with "+") stays the source of truth everywhere else --
 * profiles.phone, otp_challenges, every RPC -- only calls that cross into
 * GoTrue need this stripped.
 */
function toGoTruePhone(canonicalPhone: string): string {
  return canonicalPhone.replace(/^\+/, "");
}
