"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { Hind_Siliguri, Anek_Bangla, Baloo_Da_2, JetBrains_Mono } from "next/font/google";
import {
  Banknote,
  Wallet,
  Send,
  HandCoins,
  ReceiptText,
  Languages,
  UserPlus,
  Scale,
  CopyCheck,
  ShieldCheck,
  GitCompareArrows,
  Lock,
  LogIn,
  ArrowRight,
  Smartphone,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { LANDING_COPY, type IconKey, type Locale } from "@/components/landing/landing-content";
import "@/components/landing/landing.css";

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

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--bp-font-mono" });

const headingFontFamily =
  "var(--font-baloo-da-2), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

// JetBrains Mono has no Bengali glyphs, so digits/labels in Bangla fall
// through to Anek Bangla/Hind Siliguri instead of an unstyled system font.
const monoFontFamily =
  "var(--bp-font-mono), var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif";

const ICONS: Record<IconKey, LucideIcon> = {
  send: Send,
  "hand-coins": HandCoins,
  "receipt-text": ReceiptText,
  languages: Languages,
  "user-plus": UserPlus,
  scale: Scale,
  "copy-check": CopyCheck,
  "shield-check": ShieldCheck,
  "git-compare-arrows": GitCompareArrows,
  lock: Lock,
};

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return [ref, inView] as const;
}

