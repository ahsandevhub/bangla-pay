export type Locale = "bn" | "en";

export type IconKey =
  | "send"
  | "hand-coins"
  | "receipt-text"
  | "languages"
  | "user-plus"
  | "scale"
  | "copy-check"
  | "shield-check"
  | "git-compare-arrows"
  | "lock";

export interface StatItem {
  value: string;
  label: string;
}

export interface FeatureItem {
  icon: IconKey;
  title: string;
  body: string;
}

export interface StepItem {
  icon: IconKey;
  n: string;
  title: string;
  body: string;
}

export interface GuaranteeItem {
  icon: IconKey;
  title: string;
  body: string;
}

export interface LandingCopy {
  brand: string;
  navFeatures: string;
  navHow: string;
  navTrust: string;
  login: string;
  signup: string;
  themeToggle: string;
  heroBadge: string;
  heroTitle: string;
  heroSub: string;
  ctaPrimary: string;
  heroFoot: string;
  bannerOffer: string;
  bannerFree: string;
  bannerAmount: string;
  bannerAmountSub: string;
  bannerYou: string;
  bannerThem: string;
  bannerChip1: string;
  bannerChip2: string;
  bannerChip3: string;
  featuresKicker: string;
  featuresTitle: string;
  howTitle: string;
  trustTitle: string;
  trustBody: string;
  finalTitle: string;
  finalSub: string;
  finalFoot: string;
  footerNote: string;
  stats: StatItem[];
  features: FeatureItem[];
  steps: StepItem[];
  guarantees: GuaranteeItem[];
}

