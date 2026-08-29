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
  submitting: string;
  errPhone: string;
  errPhoneRegistered: string;
  otpTitle: string;
  otpSub: string;
  demoCodeLabel: string;
  demoCodeLoading: string;
  resendIn: string;
  resendNow: string;
  errOtp: string;
  errOtpExpired: string;
  errOtpConsumed: string;
  errOtpAttempts: string;
  errResendTooSoon: string;
  pinSetTitle: string;
  pinSetSub: string;
  pinConfirmTitle: string;
  pinConfirmSub: string;
  pinLoginTitle: string;
  pinLoginSub: string;
  errPin: string;
  errPinWeak: string;
  errPinInvalid: string;
  errPinLocked: string;
  errRateLimited: string;
  errGeneric: string;
  back: string;
  doneTitleKyc: string;
  doneTitleActive: string;
  doneSubKyc: string;
  doneSubActive: string;
  redirecting: string;
  goNowKyc: string;
  goNowDashboard: string;
}

export const AUTH_COPY: Record<Locale, AuthCopy> = {
  bn: {
    brand: "বাংলাপে",
    tagline: "বদ্ধ অর্থব্যবস্থা",
    themeToggle: "থিম পরিবর্তন",
    brandTitle: "একটি নম্বরই ওয়ালেট, একটি পিনই নিরাপত্তা।",
    brandSub:
      "ফোন নম্বর দিন, OTP যাচাই করুন, ৪ সংখ্যার পিন সেট করুন — NID যাচাইয়ের পর ওয়ালেটে ৳১,০০,০০০।",
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
    submitting: "অপেক্ষা করুন…",
    errPhone: "সঠিক ১১ সংখ্যার নম্বর দিন (01 দিয়ে শুরু)।",
    errPhoneRegistered: "এই নম্বরটি ইতিমধ্যে নিবন্ধিত — লগ ইন করুন।",
    otpTitle: "OTP যাচাই করুন",
    otpSub: "+৮৮{phone} নম্বরে পাঠানো ৬ সংখ্যার কোডটি দিন।",
    demoCodeLabel: "ডেমো কোড: {code}",
    demoCodeLoading: "কোড লোড হচ্ছে…",
    resendIn: "আবার পাঠান ({s} সে.)",
    resendNow: "আবার পাঠান",
    errOtp: "কোডটি মেলেনি — আবার চেষ্টা করুন।",
    errOtpExpired: "কোডের মেয়াদ শেষ — নতুন কোড নিন।",
    errOtpConsumed: "এই কোডটি ইতিমধ্যে ব্যবহৃত হয়েছে।",
    errOtpAttempts: "অনেকবার ভুল হয়েছে — নতুন কোড নিন।",
    errResendTooSoon: "একটু পর আবার চেষ্টা করুন।",
    pinSetTitle: "পিন সেট করুন",
    pinSetSub: "৪ সংখ্যার গোপন পিন — প্রতিটি লেনদেনে লাগবে।",
    pinConfirmTitle: "পিন আবার দিন",
    pinConfirmSub: "নিশ্চিত করতে একই পিন আবার দিন।",
    pinLoginTitle: "পিন দিন",
    pinLoginSub: "আপনার ৪ সংখ্যার গোপন পিন।",
    errPin: "পিন দুটি মেলেনি — আবার সেট করুন।",
    errPinWeak: "এই পিন সহজে অনুমানযোগ্য — অন্য পিন বেছে নিন।",
    errPinInvalid: "ভুল পিন।",
    errPinLocked: "অনেকবার ভুল পিন — ১৫ মিনিট পর আবার চেষ্টা করুন।",
    errRateLimited: "অনেকবার চেষ্টা করা হয়েছে। একটু পর আবার চেষ্টা করুন।",
    errGeneric: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    back: "ফিরে যান",
    doneTitleKyc: "অ্যাকাউন্ট তৈরি হয়েছে!",
    doneTitleActive: "লগ ইন সফল!",
    doneSubKyc: "এখন আপনার NID যাচাই করে ওয়ালেট সক্রিয় করুন।",
    doneSubActive: "আপনার ওয়ালেট প্রস্তুত।",
    redirecting: "{s} সেকেন্ডে পরের ধাপে নিয়ে যাওয়া হচ্ছে…",
    goNowKyc: "এখনই NID যাচাই করুন",
    goNowDashboard: "এখনই ড্যাশবোর্ডে যান",
  },
  en: {
    brand: "BanglaPay",
    tagline: "Closed ecosystem",
    themeToggle: "Switch theme",
    brandTitle: "One number is your wallet. One PIN keeps it safe.",
    brandSub:
      "Enter your phone, verify the OTP, set a 4-digit PIN — and ৳100,000 lands in your wallet once your NID is verified.",
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
    submitting: "Please wait…",
    errPhone: "Enter a valid 11-digit number starting with 01.",
    errPhoneRegistered: "This number is already registered — log in instead.",
    otpTitle: "Verify the OTP",
    otpSub: "Enter the 6-digit code sent to +88{phone}.",
    demoCodeLabel: "Demo code: {code}",
    demoCodeLoading: "Loading code…",
    resendIn: "Resend ({s}s)",
    resendNow: "Resend code",
    errOtp: "That code did not match — try again.",
    errOtpExpired: "That code expired — request a new one.",
    errOtpConsumed: "That code has already been used.",
    errOtpAttempts: "Too many incorrect attempts — request a new code.",
    errResendTooSoon: "Please wait a little longer before requesting another code.",
    pinSetTitle: "Set your PIN",
    pinSetSub: "A secret 4-digit PIN — needed for every transaction.",
    pinConfirmTitle: "Confirm your PIN",
    pinConfirmSub: "Enter the same PIN once more to confirm.",
    pinLoginTitle: "Enter your PIN",
    pinLoginSub: "Your secret 4-digit PIN.",
    errPin: "The PINs did not match — set it again.",
    errPinWeak: "That PIN is too easy to guess — choose another one.",
    errPinInvalid: "Incorrect PIN.",
    errPinLocked: "Too many incorrect PIN attempts. Try again in 15 minutes.",
    errRateLimited: "Too many attempts. Please wait and try again.",
    errGeneric: "Something went wrong. Please try again.",
    back: "Go back",
    doneTitleKyc: "Account created!",
    doneTitleActive: "Logged in!",
    doneSubKyc: "Now verify your NID to activate your wallet.",
    doneSubActive: "Your wallet is ready.",
    redirecting: "Taking you to the next step in {s}s…",
    goNowKyc: "Verify your NID now",
    goNowDashboard: "Go to dashboard now",
  },
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.keys(vars).reduce(
    (acc, key) => acc.split(`{${key}}`).join(vars[key]),
    template,
  );
}