function Reveal({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, inView] = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`bp-reveal${inView ? " bp-in" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const [locale, setLocale] = useState<Locale>("bn");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const t = LANDING_COPY[locale];

  const onTabStyle = { background: "var(--bp-secondary)", color: "var(--bp-fg)" };
  const offTabStyle = { background: "transparent", color: "var(--bp-muted-fg)" };

  return (
    <div
      data-theme={theme}
      lang={locale}
      className={`bp-landing ${hindSiliguri.variable} ${anekBangla.variable} ${balooDa2.variable} ${jetBrainsMono.variable}`}
      style={{
        minHeight: "100vh",
        fontFamily: "var(--font-anek-bangla), var(--font-hind-siliguri), sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-border)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "14px clamp(16px, 4vw, 40px)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: "var(--bp-accent)",
                color: "var(--bp-accent-fg)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Banknote size={17} strokeWidth={2} aria-hidden="true" />
            </div>
            <span
              style={{ fontFamily: headingFontFamily, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em" }}
            >
              {t.brand}
            </span>
          </div>

          <nav
            data-el="navlinks"
            style={{ display: "flex", alignItems: "center", gap: 22, marginLeft: 20 }}
          >
            <a href="#features" className="bp-link-muted" style={{ fontSize: 13.5, fontWeight: 500 }}>
              {t.navFeatures}
            </a>
            <a href="#how" className="bp-link-muted" style={{ fontSize: 13.5, fontWeight: 500 }}>
              {t.navHow}
            </a>
            <a href="#trust" className="bp-link-muted" style={{ fontSize: 13.5, fontWeight: 500 }}>
              {t.navTrust}
            </a>
          </nav>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: "0 0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: 3,
                gap: 3,
                border: "1px solid var(--bp-border)",
                borderRadius: 9,
              }}
            >
              <Languages
                size={15}
                strokeWidth={2}
                color="var(--bp-muted-fg)"
                aria-hidden="true"
                style={{ margin: "0 4px 0 6px" }}
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
                  ...(locale === "bn" ? onTabStyle : offTabStyle),
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
                  ...(locale === "en" ? onTabStyle : offTabStyle),
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
              className="bp-icon-btn"
              style={{
                cursor: "pointer",
                width: 36,
                height: 36,
                borderRadius: 9,
                border: "1px solid var(--bp-border)",
                background: "transparent",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Moon size={16} strokeWidth={2} aria-hidden="true" data-icon="moon" />
              <Sun size={16} strokeWidth={2} aria-hidden="true" data-icon="sun" />
            </button>

            <Link
              data-el="navlogin"
              data-testid="nav-login-link"
              href="/login"
              className="bp-outline-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 14px",
                borderRadius: 9,
                border: "1px solid var(--bp-border)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--bp-fg)",
                whiteSpace: "nowrap",
              }}
            >
              <LogIn size={15} strokeWidth={2} aria-hidden="true" />
              <span>{t.login}</span>
            </Link>

            <Link
              href="/register"
              data-testid="nav-signup-link"
              className="bp-btn-primary-nav"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 9,
                background: "var(--bp-primary)",
                color: "var(--bp-primary-fg)",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <UserPlus size={15} strokeWidth={2} aria-hidden="true" />
              <span>{t.signup}</span>
            </Link>
          </div>
        </div>
      </header>

      <section
        data-el="hero"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding:
            "clamp(36px, 7vw, 88px) clamp(16px, 4vw, 40px) clamp(28px, 5vw, 56px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "clamp(28px, 5vw, 56px)",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <span
            className="bp-hero"
            style={{
              animationDelay: "0s",
              display: "flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              padding: "6px 13px",
              borderRadius: 999,
              background: "var(--bp-pending-surface)",
              color: "var(--bp-pending)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Wallet size={14} strokeWidth={2} aria-hidden="true" />
            <span>{t.heroBadge}</span>
          </span>

          <h1
            data-testid="hero-title"
            className="bp-hero"
            style={{
              animationDelay: "0.07s",
              margin: 0,
              fontFamily: headingFontFamily,
              fontSize: "clamp(31px, 5.4vw, 52px)",
              lineHeight: 1.18,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              textWrap: "pretty",
            }}
          >
            {t.heroTitle}
          </h1>

          <p
            className="bp-hero"
            style={{
              animationDelay: "0.14s",
              margin: 0,
              fontSize: "clamp(14.5px, 1.5vw, 17px)",
              lineHeight: 1.6,
              color: "var(--bp-muted-fg)",
              maxWidth: "46ch",
              textWrap: "pretty",
            }}
          >
            {t.heroSub}
          </p>

          <div
            data-el="herocta"
            className="bp-hero"
            style={{
              animationDelay: "0.21s",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/register"
              data-testid="hero-signup-link"
              className="bp-btn-primary-lg"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                whiteSpace: "nowrap",
                padding: "14px 26px",
                borderRadius: 11,
                background: "var(--bp-primary)",
                color: "var(--bp-primary-fg)",
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              <span>{t.ctaPrimary}</span>
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              data-testid="hero-login-link"
              className="bp-outline-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                whiteSpace: "nowrap",
                padding: "14px 26px",
                borderRadius: 11,
                border: "1px solid var(--bp-border)",
                color: "var(--bp-fg)",
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              <LogIn size={16} strokeWidth={2} aria-hidden="true" />
              <span>{t.login}</span>
            </Link>
          </div>

          <div
            className="bp-hero"
            style={{
              animationDelay: "0.28s",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--bp-muted-fg)",
              fontSize: 12.5,
            }}
          >
            <Smartphone size={15} strokeWidth={2} color="var(--bp-credit)" aria-hidden="true" />
            <span>{t.heroFoot}</span>
          </div>
        </div>

        <div
          className="bp-float"
          style={{
            backgroundImage: "var(--bp-grad)",
            borderRadius: 20,
            padding: "clamp(24px, 3.4vw, 36px)",
            boxShadow: "var(--bp-glow)",
            color: "var(--bp-on-grad)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(20px, 2.6vw, 28px)",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 13px",
                borderRadius: 999,
                background: "oklch(0.985 0.006 320 / 16%)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Wallet size={14} strokeWidth={2} aria-hidden="true" />
              <span>{t.bannerOffer}</span>
            </span>
            <span
              style={{
                flex: "0 0 auto",
                padding: "6px 13px",
                borderRadius: 999,
                background: "var(--bp-accent)",
                color: "var(--bp-accent-fg)",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {t.bannerFree}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontFamily: monoFontFamily,
                fontSize: "clamp(36px, 5vw, 50px)",
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {t.bannerAmount}
            </span>
            <span style={{ fontSize: "clamp(13px, 1.5vw, 15px)", fontWeight: 600, opacity: 0.85 }}>
              {t.bannerAmountSub}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "oklch(0.985 0.006 320 / 16%)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Wallet size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{t.bannerYou}</span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0, paddingBottom: 18 }}>
              <span style={{ flex: 1, borderTop: "2px dashed oklch(0.985 0.006 320 / 40%)" }} />
              <span
                style={{
                  flex: "0 0 auto",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "oklch(0.985 0.006 320)",
                  color: "oklch(0.3 0.12 315)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 4px",
                }}
              >
                <Send size={15} strokeWidth={2} aria-hidden="true" />
              </span>
              <span style={{ flex: 1, borderTop: "2px dashed oklch(0.985 0.006 320 / 40%)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "oklch(0.985 0.006 320 / 16%)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <HandCoins size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{t.bannerThem}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { icon: Send, label: t.bannerChip1 },
              { icon: ShieldCheck, label: t.bannerChip2 },
              { icon: Languages, label: t.bannerChip3 },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "oklch(0.985 0.006 320 / 13%)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Icon size={13} strokeWidth={2} aria-hidden="true" />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--bp-band)", borderTop: "1px solid var(--bp-border)", borderBottom: "1px solid var(--bp-border)" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "clamp(22px, 3.5vw, 34px) clamp(16px, 4vw, 40px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 22,
          }}
        >
          {t.stats.map((row) => (
            <Reveal key={row.label} style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: monoFontFamily,
                  fontSize: "clamp(21px, 2.6vw, 27px)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                {row.value}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--bp-muted-fg)", lineHeight: 1.45 }}>{row.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="features"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(40px, 6vw, 76px) clamp(16px, 4vw, 40px) clamp(20px, 3vw, 32px)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(24px, 3.5vw, 38px)",
        }}
      >
        <Reveal style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "60ch" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--bp-primary)" }}>
            {t.featuresKicker}
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: headingFontFamily,
              fontSize: "clamp(23px, 3.2vw, 34px)",
              fontWeight: 700,
              letterSpacing: "-0.022em",
              lineHeight: 1.25,
              textWrap: "pretty",
            }}
          >
            {t.featuresTitle}
          </h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))", gap: "clamp(14px, 2vw, 20px)" }}>
          {t.features.map((row, i) => {
            const Icon = ICONS[row.icon];
            const marks = ["var(--bp-primary)", "var(--bp-accent)", "var(--bp-credit)", "var(--bp-pending)"];
            const surfaces = [
              "oklch(0.715 0.235 322 / 16%)",
              "var(--bp-pending-surface)",
              "var(--bp-credit-surface)",
              "var(--bp-pending-surface)",
            ];
            return (
              <Reveal
                key={row.title}
                className="bp-card-hover"
                style={{
                  background: "var(--bp-card)",
                  border: "1px solid var(--bp-border)",
                  borderRadius: 15,
                  padding: "clamp(18px, 2.4vw, 24px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: surfaces[i % 4],
                    color: marks[i % 4],
                  }}
                >
                  <Icon size={17} strokeWidth={2} aria-hidden="true" />
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{row.title}</span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--bp-muted-fg)", textWrap: "pretty" }}>
                  {row.body}
                </span>
              </Reveal>
            );
          })}
        </div>
      </section>

      <HowItWorks steps={t.steps} howTitle={t.howTitle} />

      <section
        id="trust"
        style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(20px, 3vw, 32px) clamp(16px, 4vw, 40px) clamp(40px, 6vw, 72px)" }}
      >
        <div
          style={{
            background: "var(--bp-band)",
            border: "1px solid var(--bp-border)",
            borderRadius: 18,
            padding: "clamp(22px, 3.4vw, 40px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "clamp(20px, 3vw, 40px)",
          }}
        >
          <Reveal style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: headingFontFamily,
                fontSize: "clamp(21px, 2.8vw, 29px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.28,
                textWrap: "pretty",
              }}
            >
              {t.trustTitle}
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--bp-muted-fg)", maxWidth: "44ch", textWrap: "pretty" }}>
              {t.trustBody}
            </p>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            {t.guarantees.map((row) => {
              const Icon = ICONS[row.icon];
              return (
                <Reveal
                  key={row.title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    padding: "12px 14px",
                    borderRadius: 11,
                    background: "var(--bp-card)",
                    border: "1px solid var(--bp-border)",
                  }}
                >
                  <Icon size={16} strokeWidth={2} color="var(--bp-credit)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{row.title}</span>
                    <span style={{ fontSize: 12, color: "var(--bp-muted-fg)", lineHeight: 1.5, textWrap: "pretty" }}>
                      {row.body}
                    </span>
                  </span>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="signup" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px) clamp(40px, 6vw, 72px)" }}>
        <Reveal
          style={{
            backgroundImage: "var(--bp-grad)",
            borderRadius: 18,
            padding: "clamp(26px, 4vw, 48px)",
            boxShadow: "var(--bp-glow)",
            color: "var(--bp-on-grad)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: headingFontFamily,
              fontSize: "clamp(23px, 3.4vw, 36px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              maxWidth: "26ch",
              textWrap: "pretty",
            }}
          >
            {t.finalTitle}
          </h2>
          <p style={{ margin: 0, fontSize: "clamp(13.5px, 1.5vw, 16px)", lineHeight: 1.6, opacity: 0.86, maxWidth: "48ch", textWrap: "pretty" }}>
            {t.finalSub}
          </p>
          <div data-el="ctarow" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%" }}>
            <Link
              href="/register"
              data-testid="final-signup-link"
              className="bp-btn-white"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                whiteSpace: "nowrap",
                padding: "14px 28px",
                borderRadius: 11,
                background: "oklch(0.985 0.006 320)",
                color: "oklch(0.3 0.12 315)",
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
              <span>{t.ctaPrimary}</span>
            </Link>
            <Link
              href="/login"
              data-testid="final-login-link"
              className="bp-btn-ghost-white"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                whiteSpace: "nowrap",
                padding: "14px 28px",
                borderRadius: 11,
                border: "1px solid oklch(0.985 0.006 320 / 45%)",
                color: "oklch(0.985 0.006 320)",
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              <LogIn size={16} strokeWidth={2} aria-hidden="true" />
              <span>{t.login}</span>
            </Link>
          </div>
          <span style={{ fontFamily: monoFontFamily, fontSize: 12, opacity: 0.8 }}>{t.finalFoot}</span>
        </Reveal>
      </section>

      <footer style={{ borderTop: "1px solid var(--bp-border)" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "clamp(22px, 3vw, 34px) clamp(16px, 4vw, 40px)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: "var(--bp-accent)",
                color: "var(--bp-accent-fg)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Banknote size={14} strokeWidth={2} aria-hidden="true" />
            </div>
            <span style={{ fontFamily: headingFontFamily, fontSize: 13.5, fontWeight: 700 }}>{t.brand}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginLeft: "auto" }}>
            <a href="#features" className="bp-link-muted" style={{ fontSize: 12.5 }}>
              {t.navFeatures}
            </a>
            <a href="#how" className="bp-link-muted" style={{ fontSize: 12.5 }}>
              {t.navHow}
            </a>
            <a href="#trust" className="bp-link-muted" style={{ fontSize: 12.5 }}>
              {t.navTrust}
            </a>
            <Link
              href="/login"
              data-testid="footer-login-link"
              className="bp-link-muted"
              style={{ fontSize: 12.5 }}
            >
              {t.login}
            </Link>
          </div>
          <span style={{ flex: "1 1 100%", fontSize: 11.5, color: "var(--bp-muted-fg)", lineHeight: 1.5 }}>
            {t.footerNote}
          </span>
        </div>
      </footer>
    </div>
  );
}

function HowItWorks({
  steps,
  howTitle,
}: {
  steps: (typeof LANDING_COPY)["en"]["steps"];
  howTitle: string;
}) {
  const [titleRef, titleInView] = useReveal<HTMLHeadingElement>();
  return (
    <section
      id="how"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(34px, 5vw, 64px) clamp(16px, 4vw, 40px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(20px, 3vw, 32px)",
      }}
    >
      <h2
        ref={titleRef}
        className={`bp-reveal${titleInView ? " bp-in" : ""}`}
        style={{
          margin: 0,
          fontFamily: headingFontFamily,
          fontSize: "clamp(23px, 3.2vw, 34px)",
          fontWeight: 700,
          letterSpacing: "-0.022em",
          lineHeight: 1.25,
        }}
      >
        {howTitle}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "clamp(14px, 2vw, 22px)" }}>
        {steps.map((row) => {
          const Icon = ICONS[row.icon];
          return (
            <Reveal
              key={row.n}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingTop: 18,
                borderTop: "2px solid var(--bp-border)",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Icon size={16} strokeWidth={2} color="var(--bp-primary)" aria-hidden="true" />
                <span style={{ fontFamily: monoFontFamily, fontSize: 12.5, fontWeight: 600, color: "var(--bp-primary)" }}>
                  {row.n}
                </span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{row.title}</span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--bp-muted-fg)", textWrap: "pretty" }}>{row.body}</span>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
