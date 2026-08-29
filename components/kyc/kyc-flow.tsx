"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Hind_Siliguri, Anek_Bangla, Baloo_Da_2, JetBrains_Mono } from "next/font/google";
import {
  Banknote,
  ShieldCheck,
  Languages,
  Sun,
  Moon,
  ScanLine,
  CircleCheck,
  EyeOff,
  Camera,
  Upload,
  IdCard,
  Check,
  Image as ImageIcon,
  RotateCw,
  RefreshCw,
  X,
  TriangleAlert,
  Scale,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  DEMO,
  KYC_COPY,
  fillTemplate,
  type Locale,
  type ResultMode,
} from "@/components/kyc/kyc-content";
import "@/components/kyc/kyc.css";

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

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--ky-font-mono" });

const headingFontFamily =
  "var(--font-baloo-da-2), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

type Step = "intro" | "capture" | "scanning" | "review" | "verifying" | "success" | "error";
type ErrorKind = "" | ResultMode;

const RESULT_MODES: ResultMode[] = ["success", "mismatch", "duplicate", "unclear", "rate-limited"];

export function KycFlow() {
  const searchParams = useSearchParams();
  const resultParam = searchParams.get("result");
  const resultMode: ResultMode = RESULT_MODES.includes(resultParam as ResultMode)
    ? (resultParam as ResultMode)
    : "success";

  const [locale, setLocaleState] = useState<Locale>("bn");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [step, setStep] = useState<Step>("intro");
  const [imageUrl, setImageUrl] = useState("");
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [fNid, setFNid] = useState(DEMO.nid);
  const [fDob, setFDob] = useState(DEMO.dob.bn);
  const [fNameBn, setFNameBn] = useState(DEMO.nameBn);
  const [fNameEn, setFNameEn] = useState(DEMO.nameEn);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind>("");
  const [checksDone, setChecksDone] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const t = KYC_COPY[locale];
  const fileRef = useRef<HTMLInputElement | null>(null);
  const ocrTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearAll() {
    if (ocrTimer.current) clearInterval(ocrTimer.current);
    if (checkTimer.current) clearInterval(checkTimer.current);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    if (stepTimeout.current) clearTimeout(stepTimeout.current);
  }

  useEffect(() => clearAll, []);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  function num(n: number) {
    return n.toLocaleString(locale === "en" ? "en-US" : "bn-BD");
  }

  function setLocale(next: Locale) {
    setFDob((prev) => (prev === DEMO.dob[locale] ? DEMO.dob[next] : prev));
    setLocaleState(next);
    setError("");
  }

  function pickImage(url: string) {
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setRotation(0);
    setError("");
    setDragging(false);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickImage(URL.createObjectURL(file));
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && /^image\//.test(file.type)) {
      pickImage(URL.createObjectURL(file));
    } else {
      setDragging(false);
      setError(t.errNoImage);
    }
  }

  function retake() {
    setStep("capture");
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setRotation(0);
    setConsent(false);
    setError("");
  }

  function runOcr() {
    clearAll();
    setStep("scanning");
    setProgress(0);
    setStage(0);
    setError("");
    ocrTimer.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + 4);
        setStage(Math.min(3, Math.floor(next / 26)));
        if (next >= 100) {
          if (ocrTimer.current) clearInterval(ocrTimer.current);
          stepTimeout.current = setTimeout(() => {
            if (resultMode === "unclear") fail("unclear");
            else {
              setStep("review");
              setError("");
            }
          }, 400);
        }
        return next;
      });
    }, 90);
  }

  function verify() {
    if (!/^\d{10}$/.test(fNid.trim()) || !fDob.trim() || !fNameBn.trim() || !fNameEn.trim()) {
      setError(t.errFields);
      return;
    }
    if (!consent) {
      setError(t.errConsent);
      return;
    }
    clearAll();
    setStep("verifying");
    setChecksDone(0);
    setError("");
    checkTimer.current = setInterval(() => {
      setChecksDone((prev) => {
        const next = Math.min(3, prev + 1);
        if (next >= 3) {
          if (checkTimer.current) clearInterval(checkTimer.current);
          stepTimeout.current = setTimeout(() => {
            if (resultMode === "success") setStep("success");
            else fail(resultMode);
          }, 600);
        }
        return next;
      });
    }, 750);
  }

  function fail(kind: ResultMode) {
    clearAll();
    setStep("error");
    setErrorKind(kind);
    setError("");
    if (kind === "rate-limited") {
      setCooldown(60);
      cooldownTimer.current = setInterval(() => {
        setCooldown((s) => {
          if (s <= 1) {
            if (cooldownTimer.current) clearInterval(cooldownTimer.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
  }

  const stepIndex = 3;
  const errorCopy: Record<ResultMode, [string, string]> = {
    success: ["", ""],
    mismatch: [t.mismatchTitle, t.mismatchBody],
    duplicate: [t.duplicateTitle, t.duplicateBody],
    unclear: [t.unclearTitle, t.unclearBody],
    "rate-limited": [t.rateTitle, t.rateBody],
  };
  const [errTitle, errBody] = errorKind ? errorCopy[errorKind] : ["", ""];

  const onLocaleStyle = { background: "var(--ky-secondary)", color: "var(--ky-fg)" };
  const offLocaleStyle = { background: "transparent", color: "var(--ky-muted-fg)" };

  const fieldLabelStyle = { fontSize: 12.5, fontWeight: 600 } as const;
  const fieldInputBaseStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    minHeight: 46,
    padding: "12px 13px",
    borderRadius: 10,
    background: "var(--ky-field)",
    color: "var(--ky-fg)",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div
      data-theme={theme}
      lang={locale}
      className={`ky-kyc ${hindSiliguri.variable} ${anekBangla.variable} ${balooDa2.variable} ${jetBrainsMono.variable}`}
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
          backgroundImage: "var(--ky-grad)",
          color: "var(--ky-on-grad)",
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
              background: "var(--ky-accent)",
              color: "var(--ky-accent-fg)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Banknote size={19} strokeWidth={2} aria-hidden="true" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontFamily: headingFontFamily, fontSize: 16, fontWeight: 700 }}>{t.brand}</span>
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

      <main
        data-el="pane"
        style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "clamp(16px, 3vw, 28px)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: 3,
              gap: 3,
              border: "1px solid var(--ky-border)",
              borderRadius: 9,
            }}
          >
            <Languages
              size={15}
              strokeWidth={2}
              color="var(--ky-muted-fg)"
              aria-hidden="true"
              style={{ margin: "0 3px 0 6px" }}
            />
            <button
              type="button"
              data-testid="locale-bn"
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
              data-testid="locale-en"
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
            className="ky-icon-btn"
            style={{
              cursor: "pointer",
              width: 36,
              height: 36,
              borderRadius: 9,
              border: "1px solid var(--ky-border)",
              background: "transparent",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Moon size={16} strokeWidth={2} aria-hidden="true" data-icon="moon" />
            <Sun size={16} strokeWidth={2} aria-hidden="true" data-icon="sun" />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(14px, 3vw, 30px) 0" }}>
          <div
            data-el="card"
            style={{
              width: "100%",
              maxWidth: 560,
              background: "var(--ky-card)",
              border: "1px solid var(--ky-border)",
              borderRadius: 18,
              padding: "clamp(20px, 3vw, 30px)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              boxSizing: "border-box",
            }}
          >
            {step !== "success" && step !== "error" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {t.steps.map((label, i) => (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: i <= stepIndex ? "var(--ky-primary)" : "var(--ky-muted)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color: i === stepIndex ? "var(--ky-primary)" : "var(--ky-muted-fg)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {step === "intro" && (
              <div data-testid="kyc-intro" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      alignSelf: "flex-start",
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "var(--ky-accent-surface)",
                      color: "var(--ky-accent-fg)",
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    <ScanLine size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{t.demoBadge}</span>
                  </span>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 21, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {t.introTitle}
                  </h2>
                  <span style={{ fontSize: 13.5, color: "var(--ky-muted-fg)", lineHeight: 1.55 }}>{t.introSub}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--ky-fg)", textWrap: "pretty" }}>
                  {t.introExplain}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {t.trustPoints.map((text) => (
                    <div
                      key={text}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--ky-field)",
                        border: "1px solid var(--ky-border)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <CircleCheck size={15} strokeWidth={2} color="var(--ky-credit)" aria-hidden="true" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <div
                  data-testid="kyc-privacy-note"
                  style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 13px", borderRadius: 10, background: "var(--ky-muted)" }}
                >
                  <EyeOff size={15} strokeWidth={2} color="var(--ky-muted-fg)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ky-muted-fg)", textWrap: "pretty" }}>{t.privacy}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("capture");
                      setError("");
                    }}
                    data-testid="start-nid-scan"
                    className="ky-btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 9,
                      minHeight: 48,
                      border: "none",
                      cursor: "pointer",
                      padding: "13px 0",
                      borderRadius: 11,
                      background: "var(--ky-primary)",
                      color: "var(--ky-primary-fg)",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <Camera size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{t.scanNid}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("capture");
                      setError("");
                      setTimeout(() => fileRef.current?.click(), 80);
                    }}
                    data-testid="upload-nid-image"
                    className="ky-btn-outline"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 9,
                      minHeight: 48,
                      cursor: "pointer",
                      padding: "13px 0",
                      borderRadius: 11,
                      background: "transparent",
                      border: "1px solid var(--ky-field-border)",
                      color: "var(--ky-fg)",
                      fontSize: 13.5,
                      fontWeight: 700,
                    }}
                  >
                    <Upload size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{t.uploadImage}</span>
                  </button>
                </div>
              </div>
            )}

            {step === "capture" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {t.captureTitle}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--ky-muted-fg)", lineHeight: 1.5 }}>{t.captureSub}</span>
                </div>

                <div
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  data-testid="nid-dropzone"
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1.58 / 1",
                    borderRadius: 14,
                    border: `1px dashed ${dragging ? "var(--ky-primary)" : "var(--ky-field-border)"}`,
                    background: "var(--ky-field)",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={t.previewAlt}
                      data-testid="nid-preview"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: `rotate(${rotation}deg)`,
                        transition: "transform 0.25s ease",
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 18, textAlign: "center" }}>
                      <div
                        style={{
                          width: "78%",
                          aspectRatio: "1.58 / 1",
                          borderRadius: 10,
                          border: "1px solid var(--ky-field-border)",
                          backgroundImage:
                            "repeating-linear-gradient(135deg, var(--ky-stripe) 0 8px, transparent 8px 16px)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <IdCard size={30} strokeWidth={2} color="var(--ky-muted-fg)" aria-hidden="true" />
                      </div>
                      <span style={{ fontFamily: "var(--ky-font-mono)", fontSize: 11.5, color: "var(--ky-muted-fg)" }}>
                        {t.placeholderHint}
                      </span>
                    </div>
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      width: 26,
                      height: 26,
                      borderTop: "2px solid var(--ky-accent)",
                      borderLeft: "2px solid var(--ky-accent)",
                      borderRadius: "6px 0 0 0",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 26,
                      height: 26,
                      borderTop: "2px solid var(--ky-accent)",
                      borderRight: "2px solid var(--ky-accent)",
                      borderRadius: "0 6px 0 0",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: 10,
                      left: 10,
                      width: 26,
                      height: 26,
                      borderBottom: "2px solid var(--ky-accent)",
                      borderLeft: "2px solid var(--ky-accent)",
                      borderRadius: "0 0 0 6px",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      width: 26,
                      height: 26,
                      borderBottom: "2px solid var(--ky-accent)",
                      borderRight: "2px solid var(--ky-accent)",
                      borderRadius: "0 0 6px 0",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {t.captureTips.map((text) => (
                    <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "var(--ky-muted-fg)", lineHeight: 1.5 }}>
                      <Check size={14} strokeWidth={2} color="var(--ky-credit)" aria-hidden="true" style={{ marginTop: 3, flexShrink: 0 }} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div role="alert" style={{ padding: "10px 13px", borderRadius: 9, background: "var(--ky-debit-surface)", color: "var(--ky-debit)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  <label
                    data-testid="nid-file-label"
                    className="ky-btn-outline"
                    style={{
                      flex: "1 1 47%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 46,
                      cursor: "pointer",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--ky-field-border)",
                      background: "var(--ky-field)",
                      fontSize: 13,
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  >
                    <ImageIcon size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{imageUrl ? t.changeImage : t.pickImage}</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={onFile}
                      data-testid="nid-file-input"
                      style={{ display: "none" }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      fileRef.current?.click();
                    }}
                    data-testid="nid-camera-button"
                    className="ky-btn-outline"
                    style={{
                      flex: "1 1 47%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 46,
                      cursor: "pointer",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--ky-field-border)",
                      background: "var(--ky-field)",
                      color: "var(--ky-fg)",
                      fontSize: 13,
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  >
                    <Camera size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{t.useCamera}</span>
                  </button>
                  {imageUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        data-testid="rotate-nid"
                        className="ky-hover-fg"
                        style={{
                          flex: "1 1 47%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 46,
                          cursor: "pointer",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--ky-field-border)",
                          background: "transparent",
                          color: "var(--ky-muted-fg)",
                          fontSize: 13,
                          fontWeight: 700,
                          boxSizing: "border-box",
                        }}
                      >
                        <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
                        <span>{t.rotate}</span>
                      </button>
                      <button
                        type="button"
                        onClick={retake}
                        data-testid="replace-nid"
                        className="ky-hover-fg"
                        style={{
                          flex: "1 1 47%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 46,
                          cursor: "pointer",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--ky-field-border)",
                          background: "transparent",
                          color: "var(--ky-muted-fg)",
                          fontSize: 13,
                          fontWeight: 700,
                          boxSizing: "border-box",
                        }}
                      >
                        <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
                        <span>{t.retake}</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!imageUrl) {
                      setError(t.errNoImage);
                      return;
                    }
                    runOcr();
                  }}
                  data-testid="start-ocr"
                  className="ky-btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    minHeight: 48,
                    border: "none",
                    cursor: "pointer",
                    padding: "13px 0",
                    borderRadius: 11,
                    background: "var(--ky-primary)",
                    color: "var(--ky-primary-fg)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <ScanLine size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t.readInfo}</span>
                </button>
              </div>
            )}

            {step === "scanning" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {t.scanningTitle}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--ky-muted-fg)", lineHeight: 1.5 }}>{t.scanningSub}</span>
                </div>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1.58 / 1",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "var(--ky-field)",
                    boxShadow: "var(--ky-glow)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={t.previewAlt}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: `rotate(${rotation}deg)`,
                        opacity: 0.9,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "78%",
                        aspectRatio: "1.58 / 1",
                        borderRadius: 10,
                        border: "1px solid var(--ky-field-border)",
                        backgroundImage: "repeating-linear-gradient(135deg, var(--ky-stripe) 0 8px, transparent 8px 16px)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <IdCard size={30} strokeWidth={2} color="var(--ky-muted-fg)" aria-hidden="true" />
                    </div>
                  )}
                  <span
                    data-el="scanline"
                    className="ky-scanline"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "var(--ky-accent)",
                      boxShadow: "0 0 18px 4px var(--ky-accent)",
                    }}
                  />
                </div>
                <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span data-testid="ocr-current-stage" style={{ fontSize: 13, fontWeight: 600 }}>
                      {t.stages[stage]}
                    </span>
                    <span
                      data-testid="ocr-progress-value"
                      style={{ fontFamily: "var(--ky-font-mono)", fontSize: 14, fontWeight: 600, color: "var(--ky-primary)", fontVariantNumeric: "tabular-nums" }}
                    >
                      {num(progress)}%
                    </span>
                  </div>
                  <div
                    data-testid="ocr-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    style={{ height: 6, borderRadius: 999, background: "var(--ky-muted)", overflow: "hidden" }}
                  >
                    <span style={{ display: "block", height: "100%", borderRadius: 999, background: "var(--ky-primary)", width: `${progress}%`, transition: "width 0.3s ease" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {t.stages.map((label, i) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: i <= stage ? "var(--ky-credit)" : "var(--ky-muted-fg)" }}>
                        <Check size={14} strokeWidth={2} aria-hidden="true" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAll();
                    setStep("capture");
                    setProgress(0);
                    setStage(0);
                  }}
                  data-testid="cancel-ocr"
                  className="ky-hover-fg"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    minHeight: 46,
                    cursor: "pointer",
                    padding: "12px 0",
                    borderRadius: 10,
                    background: "transparent",
                    border: "1px solid var(--ky-border)",
                    color: "var(--ky-muted-fg)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <X size={15} strokeWidth={2} aria-hidden="true" />
                  <span>{t.cancel}</span>
                </button>
              </div>
            )}

            {step === "review" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {t.reviewTitle}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--ky-muted-fg)", lineHeight: 1.55 }}>{t.reviewSub}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 11, borderRadius: 12, background: "var(--ky-field)", border: "1px solid var(--ky-border)" }}>
                  <div
                    style={{
                      flex: "0 0 84px",
                      width: 84,
                      aspectRatio: "1.58 / 1",
                      borderRadius: 8,
                      overflow: "hidden",
                      backgroundImage: "repeating-linear-gradient(135deg, var(--ky-stripe) 0 6px, transparent 6px 12px)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={t.previewAlt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <IdCard size={20} strokeWidth={2} color="var(--ky-muted-fg)" aria-hidden="true" />
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t.nidFront}</span>
                    <span style={{ fontFamily: "var(--ky-font-mono)", fontSize: 11, color: "var(--ky-muted-fg)" }}>{t.ocrDone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={retake}
                    data-testid="replace-nid-from-review"
                    className="ky-hover-fg"
                    style={{
                      marginLeft: "auto",
                      flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      minHeight: 44,
                      cursor: "pointer",
                      padding: "10px 13px",
                      borderRadius: 9,
                      background: "transparent",
                      border: "1px solid var(--ky-field-border)",
                      color: "var(--ky-muted-fg)",
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{t.anotherImage}</span>
                  </button>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={fieldLabelStyle}>{t.fieldNid}</span>
                  <input
                    value={fNid}
                    onChange={(e) => {
                      setFNid(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    inputMode="numeric"
                    data-testid="nid-number"
                    className="ky-field-input"
                    style={{ ...fieldInputBaseStyle, border: "1px solid var(--ky-field-border)", fontFamily: "var(--ky-font-mono)", letterSpacing: "0.04em" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, ...fieldLabelStyle }}>
                    <span>{t.fieldDob}</span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "var(--ky-accent-surface)",
                        color: "var(--ky-accent-fg)",
                        fontSize: 10.5,
                        fontWeight: 700,
                      }}
                    >
                      <TriangleAlert size={12} strokeWidth={2} aria-hidden="true" />
                      <span>{t.lowConfidence}</span>
                    </span>
                  </span>
                  <input
                    value={fDob}
                    onChange={(e) => {
                      setFDob(e.target.value);
                      setError("");
                    }}
                    data-testid="nid-date-of-birth"
                    className="ky-field-input ky-field-input-accent"
                    style={{ ...fieldInputBaseStyle, border: "1px solid var(--ky-accent)", fontFamily: "var(--ky-font-mono)" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={fieldLabelStyle}>{t.fieldNameBn}</span>
                  <input
                    value={fNameBn}
                    onChange={(e) => {
                      setFNameBn(e.target.value);
                      setError("");
                    }}
                    data-testid="nid-name-bn"
                    className="ky-field-input"
                    style={{ ...fieldInputBaseStyle, border: "1px solid var(--ky-field-border)" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={fieldLabelStyle}>{t.fieldNameEn}</span>
                  <input
                    value={fNameEn}
                    onChange={(e) => {
                      setFNameEn(e.target.value);
                      setError("");
                    }}
                    data-testid="nid-name-en"
                    className="ky-field-input"
                    style={{ ...fieldInputBaseStyle, border: "1px solid var(--ky-field-border)" }}
                  />
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 13px", borderRadius: 10, background: "var(--ky-field)", border: "1px solid var(--ky-border)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      setError("");
                    }}
                    data-testid="nid-consent"
                    style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--ky-primary)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: "pretty" }}>{t.consent}</span>
                </label>

                {error && (
                  <div role="alert" style={{ padding: "10px 13px", borderRadius: 9, background: "var(--ky-debit-surface)", color: "var(--ky-debit)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={verify}
                  data-testid="verify-nid"
                  className="ky-btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    minHeight: 48,
                    border: "none",
                    cursor: "pointer",
                    padding: "13px 0",
                    borderRadius: 11,
                    background: "var(--ky-primary)",
                    color: "var(--ky-primary-fg)",
                    fontSize: 14,
                    fontWeight: 700,
                    opacity: consent ? 1 : 0.6,
                  }}
                >
                  <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t.verifyInfo}</span>
                </button>
              </div>
            )}

            {step === "verifying" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center", padding: "10px 0" }}>
                <span
                  className="ky-spinner"
                  style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid var(--ky-muted)", borderTopColor: "var(--ky-primary)" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {t.verifyingTitle}
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--ky-muted-fg)", lineHeight: 1.55, maxWidth: "34ch" }}>{t.verifyingSub}</span>
                </div>
                <div role="status" aria-live="polite" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {t.checks.map((label, i) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "11px 13px",
                        borderRadius: 10,
                        background: i < checksDone ? "var(--ky-credit-surface)" : "var(--ky-field)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: i < checksDone ? "var(--ky-credit)" : "var(--ky-muted-fg)",
                      }}
                    >
                      <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === "success" && (
              <div data-testid="kyc-success" className="ky-rise" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                  <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--ky-credit-surface)", color: "var(--ky-credit)", display: "grid", placeItems: "center" }}>
                    <Check size={30} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 21, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {t.successTitle}
                  </h2>
                  <span style={{ fontSize: 13.5, color: "var(--ky-muted-fg)", lineHeight: 1.6, maxWidth: "36ch", textWrap: "pretty" }}>
                    {t.successSub}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, border: "1px solid var(--ky-border)", overflow: "hidden" }}>
                  {(
                    [
                      { label: t.sumKyc, value: t.sumVerified, testid: "verified-status", mono: false, color: "var(--ky-credit)" },
                      { label: t.sumWallet, value: DEMO.wallet, testid: "wallet-number", mono: true, color: "var(--ky-fg)" },
                      { label: t.sumBalance, value: t.sumBalanceValue, testid: "opening-balance", mono: true, color: "var(--ky-fg)" },
                      { label: t.sumType, value: t.sumTypeValue, testid: "funding-type", mono: false, color: "var(--ky-fg)" },
                      { label: t.sumLedger, value: t.sumLedgerValue, testid: "funding-ledger-status", mono: false, color: "var(--ky-credit)" },
                    ] as const
                  ).map((row) => (
                    <div
                      key={row.testid}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        borderBottom: "1px solid var(--ky-border)",
                        fontSize: 12.5,
                      }}
                    >
                      <span style={{ color: "var(--ky-muted-fg)" }}>{row.label}</span>
                      <span
                        data-testid={row.testid}
                        style={{
                          fontFamily: row.mono ? "var(--ky-font-mono)" : "inherit",
                          fontWeight: 600,
                          color: row.color,
                          textAlign: "right",
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 13px", borderRadius: 10, background: "var(--ky-muted)" }}>
                  <Scale size={15} strokeWidth={2} color="var(--ky-muted-fg)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ky-muted-fg)", textWrap: "pretty" }}>{t.ledgerNote}</span>
                </div>
                <Link
                  href="/dashboard"
                  data-testid="go-dashboard"
                  className="ky-btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    minHeight: 48,
                    padding: "13px 0",
                    borderRadius: 11,
                    background: "var(--ky-primary)",
                    color: "var(--ky-primary-fg)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>{t.goDashboard}</span>
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            )}

            {step === "error" && (
              <div data-testid="kyc-error" role="alert" aria-live="assertive" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                  <span style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--ky-debit-surface)", color: "var(--ky-debit)", display: "grid", placeItems: "center" }}>
                    <TriangleAlert size={27} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h2 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>
                    {errTitle}
                  </h2>
                  <span style={{ fontSize: 13.5, color: "var(--ky-muted-fg)", lineHeight: 1.6, maxWidth: "38ch", textWrap: "pretty" }}>
                    {errBody}
                  </span>
                </div>
                {errorKind === "rate-limited" && cooldown > 0 && (
                  <div
                    data-testid="rate-limit-countdown"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 9,
                      padding: 12,
                      borderRadius: 10,
                      background: "var(--ky-field)",
                      border: "1px solid var(--ky-border)",
                      fontFamily: "var(--ky-font-mono)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Clock size={15} strokeWidth={2} color="var(--ky-muted-fg)" aria-hidden="true" />
                    <span>{fillTemplate(t.waitSeconds, { s: num(cooldown) })}</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {errorKind === "duplicate" && (
                    <button
                      type="button"
                      onClick={retake}
                      data-testid="error-new-image"
                      className="ky-btn-primary"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 46, cursor: "pointer", padding: "12px 0", borderRadius: 11, border: "none", background: "var(--ky-primary)", color: "var(--ky-primary-fg)", fontSize: 13.5, fontWeight: 700 }}
                    >
                      <span>{t.otherNid}</span>
                    </button>
                  )}
                  {errorKind === "unclear" && (
                    <button
                      type="button"
                      onClick={retake}
                      data-testid="error-new-image"
                      className="ky-btn-primary"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 46, cursor: "pointer", padding: "12px 0", borderRadius: 11, border: "none", background: "var(--ky-primary)", color: "var(--ky-primary-fg)", fontSize: 13.5, fontWeight: 700 }}
                    >
                      <span>{t.newImage}</span>
                    </button>
                  )}
                  {errorKind === "rate-limited" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (cooldown === 0) {
                          setStep("review");
                          setErrorKind("");
                          setError("");
                        }
                      }}
                      data-testid="error-retry"
                      className="ky-btn-primary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 9,
                        minHeight: 46,
                        cursor: cooldown > 0 ? "default" : "pointer",
                        padding: "12px 0",
                        borderRadius: 11,
                        border: "none",
                        background: "var(--ky-primary)",
                        color: "var(--ky-primary-fg)",
                        fontSize: 13.5,
                        fontWeight: 700,
                        opacity: cooldown > 0 ? 0.5 : 1,
                      }}
                    >
                      <span>{cooldown > 0 ? t.rateTitle : t.tryAgain}</span>
                    </button>
                  )}
                  {errorKind === "mismatch" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("review");
                          setErrorKind("");
                          setError("");
                        }}
                        data-testid="error-fix"
                        className="ky-btn-primary"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 46, cursor: "pointer", padding: "12px 0", borderRadius: 11, border: "none", background: "var(--ky-primary)", color: "var(--ky-primary-fg)", fontSize: 13.5, fontWeight: 700 }}
                      >
                        <span>{t.fixInfo}</span>
                      </button>
                      <button
                        type="button"
                        onClick={retake}
                        data-testid="error-new-image"
                        className="ky-btn-outline"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 46, cursor: "pointer", padding: "12px 0", borderRadius: 11, border: "1px solid var(--ky-field-border)", background: "transparent", color: "var(--ky-fg)", fontSize: 13.5, fontWeight: 700 }}
                      >
                        <span>{t.newImage}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
