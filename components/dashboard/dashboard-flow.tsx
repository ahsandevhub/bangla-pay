"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Hind_Siliguri, Anek_Bangla, Baloo_Da_2, JetBrains_Mono } from "next/font/google";
import {
  Banknote,
  LayoutDashboard,
  Send,
  HandCoins,
  History,
  Scale,
  ShieldCheck,
  Languages,
  Sun,
  Moon,
  Smartphone,
  PenLine,
  Check,
  X,
  ChevronDown,
  KeyRound,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  DASHBOARD_COPY,
  SEED_REQUESTS,
  SEED_TXNS,
  STARTING_BALANCE_POISHA,
  fillTemplate,
  type Locale,
  type LocalizedText,
  type SeedRequest,
  type SeedTxn,
} from "@/components/dashboard/dashboard-content";
import "@/components/dashboard/dashboard.css";

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

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--db-font-mono" });

const headingFontFamily =
  "var(--font-baloo-da-2), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

// JetBrains Mono has no Bengali glyphs, so digits/labels in Bangla fall
// through to Anek Bangla/Hind Siliguri instead of an unstyled system font.
const monoFontFamily =
  "var(--db-font-mono), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

type Tab = "send" | "request";
type ToastKey = "toastSent" | "toastRequested" | "toastPaid" | "toastDeclined";
type ToastState = { key: ToastKey; params: Record<string, string> } | null;

type LiveRequest = SeedRequest;
type LiveTxn = SeedTxn;

function newIdemKey() {
  return "idem_" + Math.random().toString(16).slice(2, 10);
}

function parseAmountToPoisha(raw: string): number | null {
  const clean = raw.replace(/,/g, "").trim();
  if (!clean || !/^\d*\.?\d{0,2}$/.test(clean)) return null;
  const poisha = Math.round(parseFloat(clean) * 100);
  return Number.isFinite(poisha) ? poisha : null;
}