export const LANDING_COPY: Record<Locale, LandingCopy> = {
  bn: {
    brand: "বাংলাপে",
    navFeatures: "সুবিধা",
    navHow: "যেভাবে কাজ করে",
    navTrust: "নির্ভরযোগ্যতা",
    login: "লগ ইন",
    signup: "সাইন আপ",
    themeToggle: "থিম পরিবর্তন",
    heroBadge: "নতুন রেজিস্ট্রেশনে ৳১,০০,০০০ ব্যালেন্স",
    heroTitle: "টাকা পাঠান, চান, মিলিয়ে দেখুন — সেকেন্ডে।",
    heroSub:
      "বাংলাপে একটি বদ্ধ অর্থব্যবস্থা, যেখানে প্রতিটি লেনদেন ডাবল-এন্ট্রি লেজারে লেখা হয়। ব্যালেন্স কখনো ক্যাশ থেকে দেখানো হয় না, তাই আপনি যা দেখছেন সেটাই সত্যি।",
    ctaPrimary: "বিনামূল্যে অ্যাকাউন্ট খুলুন",
    heroFoot: "আপনার ফোন নম্বরই ওয়ালেট নম্বর — আলাদা কার্ড লাগে না।",
    bannerOffer: "সাইন আপ বোনাস",
    bannerFree: "কোনো ফি নেই",
    bannerAmount: "৳১,০০,০০০",
    bannerAmountSub: "রেজিস্ট্রেশনের সঙ্গে সঙ্গে আপনার ওয়ালেটে",
    bannerYou: "আপনি",
    bannerThem: "প্রাপক",
    bannerChip1: "তাৎক্ষণিক",
    bannerChip2: "নিরাপদ",
    bannerChip3: "বাংলা-প্রথম",
    featuresKicker: "যা যা করতে পারবেন",
    featuresTitle: "দৈনন্দিন টাকা লেনদেনের জন্য যতটুকু দরকার — ঠিক ততটুকুই।",
    howTitle: "তিন ধাপে শুরু",
    trustTitle: "বিশ্বাস তৈরি হয় হিসাবের নির্ভুলতায়, বিজ্ঞাপনে নয়।",
    trustBody:
      "প্রতিটি ট্রান্সফার একটি Postgres ট্রানজ্যাকশনে একটি ডেবিট ও একটি ক্রেডিট লেখে, যোগফল শূন্য। কোনো এন্ট্রি কখনো মুছে ফেলা বা বদলানো হয় না — সংশোধন হয় নতুন সমন্বয় এন্ট্রির মাধ্যমে।",
    finalTitle: "আজই বাংলাপে দিয়ে টাকা পাঠানো শুরু করুন।",
    finalSub:
      "রেজিস্ট্রেশনের সঙ্গে সঙ্গে ৳১,০০,০০০ সিমুলেটেড ব্যালেন্স পাবেন। কোনো ফি নেই, কোনো কার্ড লাগবে না, অপেক্ষাও না।",
    finalFoot: "বদ্ধ ইকোসিস্টেম · সিমুলেটেড ফান্ড · পিএসটিইউ জাতীয় হ্যাকাথন ২০২৬",
    footerNote:
      "© ২০২৬ বাংলাপে। জাতীয় হ্যাকাথনের জন্য তৈরি একটি ডেমো — বাস্তব টাকা লেনদেন হয় না।",
    stats: [
      { value: "৳১,০০,০০০", label: "রেজিস্ট্রেশনে ব্যালেন্স" },
      { value: "<২৫০ মি.সে.", label: "গড় ট্রান্সফার নিষ্পত্তি" },
      { value: "০ গরমিল", label: "প্রতিটি অ্যাকাউন্টে লেজার মিলে যায়" },
    ],
    features: [
      {
        icon: "send",
        title: "তাৎক্ষণিক ট্রান্সফার",
        body: "ওয়ালেট নম্বর, পরিমাণ, নোট — ব্যাস। ব্যালেন্স না থাকলে লেনদেন কখনো শুরুই হয় না।",
      },
      {
        icon: "hand-coins",
        title: "টাকার অনুরোধ",
        body: "কেউ আপনার কাছে পাওনা থাকলে অনুরোধ পাঠান। তিনি এক ট্যাপে গ্রহণ বা প্রত্যাখ্যান করতে পারবেন, নিষ্পত্তি হয় অ্যাটমিক।",
      },
      {
        icon: "receipt-text",
        title: "পাই-পাই হিসাব",
        body: "প্রতিটি লেনদেনের পরের ব্যালেন্সসহ পূর্ণ ইতিহাস — নিজের হিসাব নিজেই মিলিয়ে দেখা যায়।",
      },
      {
        icon: "languages",
        title: "বাংলা-প্রথম",
        body: "পুরো অ্যাপ বাংলা সংখ্যাসহ বাংলায়। এক ট্যাপে ইংরেজি, আর লাইট বা ডার্ক থিমও পাবেন।",
      },
    ],
    steps: [
      {
        icon: "user-plus",
        n: "০১",
        title: "ফোন নম্বর দিয়ে সাইন আপ",
        body: "আপনার নম্বরই হয়ে যায় ওয়ালেট নম্বর, আর প্রকৃত লেজার এন্ট্রির মাধ্যমে যোগ হয় ৳১,০০,০০০।",
      },
      {
        icon: "send",
        n: "০২",
        title: "পাঠান বা অনুরোধ করুন",
        body: "ওয়ালেট নম্বর ও পরিমাণ দিন। দুইবার ট্যাপ করলেও দুইবার টাকা কাটে না।",
      },
      {
        icon: "scale",
        n: "০৩",
        title: "যেকোনো সময় হিসাব মেলান",
        body: "প্রতিটি এন্ট্রির পরের ব্যালেন্স দেখুন, যখন খুশি নিজের হিসাব যাচাই করুন।",
      },
    ],
    guarantees: [
      {
        icon: "copy-check",
        title: "দুইবার টাকা কাটে না",
        body: "একই অনুরোধ আবার পাঠালে আগের লেনদেনটিই ফিরে আসে, নতুন করে টাকা কাটে না।",
      },
      {
        icon: "shield-check",
        title: "ঋণাত্মক ব্যালেন্স অসম্ভব",
        body: "এই যাচাই ডেটাবেস রাইটের ভেতরেই হয়, অ্যাপ্লিকেশন কোডে নয়।",
      },
      {
        icon: "git-compare-arrows",
        title: "একসাথে অনেক লেনদেনেও নিরাপদ",
        body: "নির্দিষ্ট ক্রমে লক নেওয়ায় ডেডলক বা হারানো আপডেট হয় না।",
      },
      {
        icon: "lock",
        title: "কেউ সরাসরি ব্যালেন্স বদলাতে পারে না",
        body: "প্রতিটি রাইট যায় নিয়ন্ত্রিত সার্ভার-সাইড ফাংশনের ভেতর দিয়ে।",
      },
    ],
  },
  en: {
    brand: "BanglaPay",
    navFeatures: "Features",
    navHow: "How it works",
    navTrust: "Trust",
    login: "Log in",
    signup: "Sign up",
    themeToggle: "Switch theme",
    heroBadge: "New accounts start with ৳100,000",
    heroTitle: "Send, request and reconcile money in seconds.",
    heroSub:
      "BanglaPay is a closed money ecosystem where every transaction is written to a double-entry ledger. Balances are never served from cache, so what you see is what you have.",
    ctaPrimary: "Create a free account",
    heroFoot: "Your phone number is your wallet number — no card needed.",
    bannerOffer: "Sign-up bonus",
    bannerFree: "No fees",
    bannerAmount: "৳100,000",
    bannerAmountSub: "in your wallet the moment you register",
    bannerYou: "You",
    bannerThem: "Recipient",
    bannerChip1: "Instant",
    bannerChip2: "Secure",
    bannerChip3: "Bangla-first",
    featuresKicker: "What you can do",
    featuresTitle:
      "Everything everyday money movement needs — and nothing it does not.",
    howTitle: "Three steps to start",
    trustTitle: "Trust is earned in the accounting, not the advertising.",
    trustBody:
      "Every transfer writes one debit and one credit in a single Postgres transaction, netting to zero. No entry is ever updated or deleted — corrections are compensating entries.",
    finalTitle: "Start moving money with BanglaPay today.",
    finalSub:
      "Sign up and ৳100,000 of simulated balance lands in your wallet. No fees, no card, no waiting.",
    finalFoot: "Closed ecosystem · simulated funds · PSTU National Hackathon 2026",
    footerNote:
      "© 2026 BanglaPay. A demo built for the National Hackathon — no real money moves.",
    stats: [
      { value: "৳100,000", label: "Funded at sign-up" },
      { value: "<250 ms", label: "Median transfer settlement" },
      { value: "0 mismatches", label: "Ledger reconciles for every account" },
    ],
    features: [
      {
        icon: "send",
        title: "Instant transfers",
        body: "Wallet number, amount, note — done. If the balance is not there, the transfer never starts.",
      },
      {
        icon: "hand-coins",
        title: "Money requests",
        body: "Ask for what you are owed. The payer accepts or declines in one tap, and settlement is atomic.",
      },
      {
        icon: "receipt-text",
        title: "Poisha-exact history",
        body: "Every transaction shows the balance after it, so you can audit your own account line by line.",
      },
      {
        icon: "languages",
        title: "Bangla-first",
        body: "The whole app in Bangla with Bengali numerals. English is one tap away, light and dark too.",
      },
    ],
    steps: [
      {
        icon: "user-plus",
        n: "01",
        title: "Sign up with your phone",
        body: "Your number becomes your wallet number, and ৳100,000 is funded through a real ledger entry.",
      },
      {
        icon: "send",
        n: "02",
        title: "Send or request",
        body: "Enter a wallet number and amount. Double-tapping send never charges you twice.",
      },
      {
        icon: "scale",
        n: "03",
        title: "Reconcile anytime",
        body: "See the balance after every entry and check your own books whenever you want.",
      },
    ],
    guarantees: [
      {
        icon: "copy-check",
        title: "Never charged twice",
        body: "A replayed request returns the original transaction instead of a second charge.",
      },
      {
        icon: "shield-check",
        title: "Balances cannot go negative",
        body: "The check lives inside the database write, not in application code.",
      },
      {
        icon: "git-compare-arrows",
        title: "Safe under concurrency",
        body: "Deterministic lock ordering means no deadlocks and no lost updates.",
      },
      {
        icon: "lock",
        title: "No client can edit a balance",
        body: "Every write goes through a controlled server-side function.",
      },
    ],
  },
};
