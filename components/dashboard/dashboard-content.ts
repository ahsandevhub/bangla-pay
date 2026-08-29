export type Locale = "bn" | "en";
export type TxnType = "TRANSFER" | "SETTLEMENT" | "FUNDING";
export type TxnDirection = "DEBIT" | "CREDIT";

export interface LocalizedText {
  bn: string;
  en: string;
}

export interface SeedRequest {
  id: string;
  name: LocalizedText;
  initials: LocalizedText;
  note: LocalizedText;
  amountPoisha: number;
}

export interface SeedTxn {
  id: string;
  name: LocalizedText;
  note: LocalizedText;
  type: TxnType;
  dir: TxnDirection;
  amountPoisha: number;
  afterPoisha: number;
  time: LocalizedText | null;
}

export interface DashboardCopy {
  brand: string;
  tagline: string;
  navDashboard: string;
  navSend: string;
  navRequests: string;
  navHistory: string;
  navReconcile: string;
  ledgerOk: string;
  ledgerDesc: string;
  ledgerMeta: string;
  userName: string;
  userInitials: string;
  headerTitle: string;
  headerSub: string;
  light: string;
  dark: string;
  balanceLabel: string;
  active: string;
  send: string;
  request: string;
  poisha: string;
  reconciled: string;
  twoMin: string;
  statsIn: string;
  statsOut: string;
  statsCredits: string;
  statsDebits: string;
  tabSend: string;
  tabRequest: string;
  walletSend: string;
  walletRequest: string;
  amount: string;
  note: string;
  optional: string;
  notePlaceholder: string;
  formFootnote: string;
  submitSend: string;
  submitSendPlain: string;
  submitRequest: string;
  errWallet: string;
  errAmount: string;
  errFunds: string;
  errFundsRequest: string;
  inboxTitle: string;
  inboxExpiry: string;
  accept: string;
  decline: string;
  inboxEmpty1: string;
  inboxEmpty2: string;
  txnTitle: string;
  txnSub: string;
  colCounterparty: string;
  colNote: string;
  colType: string;
  colAmount: string;
  colAfter: string;
  colStatus: string;
  loadOlder: string;
  completed: string;
  typeTRANSFER: string;
  typeSETTLEMENT: string;
  typeFUNDING: string;
  toastSent: string;
  toastRequested: string;
  toastPaid: string;
  toastDeclined: string;
  justNow: string;
}