export function DashboardFlow() {
  const [locale, setLocale] = useState<Locale>("bn");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<Tab>("send");
  const [toWallet, setToWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [balance, setBalance] = useState(STARTING_BALANCE_POISHA);
  // useId is hydration-safe (identical on server and client), unlike
  // Math.random(), which would produce a mismatched initial value.
  const reactId = useId();
  const [idem, setIdem] = useState(() => "idem_" + reactId.replace(/\W/g, "").slice(0, 8));
  const [requests, setRequests] = useState<LiveRequest[]>(SEED_REQUESTS);
  const [txns, setTxns] = useState<LiveTxn[]>(SEED_TXNS);

  const t = DASHBOARD_COPY[locale];
  const amountRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const txnCounter = useRef(0);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function localized(text: LocalizedText) {
    return text[locale];
  }

  function num(n: number) {
    return n.toLocaleString(locale === "bn" ? "bn-BD" : "en-US");
  }

  function fmt(poisha: number) {
    return (
      "৳" +
      (Math.abs(poisha) / 100).toLocaleString(locale === "bn" ? "bn-BD" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function flash(key: ToastKey, params: Record<string, string>) {
    setToast({ key, params });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function pushTxn(entry: Omit<LiveTxn, "id" | "afterPoisha" | "time">) {
    txnCounter.current += 1;
    const id = `${reactId}-n${txnCounter.current}`;
    const after = entry.dir === "DEBIT" ? balance - entry.amountPoisha : balance + entry.amountPoisha;
    setBalance(after);
    setTxns((s) => [{ id, afterPoisha: after, time: null, ...entry }, ...s]);
    setIdem(newIdemKey());
  }

  function focusAmount() {
    setTab("send");
    setTimeout(() => amountRef.current?.focus(), 0);
  }

  function submit() {
    const digits = toWallet.replace(/\D/g, "");
    if (digits.length !== 11) {
      setError(t.errWallet);
      return;
    }
    const poisha = parseAmountToPoisha(amount);
    if (poisha === null || poisha <= 0) {
      setError(t.errAmount);
      return;
    }
    if (tab === "send" && poisha > balance) {
      setError(t.errFunds);
      return;
    }
    if (tab === "request") {
      setError("");
      setToWallet("");
      setAmount("");
      setNote("");
      setIdem(newIdemKey());
      flash("toastRequested", { amt: fmt(poisha) });
      return;
    }
    const label = digits.slice(0, 5) + "-" + digits.slice(5);
    const noteVal: LocalizedText = note ? { bn: note, en: note } : { bn: "ট্রান্সফার", en: "Transfer" };
    pushTxn({ name: { bn: label, en: label }, note: noteVal, type: "TRANSFER", dir: "DEBIT", amountPoisha: poisha });
    setError("");
    setToWallet("");
    setAmount("");
    setNote("");
    flash("toastSent", { amt: fmt(poisha) });
  }

  function accept(r: LiveRequest) {
    if (r.amountPoisha > balance) {
      setError(t.errFundsRequest);
      return;
    }
    setRequests((s) => s.filter((x) => x.id !== r.id));
    setError("");
    pushTxn({ name: r.name, note: r.note, type: "SETTLEMENT", dir: "DEBIT", amountPoisha: r.amountPoisha });
    flash("toastPaid", { amt: fmt(r.amountPoisha), name: localized(r.name) });
  }

  function decline(r: LiveRequest) {
    setRequests((s) => s.filter((x) => x.id !== r.id));
    flash("toastDeclined", { name: localized(r.name) });
  }

  const dark = theme !== "light";
  const ON = { bg: "var(--db-card)", fg: "var(--db-fg)" };
  const OFF = { bg: "transparent", fg: "var(--db-muted-fg)" };
  const lightStyle = dark ? OFF : ON;
  const darkStyle = dark ? ON : OFF;
  const bnStyle = locale === "bn" ? ON : OFF;
  const enStyle = locale === "bn" ? OFF : ON;
  const sendOn = tab === "send";
  const parsedAmount = parseAmountToPoisha(amount);
  const walletLabel = sendOn ? t.walletSend : t.walletRequest;
  const submitLabel = sendOn
    ? parsedAmount
      ? fillTemplate(t.submitSend, { amt: fmt(parsedAmount) })
      : t.submitSendPlain
    : t.submitRequest;
  const formPrefix = sendOn ? "send-money" : "request-money";
  const quickAmounts = [500, 1200, 2500, 5000];

  const navItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 9,
    fontSize: 13.5,
    fontWeight: 500,
    color: "var(--db-muted-fg)",
    cursor: "pointer",
  } as const;

  return (
    <div
      data-theme={theme}
      lang={locale}
      className={`db-dashboard ${hindSiliguri.variable} ${anekBangla.variable} ${balooDa2.variable} ${jetBrainsMono.variable}`}
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif",
      }}
    >
      <aside
        data-el="sidebar"
        style={{
          width: 258,
          flex: "0 0 258px",
          background: "var(--db-sidebar)",
          borderRight: "1px solid var(--db-border)",
          padding: "22px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "var(--db-accent)",
              color: "var(--db-accent-fg)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Banknote size={18} strokeWidth={2} aria-hidden="true" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
            <span style={{ fontFamily: headingFontFamily, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {t.brand}
            </span>
            <span style={{ fontSize: 11, color: "var(--db-muted-fg)", fontWeight: 500 }}>{t.tagline}</span>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 9,
              background: "var(--db-sidebar-accent)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LayoutDashboard size={16} strokeWidth={2} color="var(--db-primary)" aria-hidden="true" />
            <span>{t.navDashboard}</span>
            <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "var(--db-primary)" }} />
          </div>
          <div className="db-nav-item" style={navItemStyle} onClick={focusAmount}>
            <Send size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navSend}</span>
          </div>
          <div
            className="db-nav-item"
            style={navItemStyle}
            onClick={() => {
              setTab("request");
              setError("");
            }}
          >
            <HandCoins size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navRequests}</span>
            <span
              style={{
                marginLeft: "auto",
                flex: "0 0 auto",
                minWidth: 20,
                height: 19,
                padding: "0 6px",
                borderRadius: 999,
                background: "var(--db-pending-surface)",
                color: "var(--db-pending)",
                fontSize: 11,
                fontWeight: 700,
                display: "grid",
                placeItems: "center",
                fontFamily: monoFontFamily,
              }}
            >
              {num(requests.length)}
            </span>
          </div>
          <div className="db-nav-item" style={navItemStyle}>
            <History size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navHistory}</span>
          </div>
          <div className="db-nav-item" style={navItemStyle}>
            <Scale size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navReconcile}</span>
          </div>
        </nav>

        <div style={{ flex: 1 }} />

        <div
          style={{
            border: "1px solid var(--db-border)",
            borderRadius: 11,
            padding: 13,
            background: "var(--db-credit-surface)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <ShieldCheck size={15} strokeWidth={2} color="var(--db-credit)" aria-hidden="true" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--db-credit)" }}>{t.ledgerOk}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--db-muted-fg)", lineHeight: 1.5, textWrap: "pretty" }}>{t.ledgerDesc}</div>
          <div style={{ fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)" }}>
            {fillTemplate(t.ledgerMeta, { n: num(12481), amt: fmt(0) })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--db-border)", padding: "14px 6px 8px" }}>
          <div
            style={{
              flex: "0 0 30px",
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--db-secondary)",
              color: "var(--db-secondary-fg)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {t.userInitials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.userName}
            </span>
            <span style={{ fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)" }}>01711-000000</span>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          data-el="header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            padding: "18px 32px",
            borderBottom: "1px solid var(--db-border)",
            minWidth: 1180,
            boxSizing: "border-box",
          }}
        >
          <div data-el="htitle" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: headingFontFamily, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {t.headerTitle}
            </h1>
            <span
              data-el="hsub"
              style={{ fontSize: 12.5, color: "var(--db-muted-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {t.headerSub}
            </span>
          </div>
          <div data-el="hctrl" style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
            <span data-el="route" style={{ fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)" }}>
              {"/" + locale + "/dashboard"}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: 3,
                gap: 3,
                border: "1px solid var(--db-border)",
                borderRadius: 9,
                background: "var(--db-card)",
              }}
            >
              <Languages
                size={15}
                strokeWidth={2}
                color="var(--db-muted-fg)"
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
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  ...bnStyle,
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
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  ...enStyle,
                }}
              >
                English
              </button>
            </div>
            <div
              style={{
                display: "flex",
                padding: 3,
                gap: 3,
                border: "1px solid var(--db-border)",
                borderRadius: 9,
                background: "var(--db-card)",
              }}
            >
              <button
                type="button"
                data-testid="theme-light"
                onClick={() => setTheme("light")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  ...lightStyle,
                }}
              >
                <Sun size={14} strokeWidth={2} aria-hidden="true" />
                <span>{t.light}</span>
              </button>
              <button
                type="button"
                data-testid="theme-dark"
                onClick={() => setTheme("dark")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  ...darkStyle,
                }}
              >
                <Moon size={14} strokeWidth={2} aria-hidden="true" />
                <span>{t.dark}</span>
              </button>
            </div>
            <button
              data-el="hcta"
              type="button"
              onClick={focusAmount}
              className="db-btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: 9,
                background: "var(--db-primary)",
                color: "var(--db-primary-fg)",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <Send size={15} strokeWidth={2} aria-hidden="true" />
              <span>{t.navSend}</span>
            </button>
          </div>
        </header>

        <div
          data-el="grid"
          style={{
            flex: 1,
            padding: "26px 32px 40px",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(300px, 1fr))",
            gap: 20,
            alignContent: "start",
            minWidth: 1180,
            boxSizing: "border-box",
          }}
        >
          <section
            data-el="mledger"
            data-span="1"
            style={{
              display: "none",
              alignItems: "center",
              gap: 9,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--db-credit-surface)",
              border: "1px solid var(--db-border)",
            }}
          >
            <ShieldCheck size={15} strokeWidth={2} color="var(--db-credit)" aria-hidden="true" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--db-credit)" }}>{t.ledgerOk}</span>
            <span style={{ marginLeft: "auto", fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)", whiteSpace: "nowrap" }}>
              {fillTemplate(t.ledgerMeta, { n: num(12481), amt: fmt(0) })}
            </span>
          </section>

          <section
            data-el="pad"
            data-span="2"
            style={{
              gridColumn: "span 2",
              backgroundImage: "var(--db-grad)",
              borderRadius: 16,
              padding: "26px 28px",
              boxShadow: "var(--db-glow)",
              color: "var(--db-on-grad)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>
                  {t.balanceLabel}
                </span>
                <span
                  data-el="bigamt"
                  data-testid="dashboard-balance"
                  style={{
                    fontFamily: monoFontFamily,
                    fontSize: 42,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                  }}
                >
                  {fmt(balance)}
                </span>
                <span style={{ fontFamily: monoFontFamily, fontSize: 12, opacity: 0.8 }}>
                  {fillTemplate(t.poisha, { n: num(balance) })}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flex: "0 0 auto" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: "oklch(0.985 0.006 320 / 16%)",
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" />
                  <span>{t.active}</span>
                </span>
                <span style={{ fontFamily: monoFontFamily, fontSize: 12.5, opacity: 0.85 }}>01711-000000</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={focusAmount}
                data-testid="dashboard-send-button"
                className="db-btn-white"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: 9,
                  background: "oklch(0.985 0.006 320)",
                  color: "oklch(0.3 0.12 315)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Send size={15} strokeWidth={2} aria-hidden="true" />
                <span>{t.send}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("request");
                  setError("");
                }}
                data-testid="dashboard-request-button"
                className="db-btn-ghost-white"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: 9,
                  background: "transparent",
                  color: "oklch(0.985 0.006 320)",
                  border: "1px solid oklch(0.985 0.006 320 / 45%)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <HandCoins size={15} strokeWidth={2} aria-hidden="true" />
                <span>{t.request}</span>
              </button>
              <span style={{ marginLeft: "auto", fontSize: 11.5, opacity: 0.8 }}>
                {fillTemplate(t.reconciled, { t: t.twoMin })}
              </span>
            </div>
          </section>

          <div data-el="stats" data-span="1" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                background: "var(--db-card)",
                border: "1px solid var(--db-border)",
                borderRadius: 14,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--db-muted-fg)" }}>
                <ArrowDownLeft size={14} strokeWidth={2} color="var(--db-credit)" aria-hidden="true" />
                <span>{t.statsIn}</span>
              </span>
              <span style={{ fontFamily: monoFontFamily, fontSize: 23, fontWeight: 600, color: "var(--db-credit)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(2_842_000)}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)" }}>{t.statsCredits}</span>
            </div>
            <div
              style={{
                background: "var(--db-card)",
                border: "1px solid var(--db-border)",
                borderRadius: 14,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--db-muted-fg)" }}>
                <ArrowUpRight size={14} strokeWidth={2} color="var(--db-debit)" aria-hidden="true" />
                <span>{t.statsOut}</span>
              </span>
              <span style={{ fontFamily: monoFontFamily, fontSize: 23, fontWeight: 600, color: "var(--db-debit)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(1_970_000)}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)" }}>{t.statsDebits}</span>
            </div>
          </div>

          <section
            data-el="pad"
            data-span="2"
            style={{
              gridColumn: "span 2",
              background: "var(--db-card)",
              border: "1px solid var(--db-border)",
              borderRadius: 14,
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", padding: 3, gap: 3, background: "var(--db-muted)", borderRadius: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setTab("send");
                    setError("");
                  }}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 16px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 700,
                    background: sendOn ? "var(--db-card)" : "transparent",
                    color: sendOn ? "var(--db-fg)" : "var(--db-muted-fg)",
                  }}
                >
                  {t.tabSend}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("request");
                    setError("");
                  }}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 16px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 700,
                    background: sendOn ? "transparent" : "var(--db-card)",
                    color: sendOn ? "var(--db-muted-fg)" : "var(--db-fg)",
                  }}
                >
                  {t.tabRequest}
                </button>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)" }}>
                <KeyRound size={13} strokeWidth={2} aria-hidden="true" />
                <span>Idempotency-Key: {idem}</span>
              </span>
            </div>

            <div data-el="fieldgrid" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{walletLabel}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "0 13px",
                    borderRadius: 9,
                    border: "1px solid var(--db-field-border)",
                    background: "var(--db-field)",
                  }}
                >
                  <Smartphone size={16} strokeWidth={2} color="var(--db-muted-fg)" aria-hidden="true" />
                  <input
                    value={toWallet}
                    onChange={(e) => {
                      setToWallet(e.target.value);
                      setError("");
                    }}
                    placeholder="01XXX-XXXXXX"
                    data-testid={`${formPrefix}-recipient`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "11px 0",
                      border: "none",
                      background: "transparent",
                      color: "var(--db-fg)",
                      fontFamily: monoFontFamily,
                      fontSize: 13.5,
                      outline: "none",
                    }}
                  />
                </span>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t.amount}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 13px",
                    borderRadius: 9,
                    border: "1px solid var(--db-field-border)",
                    background: "var(--db-field)",
                  }}
                >
                  <Banknote size={16} strokeWidth={2} color="var(--db-muted-fg)" aria-hidden="true" />
                  <span style={{ fontFamily: monoFontFamily, fontSize: 14, color: "var(--db-muted-fg)" }}>৳</span>
                  <input
                    ref={amountRef}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                    }}
                    placeholder="2500.00"
                    inputMode="decimal"
                    data-testid={`${formPrefix}-amount`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "11px 0",
                      border: "none",
                      background: "transparent",
                      color: "var(--db-fg)",
                      fontFamily: monoFontFamily,
                      fontSize: 14,
                      fontVariantNumeric: "tabular-nums",
                      outline: "none",
                    }}
                  />
                </span>
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                {t.note} · {t.optional}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "0 13px",
                  borderRadius: 9,
                  border: "1px solid var(--db-field-border)",
                  background: "var(--db-field)",
                }}
              >
                <PenLine size={16} strokeWidth={2} color="var(--db-muted-fg)" aria-hidden="true" />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.notePlaceholder}
                  data-testid={`${formPrefix}-note`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "11px 0",
                    border: "none",
                    background: "transparent",
                    color: "var(--db-fg)",
                    fontSize: 13.5,
                    outline: "none",
                  }}
                />
              </span>
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              {quickAmounts.map((v) => (
                <button
                  key={v}
                  data-el="chip"
                  type="button"
                  onClick={() => {
                    setAmount(v.toFixed(2));
                    setError("");
                  }}
                  className="db-chip"
                  style={{
                    cursor: "pointer",
                    padding: "7px 13px",
                    borderRadius: 999,
                    border: "1px solid var(--db-border)",
                    background: "transparent",
                    color: "var(--db-muted-fg)",
                    fontFamily: monoFontFamily,
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  ৳{num(v)}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ padding: "10px 13px", borderRadius: 9, background: "var(--db-debit-surface)", color: "var(--db-debit)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                borderTop: "1px solid var(--db-border)",
                paddingTop: 16,
              }}
            >
              <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)", maxWidth: "58%", lineHeight: 1.5, textWrap: "pretty" }}>
                {t.formFootnote}
              </span>
              <button
                type="button"
                onClick={submit}
                data-testid={`${formPrefix}-submit`}
                className="db-btn-primary"
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "12px 22px",
                  borderRadius: 10,
                  background: "var(--db-primary)",
                  color: "var(--db-primary-fg)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {submitLabel}
              </button>
            </div>
          </section>

          <section
            data-el="pad"
            data-span="1"
            style={{
              background: "var(--db-card)",
              border: "1px solid var(--db-border)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{t.inboxTitle}</span>
              <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)", flex: "0 0 auto" }}>{t.inboxExpiry}</span>
            </div>
            {requests.map((r) => (
              <div
                key={r.id}
                data-testid={`request-inbox-item-${r.id}`}
                style={{ display: "flex", flexDirection: "column", gap: 11, padding: 13, border: "1px solid var(--db-border)", borderRadius: 11 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      flex: "0 0 30px",
                      borderRadius: "50%",
                      background: "var(--db-secondary)",
                      color: "var(--db-secondary-fg)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    {localized(r.initials)}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {localized(r.name)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--db-muted-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {localized(r.note)}
                    </span>
                  </div>
                  <span
                    style={{
                      flex: "0 0 auto",
                      whiteSpace: "nowrap",
                      fontFamily: monoFontFamily,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--db-pending)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(r.amountPoisha)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button
                    data-el="reqbtn"
                    type="button"
                    onClick={() => accept(r)}
                    data-testid={`request-accept-${r.id}`}
                    className="db-btn-primary"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      border: "none",
                      cursor: "pointer",
                      padding: "8px 0",
                      borderRadius: 8,
                      background: "var(--db-primary)",
                      color: "var(--db-primary-fg)",
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{t.accept}</span>
                  </button>
                  <button
                    data-el="reqbtn"
                    type="button"
                    onClick={() => decline(r)}
                    data-testid={`request-decline-${r.id}`}
                    className="db-hover-fg"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      cursor: "pointer",
                      padding: "8px 0",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid var(--db-field-border)",
                      color: "var(--db-muted-fg)",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <X size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{t.decline}</span>
                  </button>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div style={{ padding: "26px 12px", textAlign: "center", color: "var(--db-muted-fg)", fontSize: 12.5, lineHeight: 1.55 }}>
                <div>{t.inboxEmpty1}</div>
                <div>{t.inboxEmpty2}</div>
              </div>
            )}
          </section>

          <section
            data-span="3"
            style={{ gridColumn: "span 3", background: "var(--db-card)", border: "1px solid var(--db-border)", borderRadius: 14, overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", borderBottom: "1px solid var(--db-border)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{t.txnTitle}</span>
                <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)" }}>{t.txnSub}</span>
              </div>
              <span style={{ fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)", flex: "0 0 auto" }}>
                cursor: {"id<" + num(2481 - txns.length)}
              </span>
            </div>
            <div
              data-el="txnhead"
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1.1fr 0.9fr 0.9fr 1fr 0.8fr",
                gap: 12,
                padding: "11px 22px",
                background: "var(--db-muted)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "var(--db-muted-fg)",
              }}
            >
              <span>{t.colCounterparty}</span>
              <span>{t.colNote}</span>
              <span>{t.colType}</span>
              <span style={{ textAlign: "right" }}>{t.colAmount}</span>
              <span style={{ textAlign: "right" }}>{t.colAfter}</span>
              <span style={{ textAlign: "right" }}>{t.colStatus}</span>
            </div>
            {txns.map((row) => {
              const credit = row.dir === "CREDIT";
              const Icon = credit ? ArrowDownLeft : ArrowUpRight;
              const chipFg = credit ? "var(--db-credit)" : "var(--db-debit)";
              const typeLabel = t[`type${row.type}` as "typeTRANSFER" | "typeSETTLEMENT" | "typeFUNDING"];
              return (
                <div
                  key={row.id}
                  data-el="txnrow"
                  data-testid={`history-row-${row.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1.1fr 0.9fr 0.9fr 1fr 0.8fr",
                    gap: 12,
                    alignItems: "center",
                    padding: "13px 22px",
                    borderBottom: "1px solid var(--db-border)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        flex: "0 0 30px",
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                        background: credit ? "var(--db-credit-surface)" : "var(--db-debit-surface)",
                        color: chipFg,
                      }}
                    >
                      <Icon size={15} strokeWidth={2} aria-hidden="true" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.3 }}>
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {localized(row.name)}
                      </span>
                      <span
                        data-el="mnote"
                        style={{ display: "none", fontSize: 11.5, color: "var(--db-muted-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {localized(row.note)} · {typeLabel}
                      </span>
                      <span style={{ fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.time ? localized(row.time) : t.justNow}
                      </span>
                    </div>
                  </div>
                  <span data-col="note" style={{ color: "var(--db-muted-fg)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {localized(row.note)}
                  </span>
                  <span
                    data-col="type"
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--db-muted-fg)", letterSpacing: "0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {typeLabel}
                  </span>
                  <span style={{ textAlign: "right", fontFamily: monoFontFamily, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: chipFg }}>
                    {(credit ? "+" : "−") + fmt(row.amountPoisha)}
                  </span>
                  <span data-col="after" style={{ textAlign: "right", fontFamily: monoFontFamily, fontSize: 12.5, color: "var(--db-muted-fg)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(row.afterPoisha)}
                  </span>
                  <span
                    data-col="status"
                    style={{
                      justifySelf: "end",
                      padding: "4px 9px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      whiteSpace: "nowrap",
                      background: "var(--db-credit-surface)",
                      color: "var(--db-credit)",
                    }}
                  >
                    {t.completed}
                  </span>
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
              <button
                type="button"
                data-testid="history-load-older"
                className="db-hover-fg"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  padding: "9px 18px",
                  borderRadius: 9,
                  background: "transparent",
                  border: "1px solid var(--db-border)",
                  color: "var(--db-muted-fg)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                <span>{t.loadOlder}</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      <nav
        data-el="tabbar"
        style={{
          display: "none",
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 6,
          alignItems: "stretch",
          gap: 2,
          padding: "6px 8px",
          paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
          background: "var(--db-sidebar)",
          borderTop: "1px solid var(--db-border)",
        }}
      >
        <button
          type="button"
          style={{
            flex: 1,
            minHeight: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--db-primary)",
          }}
        >
          <LayoutDashboard size={19} strokeWidth={2} aria-hidden="true" />
          <span>{t.navDashboard}</span>
        </button>
        <button
          type="button"
          onClick={focusAmount}
          style={{
            flex: 1,
            minHeight: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--db-muted-fg)",
          }}
        >
          <Send size={19} strokeWidth={2} aria-hidden="true" />
          <span>{t.navSend}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("request");
            setError("");
          }}
          style={{
            position: "relative",
            flex: 1,
            minHeight: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--db-muted-fg)",
          }}
        >
          <HandCoins size={19} strokeWidth={2} aria-hidden="true" />
          <span
            style={{
              position: "absolute",
              top: 2,
              left: "50%",
              marginLeft: 6,
              minWidth: 16,
              padding: "0 4px",
              height: 16,
              borderRadius: 999,
              background: "var(--db-pending)",
              color: "var(--db-accent-fg)",
              fontFamily: monoFontFamily,
              fontSize: 10,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
            }}
          >
            {num(requests.length)}
          </span>
          <span>{t.navRequests}</span>
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            minHeight: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--db-muted-fg)",
          }}
        >
          <History size={19} strokeWidth={2} aria-hidden="true" />
          <span>{t.navHistory}</span>
        </button>
      </nav>

      {toast && (
        <div
          data-el="toast"
          className="db-toast"
          style={{
            position: "fixed",
            right: 26,
            bottom: 26,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "13px 17px",
            borderRadius: 11,
            background: "var(--db-card)",
            border: "1px solid var(--db-border)",
            boxShadow: "0 18px 44px -16px oklch(0 0 0 / 45%)",
          }}
        >
          <span style={{ flex: "0 0 auto", width: 8, height: 8, borderRadius: "50%", background: "var(--db-credit)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{fillTemplate(t[toast.key], toast.params)}</span>
        </div>
      )}
    </div>
  );
}
