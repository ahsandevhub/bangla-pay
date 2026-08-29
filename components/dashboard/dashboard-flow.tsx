"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  LogOut,
} from "lucide-react";
import {
  DASHBOARD_COPY,
  fillTemplate,
  type DashboardCopy,
  type Locale,
} from "@/components/dashboard/dashboard-content";
import "@/components/dashboard/dashboard.css";
import { Money } from "@/lib/shared/domain/money";
import { normalizePhone } from "@/lib/auth/phone";
import { formatPoishaAsBdt } from "@/lib/shared/format/money";

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
type DashboardNav = "dashboard" | "send" | "request" | "history" | "reconcile";
type ToastKey = "toastRequested" | "toastDeclined";
type ToastState = { key: ToastKey; params: Record<string, string> } | null;

type AccountSummaryDto = { walletNumber: string; balancePoisha: string; status: "ACTIVE" | "INACTIVE" };

type TxnType = "INITIAL_FUNDING" | "TRANSFER" | "REQUEST_SETTLEMENT";
type TxnDirection = "DEBIT" | "CREDIT";

type TransactionHistoryItemDto = {
  ledgerEntryId: number;
  transactionId: string;
  type: TxnType;
  direction: TxnDirection;
  amountPoisha: string;
  balanceAfterPoisha: string;
  note: string | null;
  counterpartyWalletNumber: string;
  createdAt: string;
};

type RequestInboxItemDto = {
  id: string;
  requesterWalletNumber: string;
  amountPoisha: string;
  note: string | null;
  expiresAt: string;
  createdAt: string;
};

type ApiError = { code: string; message: string; fieldErrors?: Record<string, string[]> };

type ConfirmState =
  | { kind: "send"; toWallet: string; amount: string; amountPoisha: bigint; note: string }
  | { kind: "accept"; request: RequestInboxItemDto }
  | null;

type Receipt = {
  transactionId: string;
  amountPoisha: string;
  counterpartyWalletNumber: string;
  note: string | null;
  createdAt: string;
} | null;

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json: { data?: T; error?: ApiError } | null = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: json?.error ?? { code: "INTERNAL_ERROR", message: "Something went wrong." } };
    }
    return { ok: true, data: json?.data as T };
  } catch {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "Network error." } };
  }
}

function errorMessageForCode(
  copy: DashboardCopy,
  code: string,
  context: "send" | "request" | "accept",
): string {
  switch (code) {
    case "ACCOUNT_NOT_FOUND":
      return copy.errRecipientNotFound;
    case "SELF_TRANSFER":
      return copy.errSelfTransfer;
    case "INSUFFICIENT_FUNDS":
      return context === "request" ? copy.errFundsRequest : copy.errFunds;
    case "DEVICE_REPLACED":
      return copy.errDeviceReplaced;
    case "RATE_LIMITED":
      return copy.errRateLimited;
    case "REQUEST_EXPIRED":
      return copy.errRequestExpired;
    case "REQUEST_NOT_PENDING":
      return copy.errRequestSettled;
    case "VALIDATION_ERROR":
    case "INVALID_AMOUNT":
      return copy.errAmount;
    default:
      return copy.errGeneric;
  }
}

function typeLabelFor(t: DashboardCopy, type: TxnType): string {
  if (type === "INITIAL_FUNDING") return t.typeFUNDING;
  if (type === "REQUEST_SETTLEMENT") return t.typeSETTLEMENT;
  return t.typeTRANSFER;
}

/** Parses without throwing, for a live "Send ৳X" button-label preview -- the real validation on submit still goes through Money.parse() directly so its error surfaces properly. */
function previewPoisha(raw: string): bigint | null {
  try {
    return Money.parse(raw).toPoisha();
  } catch {
    return null;
  }
}

