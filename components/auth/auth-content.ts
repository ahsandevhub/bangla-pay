export type Locale = "bn" | "en";
export type AuthMode = "login" | "signup";

export interface AuthCopy {
  brand: string;
  tagline: string;
  themeToggle: string;
  brandTitle: string;
  brandSub: string;
  brandPoints: string[];
  tabLogin: string;
  tabSignup: string;
  stepPhone: string;
  stepOtp: string;
  stepPin: string;
  phoneTitleSignup: string;
  phoneTitleLogin: string;
  phoneSubSignup: string;
  phoneSubLogin: string;
  phoneLabel: string;
  sendOtp: string;
  continueBtn: string;
  errPhone: string;
  otpTitle: string;
  otpSub: string;
  demoOtp: string;
  resendIn: string;
  resendNow: string;
  errOtp: string;
  pinSetTitle: string;
  pinSetSub: string;
  pinConfirmTitle: string;
  pinConfirmSub: string;
  pinLoginTitle: string;
  pinLoginSub: string;
  errPin: string;
  errPinWeak: string;
  back: string;
  doneTitleSignup: string;
  doneTitleLogin: string;
  doneSubSignup: string;
  doneSubLogin: string;
  redirecting: string;
  goNow: string;
}

export const DEMO_OTP = "123456";

export const AUTH_COPY: Record<Locale, AuthCopy> = {
  bn: {
    brand: "বাংলাপে",
    tagline: "বদ্ধ অর্থব্যবস্থা",
    themeToggle: "থিম পরিবর্তন",
    brandTitle: "একটি নম্বরই ওয়ালেট, একটি পিনই নিরাপত্তা।",
    brandSub:
      "ফোন নম্বর দিন, OTP যাচাই করুন, ৪ সংখ্যার পিন সেট করুন — রেজিস্ট্রেশনের সঙ্গে সঙ্গে ওয়ালেটে ৳১,০০,০০০।",
    brandPoints: [
      "দুইবার টাকা কাটে না",
      "ঋণাত্মক ব্যালেন্স অসম্ভব",
      "প্রতিটি লেনদেন লেজারে লেখা",
    ],
    tabLogin: "লগ ইন",
    tabSignup: "সাইন আপ",
    stepPhone: "নম্বর",
    stepOtp: "OTP",
    stepPin: "পিন",
    phoneTitleSignup: "ফোন নম্বর দিন",
    phoneTitleLogin: "ওয়ালেট নম্বর দিন",
    phoneSubSignup: "এই নম্বরটিই হবে আপনার ওয়ালেট নম্বর।",
    phoneSubLogin: "আপনার নিবন্ধিত ফোন নম্বর দিন।",
    phoneLabel: "ফোন নম্বর",
    sendOtp: "OTP পাঠান",
    continueBtn: "এগিয়ে যান",
    errPhone: "সঠিক ১১ সংখ্যার নম্বর দিন (01 দিয়ে শুরু)।",
    otpTitle: "OTP যাচাই করুন",
    otpSub: "+৮৮{phone} নম্বরে পাঠানো ৬ সংখ্যার কোডটি দিন।",
    demoOtp: "ডেমো কোড: ১২৩৪৫৬",
    resendIn: "আবার পাঠান ({s} সে.)",
    resendNow: "আবার পাঠান",
    errOtp: "কোডটি মেলেনি — আবার চেষ্টা করুন।",
    pinSetTitle: "পিন সেট করুন",
    pinSetSub: "৪ সংখ্যার গোপন পিন — প্রতিটি লেনদেনে লাগবে।",
    pinConfirmTitle: "পিন আবার দিন",
    pinConfirmSub: "নিশ্চিত করতে একই পিন আবার দিন।",
    pinLoginTitle: "পিন দিন",
    pinLoginSub: "আপনার ৪ সংখ্যার গোপন পিন।",
    errPin: "পিন দুটি মেলেনি — আবার সেট করুন।",
    errPinWeak: "এই পিন সহজে অনুমানযোগ্য — অন্য পিন বেছে নিন।",
    back: "ফিরে যান",
    doneTitleSignup: "অ্যাকাউন্ট তৈরি হয়েছে!",
    doneTitleLogin: "লগ ইন সফল!",
    doneSubSignup: "স্বাগত তহবিল হিসেবে ওয়ালেটে ৳১,০০,০০০ যোগ হয়েছে।",
    doneSubLogin: "আপনার ওয়ালেট প্রস্তুত।",
    redirecting: "{s} সেকেন্ডে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে…",
    goNow: "এখনই ড্যাশবোর্ডে যান",
  },
  en: {
    brand: "BanglaPay",
    tagline: "Closed ecosystem",
    themeToggle: "Switch theme",
    brandTitle: "One number is your wallet. One PIN keeps it safe.",
    brandSub:
      "Enter your phone, verify the OTP, set a 4-digit PIN — and ৳100,000 lands in your wallet at registration.",
    brandPoints: [
      "Never charged twice",
      "Balances cannot go negative",
      "Every transaction hits the ledger",
    ],
    tabLogin: "Log in",
    tabSignup: "Sign up",
    stepPhone: "Number",
    stepOtp: "OTP",
    stepPin: "PIN",
    phoneTitleSignup: "Enter your phone number",
    phoneTitleLogin: "Enter your wallet number",
    phoneSubSignup: "This number becomes your wallet number.",
    phoneSubLogin: "The phone number you registered with.",
    phoneLabel: "Phone number",
    sendOtp: "Send OTP",
    continueBtn: "Continue",
    errPhone: "Enter a valid 11-digit number starting with 01.",
    otpTitle: "Verify the OTP",
    otpSub: "Enter the 6-digit code sent to +88{phone}.",
    demoOtp: "Demo code: 123456",
    resendIn: "Resend ({s}s)",
    resendNow: "Resend code",
    errOtp: "That code did not match — try again.",
    pinSetTitle: "Set your PIN",
    pinSetSub: "A secret 4-digit PIN — needed for every transaction.",
    pinConfirmTitle: "Confirm your PIN",
    pinConfirmSub: "Enter the same PIN once more to confirm.",
    pinLoginTitle: "Enter your PIN",
    pinLoginSub: "Your secret 4-digit PIN.",
    errPin: "The PINs did not match — set it again.",
    errPinWeak: "That PIN is too easy to guess — choose another one.",
    back: "Go back",
    doneTitleSignup: "Account created!",
    doneTitleLogin: "Logged in!",
    doneSubSignup: "৳100,000 of welcome funding has been added to your wallet.",
    doneSubLogin: "Your wallet is ready.",
    redirecting: "Taking you to the dashboard in {s}s…",
    goNow: "Go to dashboard now",
  },
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.keys(vars).reduce(
    (acc, key) => acc.split(`{${key}}`).join(vars[key]),
    template,
  );
}

const PHONE_PATTERN = /^01[3-9]\d{8}$/;

export function isValidPhone(digitsOnly: string): boolean {
  return PHONE_PATTERN.test(digitsOnly);
}

export function isWeakPin(pin: string, phone: string): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true;
  if ("0123456789".includes(pin) || "9876543210".includes(pin)) return true;
  if (pin === "2580" || pin === "0852") return true;
  const lastFour = phone.replace(/\D/g, "").slice(-4);
  return lastFour.length === 4 && pin === lastFour;
}
