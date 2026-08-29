"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hind_Siliguri, Anek_Bangla, Baloo_Da_2, JetBrains_Mono } from "next/font/google";
import {
  Banknote,
  ShieldCheck,
  Languages,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  Smartphone,
  Lock,
  RotateCcw,
  ArrowLeft,
  Delete,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  AUTH_COPY,
  DEMO_OTP,
  fillTemplate,
  isValidPhone,
  isWeakPin,
  type AuthMode,
  type Locale,
} from "@/components/auth/auth-content";
import "@/components/auth/auth.css";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  weight: ["400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
});

const anekBangla = Anek_Bangla({
  variable: "--font-anek-bangla",
  subsets: ["bengali", "latin"],
});

const balooDa2 = Baloo_Da_2({
  variable: "--font-baloo-da-2",
  weight: ["500", "600", "700"],
  subsets: ["bengali", "latin"],
});

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--au-font-mono" });

const headingFontFamily =
  "var(--font-baloo-da-2), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

// JetBrains Mono has no Bengali glyphs, so digits/labels in Bangla fall
// through to Anek Bangla/Hind Siliguri instead of an unstyled system font.
const monoFontFamily =
  "var(--au-font-mono), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

type Step = "phone" | "otp" | "pin" | "confirm" | "done";

const EMPTY_OTP = ["", "", "", "", "", ""];