export const DASHBOARD_COPY: Record<Locale, DashboardCopy> = {
  bn: {
    brand: "বাংলাপে",
    tagline: "বদ্ধ অর্থব্যবস্থা",
    navDashboard: "ড্যাশবোর্ড",
    navSend: "টাকা পাঠান",
    navRequests: "অনুরোধ",
    navHistory: "লেনদেনের ইতিহাস",
    navReconcile: "হিসাব মিলকরণ",
    ledgerOk: "লেজার মিলে গেছে",
    ledgerDesc: "প্রতিটি অ্যাকাউন্টের ক্যাশ করা ব্যালেন্স ডাবল-এন্ট্রি লেজারের যোগফলের সমান।",
    ledgerMeta: "{n} এন্ট্রি · নিট {amt}",
    userName: "আয়েশা রহমান",
    userInitials: "আয়",
    headerTitle: "ড্যাশবোর্ড",
    headerSub: "ব্যালেন্স সব সময় প্রাইমারি ডেটাবেস থেকে পড়া হয় — ক্যাশ থেকে নয়।",
    light: "লাইট",
    dark: "ডার্ক",
    balanceLabel: "ব্যবহারযোগ্য ব্যালেন্স",
    active: "সক্রিয়",
    send: "পাঠান",
    request: "অনুরোধ",
    poisha: "{n} পয়সা · bigint",
    reconciled: "সর্বশেষ মিলকরণ {t}",
    twoMin: "২ মিনিট আগে",
    statsIn: "জমা · ৩০ দিন",
    statsOut: "খরচ · ৩০ দিন",
    statsCredits: "১৪টি জমা",
    statsDebits: "২১টি খরচ · সীমা ১০/মিনিট",
    tabSend: "টাকা পাঠান",
    tabRequest: "টাকা চান",
    walletSend: "প্রাপকের ওয়ালেট",
    walletRequest: "পরিশোধকারীর ওয়ালেট",
    amount: "পরিমাণ",
    note: "নোট",
    optional: "ঐচ্ছিক",
    notePlaceholder: "কী বাবদ?",
    formFootnote: "ডেবিট ও ক্রেডিট একটি সম্পূর্ণ Postgres ট্রানজ্যাকশনে লেখা হয়। একই কি দিয়ে আবার পাঠালে দুইবার টাকা কাটে না — আগের লেনদেনটিই ফিরে আসে।",
    submitSend: "{amt} পাঠান",
    submitSendPlain: "টাকা পাঠান",
    submitRequest: "অনুরোধ পাঠান",
    errWallet: "ওয়ালেট নম্বর ১১ সংখ্যার হতে হবে।",
    errAmount: "৳০.০০-এর বেশি পরিমাণ দিন, দশমিকের পর সর্বোচ্চ ২ অঙ্ক।",
    errFunds: "পর্যাপ্ত ব্যালেন্স নেই — UPDATE শর্তেই ডেবিট বাতিল হয়েছে।",
    errFundsRequest: "পর্যাপ্ত ব্যালেন্স নেই — অনুরোধটি অপেক্ষমাণ রইল।",
    inboxTitle: "অনুরোধ ইনবক্স",
    inboxExpiry: "৭ দিনে বাতিল",
    accept: "গ্রহণ",
    decline: "প্রত্যাখ্যান",
    inboxEmpty1: "অপেক্ষমাণ কোনো অনুরোধ নেই।",
    inboxEmpty2: "নিষ্পন্ন অনুরোধ ইতিহাসে দেখা যাবে।",
    txnTitle: "সাম্প্রতিক লেনদেন",
    txnSub: "কীসেট পেজিনেশন — (account_id, id DESC)",
    colCounterparty: "প্রতিপক্ষ",
    colNote: "নোট",
    colType: "ধরন",
    colAmount: "পরিমাণ",
    colAfter: "পরবর্তী ব্যালেন্স",
    colStatus: "অবস্থা",
    loadOlder: "পুরনো দেখুন",
    completed: "সম্পন্ন",
    typeTRANSFER: "ট্রান্সফার",
    typeSETTLEMENT: "নিষ্পত্তি",
    typeFUNDING: "প্রাথমিক তহবিল",
    toastSent: "{amt} পাঠানো হয়েছে",
    toastRequested: "{amt}-এর অনুরোধ পাঠানো হয়েছে",
    toastPaid: "{name}-কে {amt} পরিশোধ করা হয়েছে",
    toastDeclined: "{name}-এর অনুরোধ প্রত্যাখ্যান করা হয়েছে",
    justNow: "এইমাত্র",
  },
  en: {
    brand: "BanglaPay",
    tagline: "Closed ecosystem",
    navDashboard: "Dashboard",
    navSend: "Send money",
    navRequests: "Requests",
    navHistory: "History",
    navReconcile: "Reconciliation",
    ledgerOk: "Ledger reconciled",
    ledgerDesc: "Cached balance matches the sum of double-entry rows for every account.",
    ledgerMeta: "{n} entries · net {amt}",
    userName: "Ayesha Rahman",
    userInitials: "AR",
    headerTitle: "Dashboard",
    headerSub: "Balances are read from the primary — never from cache.",
    light: "Light",
    dark: "Dark",
    balanceLabel: "Available balance",
    active: "ACTIVE",
    send: "Send",
    request: "Request",
    poisha: "{n} poisha · bigint",
    reconciled: "Last reconciled {t}",
    twoMin: "2 min ago",
    statsIn: "Money in · 30 days",
    statsOut: "Money out · 30 days",
    statsCredits: "14 credits",
    statsDebits: "21 debits · limit 10/min",
    tabSend: "Send money",
    tabRequest: "Request money",
    walletSend: "Recipient wallet",
    walletRequest: "Payer wallet",
    amount: "Amount",
    note: "Note",
    optional: "optional",
    notePlaceholder: "What is this for?",
    formFootnote:
      "Debit and credit are written in one Postgres transaction. Replaying this key returns the same transaction instead of charging twice.",
    submitSend: "Send {amt}",
    submitSendPlain: "Send money",
    submitRequest: "Send request",
    errWallet: "Wallet number must be 11 digits.",
    errAmount: "Enter an amount above ৳0.00 with at most 2 decimals.",
    errFunds: "INSUFFICIENT_FUNDS — the debit is rejected inside the UPDATE predicate.",
    errFundsRequest: "INSUFFICIENT_FUNDS — request left pending.",
    inboxTitle: "Request inbox",
    inboxExpiry: "expires in 7d",
    accept: "Accept",
    decline: "Decline",
    inboxEmpty1: "No pending requests.",
    inboxEmpty2: "Settled requests appear in history.",
    txnTitle: "Recent transactions",
    txnSub: "Keyset pagination on (account_id, id DESC)",
    colCounterparty: "Counterparty",
    colNote: "Note",
    colType: "Type",
    colAmount: "Amount",
    colAfter: "Balance after",
    colStatus: "Status",
    loadOlder: "Load older",
    completed: "COMPLETED",
    typeTRANSFER: "TRANSFER",
    typeSETTLEMENT: "SETTLEMENT",
    typeFUNDING: "FUNDING",
    toastSent: "Sent {amt}",
    toastRequested: "Request for {amt} sent",
    toastPaid: "Paid {amt} to {name}",
    toastDeclined: "Declined {name}'s request",
    justNow: "Just now",
  },
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.keys(vars).reduce((acc, key) => acc.split(`{${key}}`).join(vars[key]), template);
}