export function DashboardFlow() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("bn");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<Tab>("send");
  const [activeNav, setActiveNav] = useState<DashboardNav>("dashboard");
  const [toWallet, setToWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [account, setAccount] = useState<AccountSummaryDto | null>(null);
  // Seeded empty during SSR/first paint (hydration-safe) and replaced with a
  // real crypto.randomUUID() after mount -- transferRequestSchema requires an
  // actual UUID, which useId()'s non-UUID format could never satisfy.
  const [idem, setIdem] = useState("");
  const [requests, setRequests] = useState<RequestInboxItemDto[]>([]);
  const [txns, setTxns] = useState<TransactionHistoryItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [receipt, setReceipt] = useState<Receipt>(null);
  const [signingOut, setSigningOut] = useState(false);

  const t = DASHBOARD_COPY[locale];
  const amountRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const num = useCallback((n: number) => n.toLocaleString(locale === "bn" ? "bn-BD" : "en-US"), [locale]);

  const loadAccount = useCallback(async () => {
    const res = await apiFetch<AccountSummaryDto>("/api/accounts/me");
    if (res.ok) {
      setAccount(res.data);
      return;
    }
    // No account yet means KYC hasn't funded one -- reachable by direct
    // navigation/bookmark/back-button even though proxy.ts's optimistic
    // check let an authenticated-but-still-PENDING_KYC session through.
    if (res.error.code === "ACCOUNT_NOT_FOUND") {
      router.push("/kyc");
    }
  }, [router]);

  const loadRequests = useCallback(async () => {
    const res = await apiFetch<RequestInboxItemDto[]>("/api/requests");
    if (res.ok) setRequests(res.data);
  }, []);

  const loadHistory = useCallback(async (cursor: string | null, replace: boolean) => {
    setLoadingMore(true);
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiFetch<{ items: TransactionHistoryItemDto[]; nextCursor: string | null }>(
      `/api/transactions${qs}`,
    );
    if (res.ok) {
      setTxns((prev) => (replace ? res.data.items : [...prev, ...res.data.items]));
      setNextCursor(res.data.nextCursor);
    }
    setLoadingMore(false);
  }, []);

  // Only navigates to /login once the server has actually cleared the
  // session cookie -- pushing there unconditionally would bounce right back
  // to /dashboard via proxy.ts's optimistic auth redirect if the API call
  // failed and the cookie were still valid.
  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    const res = await apiFetch("/api/auth/signout", { method: "POST" });
    if (res.ok) {
      router.push("/login");
      return;
    }
    setSigningOut(false);
  }, [router]);

  useEffect(() => {
    // Deferred a tick so the setState call is a reaction to mounting having
    // happened, not part of the effect's own synchronous body -- avoids
    // react-hooks/set-state-in-effect while still being the earliest safe
    // point to swap in a real UUID (SSR would render a mismatched value).
    queueMicrotask(() => setIdem(crypto.randomUUID()));
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      await Promise.all([loadAccount(), loadRequests(), loadHistory(null, true)]);
    }
    void loadInitialData();
  }, [loadAccount, loadRequests, loadHistory]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function flash(key: ToastKey, params: Record<string, string>) {
    setToast({ key, params });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function scrollToSection(ref: { current: HTMLElement | null }) {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function showDashboard() {
    setActiveNav("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function focusAmount() {
    setActiveNav("send");
    setTab("send");
    setError("");
    scrollToSection(formRef);
    setTimeout(() => amountRef.current?.focus(), 350);
  }

  function showRequestForm() {
    setActiveNav("request");
    setTab("request");
    setError("");
    scrollToSection(formRef);
  }

  function showHistory() {
    setActiveNav("history");
    scrollToSection(historyRef);
  }

  function showReconcile() {
    setActiveNav("reconcile");
    scrollToSection(historyRef);
  }

  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(locale === "bn" ? "bn-BD" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function handleSubmitClick() {
    let normalizedWallet: string;
    try {
      normalizedWallet = normalizePhone(toWallet);
    } catch {
      setError(t.errWallet);
      return;
    }

    let parsedAmount: Money;
    try {
      parsedAmount = Money.parse(amount);
    } catch {
      setError(t.errAmount);
      return;
    }

    setError("");
    const decimalAmount = parsedAmount.toDecimalString();
    const amountPoisha = parsedAmount.toPoisha();

    if (tab === "request") {
      void submitRequest(normalizedWallet, decimalAmount);
      return;
    }

    setConfirm({ kind: "send", toWallet: normalizedWallet, amount: decimalAmount, amountPoisha, note });
  }

  async function submitRequest(payerWallet: string, decimalAmount: string) {
    setSubmitting(true);
    setError("");
    const res = await apiFetch<{ id: string; amountPoisha: string }>("/api/requests", {
      method: "POST",
      body: JSON.stringify({ payerWallet, amount: decimalAmount, note: note || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(errorMessageForCode(t, res.error.code, "request"));
      return;
    }
    setToWallet("");
    setAmount("");
    setNote("");
    flash("toastRequested", { amt: formatPoishaAsBdt(res.data.amountPoisha, locale) });
  }

  async function performSend(state: { toWallet: string; amount: string; note: string }) {
    setSubmitting(true);
    setError("");
    const res = await apiFetch<{
      transactionId: string;
      destinationWallet: string;
      amountPoisha: string;
      note: string | null;
      createdAt: string;
      replayed: boolean;
    }>("/api/transfers", {
      method: "POST",
      headers: { "Idempotency-Key": idem },
      body: JSON.stringify({
        destinationWallet: state.toWallet,
        amount: state.amount,
        note: state.note || undefined,
      }),
    });
    setSubmitting(false);
    setConfirm(null);
    if (!res.ok) {
      setError(errorMessageForCode(t, res.error.code, "send"));
      return;
    }
    setToWallet("");
    setAmount("");
    setNote("");
    setIdem(crypto.randomUUID());
    setReceipt({
      transactionId: res.data.transactionId,
      amountPoisha: res.data.amountPoisha,
      counterpartyWalletNumber: res.data.destinationWallet,
      note: res.data.note,
      createdAt: res.data.createdAt,
    });
    await Promise.all([loadAccount(), loadHistory(null, true)]);
  }

  async function performAccept(request: RequestInboxItemDto) {
    setActingRequestId(request.id);
    setError("");
    const res = await apiFetch<{ transactionId: string; amountPoisha: string; createdAt: string; replayed: boolean }>(
      `/api/requests/${request.id}/accept`,
      { method: "POST" },
    );
    setActingRequestId(null);
    setConfirm(null);
    if (!res.ok) {
      setError(errorMessageForCode(t, res.error.code, "accept"));
      // The request may have expired/settled elsewhere since it was loaded --
      // refresh the inbox so a stale row doesn't linger either way.
      await loadRequests();
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    setReceipt({
      transactionId: res.data.transactionId,
      amountPoisha: res.data.amountPoisha,
      counterpartyWalletNumber: request.requesterWalletNumber,
      note: null,
      createdAt: res.data.createdAt,
    });
    await Promise.all([loadAccount(), loadHistory(null, true)]);
  }

  async function decline(request: RequestInboxItemDto) {
    setActingRequestId(request.id);
    setError("");
    const res = await apiFetch<unknown>(`/api/requests/${request.id}/decline`, { method: "POST" });
    setActingRequestId(null);
    if (!res.ok) {
      setError(errorMessageForCode(t, res.error.code, "accept"));
      await loadRequests();
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    flash("toastDeclined", {});
  }

  function handleConfirmYes() {
    if (!confirm) return;
    if (confirm.kind === "send") void performSend(confirm);
    else void performAccept(confirm.request);
  }

  const dark = theme !== "light";
  const ON = { bg: "var(--db-card)", fg: "var(--db-fg)" };
  const OFF = { bg: "transparent", fg: "var(--db-muted-fg)" };
  const lightStyle = dark ? OFF : ON;
  const darkStyle = dark ? ON : OFF;
  const bnStyle = locale === "bn" ? ON : OFF;
  const enStyle = locale === "bn" ? OFF : ON;
  const sendOn = tab === "send";
  const previewAmountPoisha = previewPoisha(amount);
  const walletLabel = sendOn ? t.walletSend : t.walletRequest;
  const submitLabel = submitting
    ? t.submitting
    : sendOn
      ? previewAmountPoisha !== null
        ? fillTemplate(t.submitSend, { amt: formatPoishaAsBdt(previewAmountPoisha.toString(), locale) })
        : t.submitSendPlain
      : t.submitRequest;
  const formPrefix = sendOn ? "send-money" : "request-money";
  const quickAmounts = [500, 1200, 2500, 5000];
  const busy = submitting || actingRequestId !== null;

  const creditTxns = txns.filter((r) => r.direction === "CREDIT");
  const debitTxns = txns.filter((r) => r.direction === "DEBIT");
  const totalCreditPoisha = creditTxns.reduce((sum, r) => sum + BigInt(r.amountPoisha), 0n);
  const totalDebitPoisha = debitTxns.reduce((sum, r) => sum + BigInt(r.amountPoisha), 0n);

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
    width: "100%",
    border: "none",
    background: "transparent",
    textAlign: "left",
    fontFamily: "inherit",
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
          <button
            type="button"
            className="db-nav-item"
            data-testid="dashboard-nav-desktop-dashboard"
            aria-current={activeNav === "dashboard" ? "page" : undefined}
            onClick={showDashboard}
            style={{
              ...navItemStyle,
              fontWeight: 600,
            }}
          >
            <LayoutDashboard size={16} strokeWidth={2} color="var(--db-primary)" aria-hidden="true" />
            <span>{t.navDashboard}</span>
          </button>
          <button
            type="button"
            className="db-nav-item"
            data-testid="dashboard-nav-desktop-send"
            aria-current={activeNav === "send" ? "page" : undefined}
            style={navItemStyle}
            onClick={focusAmount}
          >
            <Send size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navSend}</span>
          </button>
          <button
            type="button"
            className="db-nav-item"
            data-testid="dashboard-nav-desktop-request"
            aria-current={activeNav === "request" ? "page" : undefined}
            style={navItemStyle}
            onClick={showRequestForm}
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
          </button>
          <button
            type="button"
            className="db-nav-item"
            data-testid="dashboard-nav-desktop-history"
            aria-current={activeNav === "history" ? "page" : undefined}
            style={navItemStyle}
            onClick={showHistory}
          >
            <History size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navHistory}</span>
          </button>
          <button
            type="button"
            className="db-nav-item"
            data-testid="dashboard-nav-desktop-reconcile"
            aria-current={activeNav === "reconcile" ? "page" : undefined}
            style={navItemStyle}
            onClick={showReconcile}
          >
            <Scale size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.navReconcile}</span>
          </button>
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
            }}
          >
            <Smartphone size={15} strokeWidth={2} aria-hidden="true" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
            <span
              data-testid="dashboard-wallet-number"
              style={{
                fontFamily: monoFontFamily,
                fontSize: 12.5,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {account?.walletNumber ?? "…"}
            </span>
            <span style={{ fontSize: 11, color: "var(--db-muted-fg)" }}>{t.active}</span>
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
              data-el="locale-control"
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
              data-el="theme-control"
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
              data-el="signout"
              type="button"
              data-testid="dashboard-sign-out-button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid var(--db-border)",
                cursor: signingOut ? "default" : "pointer",
                padding: "9px 14px",
                borderRadius: 9,
                background: "var(--db-card)",
                color: "var(--db-muted-fg)",
                fontSize: 12.5,
                fontWeight: 600,
                opacity: signingOut ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              <LogOut size={14} strokeWidth={2} aria-hidden="true" />
              <span>{signingOut ? t.signingOut : t.signOut}</span>
            </button>
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
            <div data-el="balance-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
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
                  {account ? formatPoishaAsBdt(account.balancePoisha, locale) : "…"}
                </span>
                <span style={{ fontFamily: monoFontFamily, fontSize: 12, opacity: 0.8 }}>
                  {account ? fillTemplate(t.poisha, { n: num(Number(BigInt(account.balancePoisha))) }) : ""}
                </span>
              </div>
              <div data-el="balance-meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flex: "0 0 auto" }}>
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
                <span style={{ fontFamily: monoFontFamily, fontSize: 12.5, opacity: 0.85 }}>{account?.walletNumber ?? ""}</span>
              </div>
            </div>
            <div data-el="balance-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                onClick={showRequestForm}
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
                {formatPoishaAsBdt(totalCreditPoisha.toString(), locale)}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)" }}>
                {fillTemplate(t.statsInSub, { n: num(creditTxns.length) })}
              </span>
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
                {formatPoishaAsBdt(totalDebitPoisha.toString(), locale)}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)" }}>
                {fillTemplate(t.statsOutSub, { n: num(debitTxns.length) })}
              </span>
            </div>
          </div>

          <section
            ref={formRef}
            data-el="pad"
            data-section="money-form"
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
            <div data-el="form-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", padding: 3, gap: 3, background: "var(--db-muted)", borderRadius: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav("send");
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
                    setActiveNav("request");
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
              <span data-el="idem" style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)" }}>
                <KeyRound size={13} strokeWidth={2} aria-hidden="true" />
                <span>Idempotency-Key: {idem || "…"}</span>
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
                    placeholder="01XXXXXXXXX"
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
                onClick={handleSubmitClick}
                disabled={submitting || (sendOn && idem === "")}
                data-testid={`${formPrefix}-submit`}
                className="db-btn-primary"
                style={{
                  border: "none",
                  cursor: submitting ? "default" : "pointer",
                  padding: "12px 22px",
                  borderRadius: 10,
                  background: "var(--db-primary)",
                  color: "var(--db-primary-fg)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  opacity: submitting ? 0.7 : 1,
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
                    <Smartphone size={14} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
                    <span
                      style={{
                        fontFamily: monoFontFamily,
                        fontSize: 12.5,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.requesterWalletNumber}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--db-muted-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.note ?? ""}
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
                    {formatPoishaAsBdt(r.amountPoisha, locale)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button
                    data-el="reqbtn"
                    type="button"
                    onClick={() => setConfirm({ kind: "accept", request: r })}
                    disabled={busy}
                    data-testid={`request-accept-${r.id}`}
                    className="db-btn-primary"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      border: "none",
                      cursor: busy ? "default" : "pointer",
                      padding: "8px 0",
                      borderRadius: 8,
                      background: "var(--db-primary)",
                      color: "var(--db-primary-fg)",
                      fontSize: 12.5,
                      fontWeight: 700,
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{actingRequestId === r.id ? t.accepting : t.accept}</span>
                  </button>
                  <button
                    data-el="reqbtn"
                    type="button"
                    onClick={() => void decline(r)}
                    disabled={busy}
                    data-testid={`request-decline-${r.id}`}
                    className="db-hover-fg"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      cursor: busy ? "default" : "pointer",
                      padding: "8px 0",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid var(--db-field-border)",
                      color: "var(--db-muted-fg)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    <X size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{actingRequestId === r.id ? t.declining : t.decline}</span>
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
            ref={historyRef}
            data-section="history"
            data-span="3"
            style={{ gridColumn: "span 3", background: "var(--db-card)", border: "1px solid var(--db-border)", borderRadius: 14, overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", borderBottom: "1px solid var(--db-border)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{t.txnTitle}</span>
                <span style={{ fontSize: 11.5, color: "var(--db-muted-fg)" }}>{t.txnSub}</span>
              </div>
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
              const credit = row.direction === "CREDIT";
              const Icon = credit ? ArrowDownLeft : ArrowUpRight;
              const chipFg = credit ? "var(--db-credit)" : "var(--db-debit)";
              const typeLabel = typeLabelFor(t, row.type);
              return (
                <div
                  key={row.transactionId}
                  data-el="txnrow"
                  data-testid={`history-row-${row.transactionId}`}
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
                      <span
                        style={{
                          fontFamily: monoFontFamily,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.counterpartyWalletNumber}
                      </span>
                      <span
                        data-el="mnote"
                        style={{ display: "none", fontSize: 11.5, color: "var(--db-muted-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {row.note ?? ""} · {typeLabel}
                      </span>
                      <span style={{ fontFamily: monoFontFamily, fontSize: 11, color: "var(--db-muted-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatTimestamp(row.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span data-col="note" style={{ color: "var(--db-muted-fg)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.note ?? ""}
                  </span>
                  <span
                    data-col="type"
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--db-muted-fg)", letterSpacing: "0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {typeLabel}
                  </span>
                  <span style={{ textAlign: "right", fontFamily: monoFontFamily, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: chipFg }}>
                    {(credit ? "+" : "−") + formatPoishaAsBdt(row.amountPoisha, locale)}
                  </span>
                  <span data-col="after" style={{ textAlign: "right", fontFamily: monoFontFamily, fontSize: 12.5, color: "var(--db-muted-fg)", fontVariantNumeric: "tabular-nums" }}>
                    {formatPoishaAsBdt(row.balanceAfterPoisha, locale)}
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
            {txns.length === 0 && !loadingMore && (
              <div style={{ padding: "26px 12px", textAlign: "center", color: "var(--db-muted-fg)", fontSize: 12.5 }}>{t.noMoreHistory}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
              <button
                type="button"
                onClick={() => void loadHistory(nextCursor, false)}
                disabled={loadingMore || nextCursor === null}
                data-testid="history-load-older"
                className="db-hover-fg"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: loadingMore || nextCursor === null ? "default" : "pointer",
                  padding: "9px 18px",
                  borderRadius: 9,
                  background: "transparent",
                  border: "1px solid var(--db-border)",
                  color: "var(--db-muted-fg)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  opacity: nextCursor === null ? 0.6 : 1,
                }}
              >
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                <span>{loadingMore ? t.loadingOlder : nextCursor === null ? t.noMoreHistory : t.loadOlder}</span>
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
          className="db-mobile-nav-item"
          data-testid="dashboard-nav-mobile-dashboard"
          aria-current={activeNav === "dashboard" ? "page" : undefined}
          onClick={showDashboard}
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
          <LayoutDashboard size={19} strokeWidth={2} aria-hidden="true" />
          <span>{t.navDashboard}</span>
        </button>
        <button
          type="button"
          className="db-mobile-nav-item"
          data-testid="dashboard-nav-mobile-send"
          aria-current={activeNav === "send" ? "page" : undefined}
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
          className="db-mobile-nav-item"
          data-testid="dashboard-nav-mobile-request"
          aria-current={activeNav === "request" ? "page" : undefined}
          onClick={showRequestForm}
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
          className="db-mobile-nav-item"
          data-testid="dashboard-nav-mobile-history"
          aria-current={activeNav === "history" ? "page" : undefined}
          onClick={showHistory}
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

      {confirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(0 0 0 / 45%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            padding: 16,
          }}
        >
          <div
            data-testid="confirm-dialog"
            style={{
              background: "var(--db-card)",
              border: "1px solid var(--db-border)",
              borderRadius: 14,
              padding: 22,
              width: 340,
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>
              {confirm.kind === "send" ? t.confirmSendTitle : t.confirmAcceptTitle}
            </span>
            <span style={{ fontSize: 13, color: "var(--db-muted-fg)", lineHeight: 1.5 }}>
              {confirm.kind === "send"
                ? fillTemplate(t.confirmSendBody, {
                    amt: formatPoishaAsBdt(confirm.amountPoisha.toString(), locale),
                    to: confirm.toWallet,
                  })
                : fillTemplate(t.confirmAcceptBody, {
                    amt: formatPoishaAsBdt(confirm.request.amountPoisha, locale),
                    to: confirm.request.requesterWalletNumber,
                  })}
            </span>
            <div style={{ display: "flex", gap: 9 }}>
              <button
                type="button"
                data-testid="confirm-cancel"
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="db-hover-fg"
                style={{
                  flex: 1,
                  cursor: busy ? "default" : "pointer",
                  padding: "11px 0",
                  borderRadius: 9,
                  background: "transparent",
                  border: "1px solid var(--db-field-border)",
                  color: "var(--db-muted-fg)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t.confirmCancel}
              </button>
              <button
                type="button"
                data-testid="confirm-yes"
                onClick={handleConfirmYes}
                disabled={busy}
                className="db-btn-primary"
                style={{
                  flex: 1,
                  border: "none",
                  cursor: busy ? "default" : "pointer",
                  padding: "11px 0",
                  borderRadius: 9,
                  background: "var(--db-primary)",
                  color: "var(--db-primary-fg)",
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(0 0 0 / 45%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            padding: 16,
          }}
        >
          <div
            data-testid="receipt"
            style={{
              background: "var(--db-card)",
              border: "1px solid var(--db-border)",
              borderRadius: 14,
              padding: 22,
              width: 360,
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t.receiptTitle}</span>
              <button
                type="button"
                data-testid="receipt-close"
                onClick={() => setReceipt(null)}
                aria-label={t.receiptDone}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--db-muted-fg)", padding: 4 }}
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "6px 0 10px" }}>
              <ShieldCheck size={26} strokeWidth={2} color="var(--db-credit)" aria-hidden="true" />
              <span
                data-testid="receipt-amount"
                style={{ fontFamily: monoFontFamily, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {formatPoishaAsBdt(receipt.amountPoisha, locale)}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "var(--db-muted-fg)" }}>{t.receiptCounterparty}</span>
                <span style={{ fontFamily: monoFontFamily }}>{receipt.counterpartyWalletNumber}</span>
              </div>
              {receipt.note && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "var(--db-muted-fg)" }}>{t.receiptNote}</span>
                  <span>{receipt.note}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "var(--db-muted-fg)" }}>{t.receiptTime}</span>
                <span>{formatTimestamp(receipt.createdAt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "var(--db-muted-fg)" }}>{t.receiptTxnId}</span>
                <span
                  style={{
                    fontFamily: monoFontFamily,
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 180,
                  }}
                >
                  {receipt.transactionId}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="db-btn-primary"
              style={{
                border: "none",
                cursor: "pointer",
                padding: "11px 0",
                borderRadius: 9,
                background: "var(--db-primary)",
                color: "var(--db-primary-fg)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {t.receiptDone}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