export function AuthFlow({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [locale, setLocale] = useState<Locale>("bn");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [resend, setResend] = useState(30);
  const [redirect, setRedirect] = useState(4);

  const t = AUTH_COPY[locale];
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (resendTimer.current) clearInterval(resendTimer.current);
      if (redirectTimer.current) clearInterval(redirectTimer.current);
    },
    [],
  );

  function num(n: number) {
    return n.toLocaleString(locale === "en" ? "en-US" : "bn-BD");
  }

  function startResend() {
    if (resendTimer.current) clearInterval(resendTimer.current);
    setResend(30);
    resendTimer.current = setInterval(() => {
      setResend((s) => {
        if (s <= 1) {
          if (resendTimer.current) clearInterval(resendTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function finish() {
    if (redirectTimer.current) clearInterval(redirectTimer.current);
    setStep("done");
    setError("");
    setRedirect(4);
    redirectTimer.current = setInterval(() => {
      setRedirect((s) => {
        if (s <= 1) {
          if (redirectTimer.current) clearInterval(redirectTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    if (step === "done" && redirect === 0) router.push("/dashboard");
  }, [step, redirect, router]);

  function submitPhone() {
    const digits = phone.replace(/\D/g, "");
    if (!isValidPhone(digits)) {
      setError(t.errPhone);
      return;
    }
    setError("");
    if (isLogin) {
      setPin("");
      setStep("pin");
    } else {
      setOtp(EMPTY_OTP);
      setStep("otp");
      startResend();
      setTimeout(() => otpRefs.current[0]?.focus(), 60);
    }
  }

  function onOtpChange(i: number, rawValue: string) {
    const v = rawValue.replace(/\D/g, "").slice(-1);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();

    setOtp((prev) => {
      const next = [...prev];
      next[i] = v;
      const code = next.join("");
      if (code.length === 6) {
        if (code === DEMO_OTP) {
          if (resendTimer.current) clearInterval(resendTimer.current);
          setPin("");
          setPin2("");
          setError("");
          setStep("pin");
        } else {
          setError(t.errOtp);
          setTimeout(() => otpRefs.current[0]?.focus(), 0);
          return EMPTY_OTP;
        }
      } else {
        setError("");
      }
      return next;
    });
  }

  function onOtpKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  }

  function resendOtp() {
    if (resend === 0) {
      setOtp(EMPTY_OTP);
      setError("");
      startResend();
    }
  }

  function backToPhone() {
    if (resendTimer.current) clearInterval(resendTimer.current);
    setStep("phone");
    setError("");
  }

  function press(digit: string) {
    if (step === "confirm") {
      if (pin2.length >= 4) return;
      const next = pin2 + digit;
      setPin2(next);
      setError("");
      if (next.length === 4) {
        if (next === pin) {
          setTimeout(() => finish(), 180);
        } else {
          setTimeout(() => {
            setStep("pin");
            setPin("");
            setPin2("");
            setError(t.errPin);
          }, 180);
        }
      }
      return;
    }

    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError("");
    if (next.length === 4) {
      if (isLogin) {
        setTimeout(() => finish(), 180);
      } else if (isWeakPin(next, phone)) {
        setTimeout(() => {
          setPin("");
          setError(t.errPinWeak);
        }, 180);
      } else {
        setTimeout(() => {
          setStep("confirm");
          setPin2("");
          setError("");
        }, 180);
      }
    }
  }

  function pinDelete() {
    if (step === "confirm") setPin2((p) => p.slice(0, -1));
    else setPin((p) => p.slice(0, -1));
  }

  function pinBack() {
    if (step === "confirm") {
      setStep("pin");
      setPin("");
      setPin2("");
      setError("");
    } else if (isLogin) {
      setStep("phone");
      setPin("");
      setError("");
    } else {
      setStep("otp");
      setPin("");
      setOtp(EMPTY_OTP);
      setError("");
      startResend();
    }
  }

  const stepIndex = { phone: 0, otp: 1, pin: isLogin ? 1 : 2, confirm: 2, done: 3 }[step];
  const stepLabels = isLogin ? [t.stepPhone, t.stepPin] : [t.stepPhone, t.stepOtp, t.stepPin];
  const pinBuffer = step === "confirm" ? pin2 : pin;
  const [pinTitle, pinSub] =
    step === "confirm"
      ? [t.pinConfirmTitle, t.pinConfirmSub]
      : isLogin
        ? [t.pinLoginTitle, t.pinLoginSub]
        : [t.pinSetTitle, t.pinSetSub];

  const onTabStyle = { background: "var(--au-card)", color: "var(--au-fg)" };
  const offTabStyle = { background: "transparent", color: "var(--au-muted-fg)" };
  const onLocaleStyle = { background: "var(--au-secondary)", color: "var(--au-fg)" };
  const offLocaleStyle = { background: "transparent", color: "var(--au-muted-fg)" };

  return (
    <div
      data-theme={theme}
      lang={locale}
      className={`au-auth ${hindSiliguri.variable} ${anekBangla.variable} ${balooDa2.variable} ${jetBrainsMono.variable}`}
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif",
      }}
    >
      <aside
        data-el="brand"
        style={{
          flex: "0 0 42%",
          backgroundImage: "var(--au-grad)",
          color: "var(--au-on-grad)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 40,
          padding: "clamp(28px, 4vw, 48px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--au-accent)",
              color: "var(--au-accent-fg)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Banknote size={19} strokeWidth={2} aria-hidden="true" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontFamily: headingFontFamily, fontSize: 16, fontWeight: 700 }}>
              {t.brand}
            </span>
            <span style={{ fontSize: 11.5, opacity: 0.8 }}>{t.tagline}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: "40ch" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: headingFontFamily,
              fontSize: "clamp(26px, 2.8vw, 36px)",
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              textWrap: "pretty",
            }}
          >
            {t.brandTitle}
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, opacity: 0.85, textWrap: "pretty" }}>
            {t.brandSub}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {t.brandPoints.map((text) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
              <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "clamp(16px, 3vw, 28px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: 3,
              gap: 3,
              border: "1px solid var(--au-border)",
              borderRadius: 9,
            }}
          >
            <Languages
              size={15}
              strokeWidth={2}
              color="var(--au-muted-fg)"
              aria-hidden="true"
              style={{ margin: "0 3px 0 6px" }}
            />
            <button
              type="button"
              data-testid="locale-toggle-bn"
              onClick={() => setLocale("bn")}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                ...(locale === "bn" ? onLocaleStyle : offLocaleStyle),
              }}
            >
              বাংলা
            </button>
            <button
              type="button"
              data-testid="locale-toggle-en"
              onClick={() => setLocale("en")}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                ...(locale === "en" ? onLocaleStyle : offLocaleStyle),
              }}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={() => setTheme((s) => (s === "light" ? "dark" : "light"))}
            title={t.themeToggle}
            className="au-icon-btn"
            style={{
              cursor: "pointer",
              width: 36,
              height: 36,
              borderRadius: 9,
              border: "1px solid var(--au-border)",
              background: "transparent",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Moon size={16} strokeWidth={2} aria-hidden="true" data-icon="moon" />
            <Sun size={16} strokeWidth={2} aria-hidden="true" data-icon="sun" />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px, 3vw, 32px) 0" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--au-card)",
              border: "1px solid var(--au-border)",
              borderRadius: 18,
              padding: "clamp(22px, 3vw, 30px)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              boxSizing: "border-box",
            }}
          >
            {step !== "done" && (
              <>
                <div style={{ display: "flex", padding: 3, gap: 3, background: "var(--au-muted)", borderRadius: 11 }}>
                  <Link
                    href="/login"
                    data-testid="auth-tab-login"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 0",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      ...(isLogin ? onTabStyle : offTabStyle),
                    }}
                  >
                    <LogIn size={15} strokeWidth={2} aria-hidden="true" />
                    <span>{t.tabLogin}</span>
                  </Link>
                  <Link
                    href="/register"
                    data-testid="auth-tab-signup"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 0",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      ...(isLogin ? offTabStyle : onTabStyle),
                    }}
                  >
                    <UserPlus size={15} strokeWidth={2} aria-hidden="true" />
                    <span>{t.tabSignup}</span>
                  </Link>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {stepLabels.map((label, i) => (
                    <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <span
                        style={{
                          height: 4,
                          borderRadius: 999,
                          background: i <= stepIndex ? "var(--au-primary)" : "var(--au-muted)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: i <= stepIndex ? "var(--au-primary)" : "var(--au-muted-fg)",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === "phone" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {isLogin ? t.phoneTitleLogin : t.phoneTitleSignup}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--au-muted-fg)", lineHeight: 1.5 }}>
                    {isLogin ? t.phoneSubLogin : t.phoneSubSignup}
                  </span>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t.phoneLabel}</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "0 13px",
                      borderRadius: 10,
                      border: "1px solid var(--au-field-border)",
                      background: "var(--au-field)",
                    }}
                  >
                    <Smartphone size={16} strokeWidth={2} color="var(--au-muted-fg)" aria-hidden="true" />
                    <span style={{ fontFamily: monoFontFamily, fontSize: 14, color: "var(--au-muted-fg)" }}>
                      +88
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError("");
                      }}
                      placeholder="01XXX-XXXXXX"
                      inputMode="tel"
                      data-testid="auth-phone-input"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "13px 0",
                        border: "none",
                        background: "transparent",
                        color: "var(--au-fg)",
                        fontFamily: monoFontFamily,
                        fontSize: 15,
                        outline: "none",
                      }}
                    />
                  </span>
                </label>
                {error && (
                  <div
                    style={{
                      padding: "10px 13px",
                      borderRadius: 9,
                      background: "var(--au-debit-surface)",
                      color: "var(--au-debit)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={submitPhone}
                  data-testid="auth-phone-submit"
                  className="au-btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    border: "none",
                    cursor: "pointer",
                    padding: "14px 0",
                    borderRadius: 11,
                    background: "var(--au-primary)",
                    color: "var(--au-primary-fg)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>{isLogin ? t.continueBtn : t.sendOtp}</span>
                </button>
              </>
            )}

            {step === "otp" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {t.otpTitle}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--au-muted-fg)", lineHeight: 1.5 }}>
                    {fillTemplate(t.otpSub, { phone: phone.replace(/\D/g, "") })}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      value={v}
                      onChange={(e) => onOtpChange(i, e.target.value)}
                      onKeyDown={(e) => onOtpKeyDown(i, e)}
                      inputMode="numeric"
                      maxLength={1}
                      data-testid={`auth-otp-input-${i}`}
                      className="au-otp-input"
                      style={{
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                        textAlign: "center",
                        padding: "14px 0",
                        borderRadius: 10,
                        border: "1px solid var(--au-field-border)",
                        background: "var(--au-field)",
                        color: "var(--au-fg)",
                        fontFamily: monoFontFamily,
                        fontSize: 19,
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "6px 11px",
                      borderRadius: 999,
                      background: "var(--au-credit-surface)",
                      color: "var(--au-credit)",
                      fontFamily: monoFontFamily,
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    {t.demoOtp}
                  </span>
                  <button
                    type="button"
                    onClick={resendOtp}
                    data-testid="auth-otp-resend"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      cursor: "pointer",
                      background: "transparent",
                      padding: "6px 0",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: resend > 0 ? "var(--au-muted-fg)" : "var(--au-primary)",
                    }}
                  >
                    <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{resend > 0 ? fillTemplate(t.resendIn, { s: num(resend) }) : t.resendNow}</span>
                  </button>
                </div>
                {error && (
                  <div
                    style={{
                      padding: "10px 13px",
                      borderRadius: 9,
                      background: "var(--au-debit-surface)",
                      color: "var(--au-debit)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={backToPhone}
                  data-testid="auth-otp-back"
                  className="au-hover-fg"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "11px 0",
                    borderRadius: 10,
                    background: "transparent",
                    border: "1px solid var(--au-border)",
                    color: "var(--au-muted-fg)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
                  <span>{t.back}</span>
                </button>
              </>
            )}

            {(step === "pin" || step === "confirm") && (
              <>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--au-secondary)",
                      color: "var(--au-secondary-fg)",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Lock size={19} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {pinTitle}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--au-muted-fg)", lineHeight: 1.5 }}>{pinSub}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 14, padding: "6px 0" }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        border: "2px solid var(--au-primary)",
                        boxSizing: "border-box",
                        background: i < pinBuffer.length ? "var(--au-primary)" : "transparent",
                      }}
                    />
                  ))}
                </div>
                {error && (
                  <div
                    style={{
                      padding: "10px 13px",
                      borderRadius: 9,
                      background: "var(--au-debit-surface)",
                      color: "var(--au-debit)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.45,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => press(d)}
                      data-testid={`auth-pin-key-${d}`}
                      className="au-key"
                      style={{
                        minHeight: 54,
                        borderRadius: 12,
                        border: "1px solid var(--au-field-border)",
                        background: "var(--au-field)",
                        color: "var(--au-fg)",
                        fontFamily: monoFontFamily,
                        fontSize: 19,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={pinBack}
                    data-testid="auth-pin-back"
                    className="au-hover-fg"
                    style={{
                      minHeight: 54,
                      borderRadius: 12,
                      border: "1px solid var(--au-border)",
                      background: "transparent",
                      color: "var(--au-muted-fg)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => press("0")}
                    data-testid="auth-pin-key-0"
                    className="au-key"
                    style={{
                      minHeight: 54,
                      borderRadius: 12,
                      border: "1px solid var(--au-field-border)",
                      background: "var(--au-field)",
                      color: "var(--au-fg)",
                      fontFamily: monoFontFamily,
                      fontSize: 19,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={pinDelete}
                    data-testid="auth-pin-delete"
                    className="au-key-delete"
                    style={{
                      minHeight: 54,
                      borderRadius: 12,
                      border: "1px solid var(--au-border)",
                      background: "transparent",
                      color: "var(--au-muted-fg)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Delete size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}

            {step === "done" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "14px 0 4px" }}>
                <span
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: "50%",
                    background: "var(--au-credit-surface)",
                    color: "var(--au-credit)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Check size={32} strokeWidth={2} aria-hidden="true" />
                </span>
                <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {isLogin ? t.doneTitleLogin : t.doneTitleSignup}
                </h2>
                <span style={{ fontSize: 13.5, color: "var(--au-muted-fg)", lineHeight: 1.55, maxWidth: "30ch" }}>
                  {isLogin ? t.doneSubLogin : t.doneSubSignup}
                </span>
                <span style={{ fontFamily: monoFontFamily, fontSize: 12, color: "var(--au-muted-fg)" }}>
                  {fillTemplate(t.redirecting, { s: num(redirect) })}
                </span>
                <Link
                  href="/dashboard"
                  data-testid="auth-go-dashboard"
                  className="au-btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "14px 0",
                    borderRadius: 11,
                    background: "var(--au-primary)",
                    color: "var(--au-primary-fg)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>{t.goNow}</span>
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
