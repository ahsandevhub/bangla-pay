export type OtpPurpose = "REGISTRATION" | "DEVICE_LOGIN" | "PIN_CHANGE";

export type DemoSmsMessage = {
  code: string;
  purpose: OtpPurpose;
  expiresAt: string;
};

export type NewDeviceSession = {
  /** Raw token for the trusted-device cookie; only its hash is ever persisted. */
  deviceToken: string;
};
