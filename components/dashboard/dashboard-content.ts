export type Locale = "bn" | "en";

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
  headerTitle: string;
  headerSub: string;
  light: string;
  dark: string;
  signOut: string;
  signingOut: string;
  balanceLabel: string;
  active: string;
  send: string;
  request: string;
  poisha: string;
  statsIn: string;
  statsOut: string;
  statsInSub: string;
  statsOutSub: string;
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
  submitting: string;
  errWallet: string;
  errAmount: string;
  errFunds: string;
  errFundsRequest: string;
  errRecipientNotFound: string;
  errSelfTransfer: string;
  errDeviceReplaced: string;
  errRateLimited: string;
  errRequestExpired: string;
  errRequestSettled: string;
  errGeneric: string;
  inboxTitle: string;
  inboxExpiry: string;
  accept: string;
  decline: string;
  accepting: string;
  declining: string;
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
  loadingOlder: string;
  noMoreHistory: string;
  completed: string;
  typeTRANSFER: string;
  typeSETTLEMENT: string;
  typeFUNDING: string;
  toastRequested: string;
  toastDeclined: string;
  justNow: string;
  confirmSendTitle: string;
  confirmSendBody: string;
  confirmAcceptTitle: string;
  confirmAcceptBody: string;
  confirmYes: string;
  confirmCancel: string;
  receiptTitle: string;
  receiptTxnId: string;
  receiptCounterparty: string;
  receiptNote: string;
  receiptTime: string;
  receiptDone: string;
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
    headerTitle: "ড্যাশবোর্ড",
    headerSub: "ব্যালেন্স সব সময় প্রাইমারি ডেটাবেস থেকে পড়া হয় — ক্যাশ থেকে নয়।",
    light: "লাইট",
    dark: "ডার্ক",
    signOut: "সাইন আউট",
    signingOut: "সাইন আউট হচ্ছে…",
    balanceLabel: "ব্যবহারযোগ্য ব্যালেন্স",
    active: "সক্রিয়",
    send: "পাঠান",
    request: "অনুরোধ",
    poisha: "{n} পয়সা · bigint",
    statsIn: "মোট জমা",
    statsOut: "মোট খরচ",
    statsInSub: "লোড হওয়া ইতিহাসে {n}টি জমা",
    statsOutSub: "লোড হওয়া ইতিহাসে {n}টি খরচ",
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
    submitting: "প্রসেস হচ্ছে…",
    errWallet: "ওয়ালেট নম্বর একটি বৈধ বাংলাদেশি মোবাইল নম্বর হতে হবে (০১XXXXXXXXX)।",
    errAmount: "৳০.০০-এর বেশি পরিমাণ দিন, দশমিকের পর সর্বোচ্চ ২ অঙ্ক।",
    errFunds: "পর্যাপ্ত ব্যালেন্স নেই — UPDATE শর্তেই ডেবিট বাতিল হয়েছে।",
    errFundsRequest: "পর্যাপ্ত ব্যালেন্স নেই — অনুরোধটি অপেক্ষমাণ রইল।",
    errRecipientNotFound: "এই ওয়ালেট নম্বরে কোনো সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি।",
    errSelfTransfer: "নিজের ওয়ালেটে টাকা পাঠানো যাবে না।",
    errDeviceReplaced: "এই ডিভাইসটি সাইন আউট হয়ে গেছে — আবার সাইন ইন করুন।",
    errRateLimited: "অনেকবার চেষ্টা করা হয়েছে। একটু পর আবার চেষ্টা করুন।",
    errRequestExpired: "এই অনুরোধের মেয়াদ শেষ হয়ে গেছে।",
    errRequestSettled: "এই অনুরোধটি ইতিমধ্যে নিষ্পন্ন হয়ে গেছে।",
    errGeneric: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    inboxTitle: "অনুরোধ ইনবক্স",
    inboxExpiry: "২৪ ঘণ্টার মধ্যে মেয়াদ শেষ",
    accept: "গ্রহণ",
    decline: "প্রত্যাখ্যান",
    accepting: "প্রসেস হচ্ছে…",
    declining: "প্রসেস হচ্ছে…",
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
    loadingOlder: "লোড হচ্ছে…",
    noMoreHistory: "আর কোনো লেনদেন নেই",
    completed: "সম্পন্ন",
    typeTRANSFER: "ট্রান্সফার",
    typeSETTLEMENT: "নিষ্পত্তি",
    typeFUNDING: "প্রাথমিক তহবিল",
    toastRequested: "{amt}-এর অনুরোধ পাঠানো হয়েছে",
    toastDeclined: "অনুরোধ প্রত্যাখ্যান করা হয়েছে",
    justNow: "এইমাত্র",
    confirmSendTitle: "পাঠানো নিশ্চিত করুন",
    confirmSendBody: "{to}-কে {amt} পাঠাবেন?",
    confirmAcceptTitle: "পরিশোধ নিশ্চিত করুন",
    confirmAcceptBody: "{to}-কে {amt} পরিশোধ করবেন?",
    confirmYes: "নিশ্চিত করুন",
    confirmCancel: "বাতিল",
    receiptTitle: "রসিদ",
    receiptTxnId: "লেনদেন আইডি",
    receiptCounterparty: "প্রাপক",
    receiptNote: "নোট",
    receiptTime: "সময়",
    receiptDone: "সম্পন্ন",
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
    headerTitle: "Dashboard",
    headerSub: "Balances are read from the primary — never from cache.",
    light: "Light",
    dark: "Dark",
    signOut: "Sign out",
    signingOut: "Signing out…",
    balanceLabel: "Available balance",
    active: "ACTIVE",
    send: "Send",
    request: "Request",
    poisha: "{n} poisha · bigint",
    statsIn: "Total in",
    statsOut: "Total out",
    statsInSub: "{n} credits in loaded history",
    statsOutSub: "{n} debits in loaded history",
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
    submitting: "Processing…",
    errWallet: "Wallet number must be a valid Bangladeshi mobile number (01XXXXXXXXX).",
    errAmount: "Enter an amount above ৳0.00 with at most 2 decimals.",
    errFunds: "INSUFFICIENT_FUNDS — the debit is rejected inside the UPDATE predicate.",
    errFundsRequest: "INSUFFICIENT_FUNDS — request left pending.",
    errRecipientNotFound: "No active account was found for that wallet number.",
    errSelfTransfer: "You can't send money to your own wallet.",
    errDeviceReplaced: "This device was signed out — please sign in again.",
    errRateLimited: "Too many attempts. Please wait and try again.",
    errRequestExpired: "This request has expired.",
    errRequestSettled: "This request has already been settled.",
    errGeneric: "Something went wrong. Please try again.",
    inboxTitle: "Request inbox",
    inboxExpiry: "Expires within 24h",
    accept: "Accept",
    decline: "Decline",
    accepting: "Processing…",
    declining: "Processing…",
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
    loadingOlder: "Loading…",
    noMoreHistory: "No more transactions",
    completed: "COMPLETED",
    typeTRANSFER: "TRANSFER",
    typeSETTLEMENT: "SETTLEMENT",
    typeFUNDING: "FUNDING",
    toastRequested: "Request for {amt} sent",
    toastDeclined: "Request declined",
    justNow: "Just now",
    confirmSendTitle: "Confirm send",
    confirmSendBody: "Send {amt} to {to}?",
    confirmAcceptTitle: "Confirm payment",
    confirmAcceptBody: "Pay {amt} to {to}?",
    confirmYes: "Confirm",
    confirmCancel: "Cancel",
    receiptTitle: "Receipt",
    receiptTxnId: "Transaction ID",
    receiptCounterparty: "To",
    receiptNote: "Note",
    receiptTime: "Time",
    receiptDone: "Done",
  },
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.keys(vars).reduce((acc, key) => acc.split(`{${key}}`).join(vars[key]), template);
}