export const STARTING_BALANCE_POISHA = 97_500 * 100;

export const SEED_REQUESTS: SeedRequest[] = [
  {
    id: "r1",
    name: { bn: "রাকিব হাসান", en: "Rakib Hasan" },
    initials: { bn: "রা", en: "RH" },
    note: { bn: "বৃহস্পতিবারের দুপুরের খাবার", en: "Lunch on Thursday" },
    amountPoisha: 120_000,
  },
  {
    id: "r2",
    name: { bn: "মেহেদী আলম", en: "Mehedi Alam" },
    initials: { bn: "মে", en: "MA" },
    note: { bn: "ভাড়া ভাগাভাগি", en: "Cab fare split" },
    amountPoisha: 345_000,
  },
  {
    id: "r3",
    name: { bn: "ফারহানা আক্তার", en: "Farhana Akter" },
    initials: { bn: "ফা", en: "FA" },
    note: { bn: "ফটোকপি ও প্রিন্ট", en: "Photocopy + print" },
    amountPoisha: 50_000,
  },
];

export const SEED_TXNS: SeedTxn[] = [
  {
    id: "t1",
    name: { bn: "নুসরাত জাহান", en: "Nusrat Jahan" },
    note: { bn: "ইফতার ভাগাভাগি", en: "Iftar split" },
    type: "TRANSFER",
    dir: "DEBIT",
    amountPoisha: 250_000,
    afterPoisha: 9_750_000,
    time: { bn: "আজ দুপুর ২:১৪", en: "Today 2:14 PM" },
  },
  {
    id: "t2",
    name: { bn: "রাকিব হাসান", en: "Rakib Hasan" },
    note: { bn: "বইয়ের টাকা", en: "Book money" },
    type: "SETTLEMENT",
    dir: "CREDIT",
    amountPoisha: 120_000,
    afterPoisha: 10_000_000,
    time: { bn: "আজ সকাল ১১:০২", en: "Today 11:02 AM" },
  },
  {
    id: "t3",
    name: { bn: "তানভীর আহমেদ", en: "Tanvir Ahmed" },
    note: { bn: "বাসা ভাড়ার অংশ", en: "Rent share" },
    type: "TRANSFER",
    dir: "CREDIT",
    amountPoisha: 1_500_000,
    afterPoisha: 9_880_000,
    time: { bn: "গতকাল", en: "Yesterday" },
  },
  {
    id: "t4",
    name: { bn: "স্বপ্ন গ্রোসারি", en: "Shopno Grocery" },
    note: { bn: "বাজার", en: "Groceries" },
    type: "TRANSFER",
    dir: "DEBIT",
    amountPoisha: 87_550,
    afterPoisha: 8_380_000,
    time: { bn: "২৭ আগস্ট", en: "27 Aug" },
  },
  {
    id: "t5",
    name: { bn: "সাদিয়া ইসলাম", en: "Sadia Islam" },
    note: { bn: "টিউশন ফি", en: "Tuition fee" },
    type: "TRANSFER",
    dir: "DEBIT",
    amountPoisha: 1_532_450,
    afterPoisha: 8_467_550,
    time: { bn: "২৬ আগস্ট", en: "26 Aug" },
  },
  {
    id: "t6",
    name: { bn: "বাংলাপে", en: "BanglaPay" },
    note: { bn: "স্বাগত তহবিল", en: "Welcome funding" },
    type: "FUNDING",
    dir: "CREDIT",
    amountPoisha: 10_000_000,
    afterPoisha: 10_000_000,
    time: { bn: "২৪ আগস্ট", en: "24 Aug" },
  },
];
