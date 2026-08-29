export type Locale = "bn" | "en";
export type ResultMode = "success" | "mismatch" | "duplicate" | "unclear" | "rate-limited";

export interface KycCopy {
  brand: string;
  tagline: string;
  themeToggle: string;
  brandTitle: string;
  brandSub: string;
  brandPoints: string[];
  steps: [string, string, string, string];
  demoBadge: string;
  introTitle: string;
  introSub: string;
  introExplain: string;
  privacy: string;
  trustPoints: string[];
  scanNid: string;
  uploadImage: string;
  captureTitle: string;
  captureSub: string;
  captureTips: string[];
  placeholderHint: string;
  previewAlt: string;
  pickImage: string;
  changeImage: string;
  useCamera: string;
  rotate: string;
  retake: string;
  readInfo: string;
  errNoImage: string;
  scanningTitle: string;
  scanningSub: string;
  stages: [string, string, string, string];
  cancel: string;
  reviewTitle: string;
  reviewSub: string;
  nidFront: string;
  ocrDone: string;
  anotherImage: string;
  fieldNid: string;
  fieldDob: string;
  fieldNameBn: string;
  fieldNameEn: string;
  lowConfidence: string;
  consent: string;
  errConsent: string;
  errFields: string;
  verifyInfo: string;
  verifyingTitle: string;
  verifyingSub: string;
  checks: [string, string, string];
  successTitle: string;
  successSub: string;
  sumKyc: string;
  sumVerified: string;
  sumWallet: string;
  sumBalance: string;
  sumBalanceValue: string;
  sumType: string;
  sumTypeValue: string;
  sumLedger: string;
  sumLedgerValue: string;
  ledgerNote: string;
  goDashboard: string;
  mismatchTitle: string;
  mismatchBody: string;
  duplicateTitle: string;
  duplicateBody: string;
  unclearTitle: string;
  unclearBody: string;
  rateTitle: string;
  rateBody: string;
  fixInfo: string;
  newImage: string;
  tryAgain: string;
  otherNid: string;
  waitSeconds: string;
}

export const DEMO = {
  nid: "1000000001",
  dob: { bn: "১২ এপ্রিল ১৯৯৯", en: "12 April 1999" },
  nameBn: "আয়েশা রহমান",
  nameEn: "Ayesha Rahman",
  wallet: "01711-000000",
};

export const KYC_COPY: Record<Locale, KycCopy> = {
  bn: {
    brand: "বাংলাপে",
    tagline: "বদ্ধ অর্থব্যবস্থা",
    themeToggle: "থিম পরিবর্তন",
    brandTitle: "যাচাইকৃত পরিচয়, নিরাপদ ওয়ালেট।",
    brandSub:
      "NID যাচাই সম্পন্ন হলে আপনার ওয়ালেট চালু হবে এবং স্বাগত তহবিল হিসেবে ৳১,০০,০০০ যোগ হবে।",
    brandPoints: ["এক NID, এক অ্যাকাউন্ট", "ছবি ব্যক্তিগতভাবে সংরক্ষিত", "যাচাইয়ের পর ওয়ালেট সক্রিয়"],
    steps: ["নম্বর", "OTP", "পিন", "KYC"],
    demoBadge: "সিমুলেটেড KYC · বাস্তব সরকারি ডেটাবেস নয়",
    introTitle: "পরিচয় যাচাই করুন",
    introSub: "ওয়ালেট চালু করতে আপনার জাতীয় পরিচয়পত্র যাচাই করুন।",
    introExplain:
      "NID-এর সামনের অংশের একটি পরিষ্কার ছবি দিন। আমরা নাম, NID নম্বর ও জন্মতারিখ পড়ে ডেমো পরিচয় ডেটাবেসের সঙ্গে মিলিয়ে দেখব।",
    privacy: "আপনার NID ছবি ব্যক্তিগতভাবে সংরক্ষিত থাকবে। এটি শুধুমাত্র হ্যাকাথন ডেমোর যাচাইয়ের জন্য ব্যবহৃত হবে।",
    trustPoints: ["ব্যক্তিগত ছবি", "এক NID, এক অ্যাকাউন্ট", "যাচাইয়ের পর ওয়ালেট"],
    scanNid: "NID স্ক্যান করুন",
    uploadImage: "ছবি আপলোড করুন",
    captureTitle: "NID-এর সামনের অংশ দিন",
    captureSub: "ছবি এখানে টেনে আনুন, ফাইল নির্বাচন করুন বা ক্যামেরা ব্যবহার করুন।",
    captureTips: [
      "কার্ডের চার কোণা দৃশ্যমান রাখুন",
      "পর্যাপ্ত আলো ব্যবহার করুন",
      "ঝাপসা বা চকচকে প্রতিফলিত ছবি এড়িয়ে চলুন",
      "শুধু NID-এর সামনের অংশ দিন",
    ],
    placeholderHint: "NID front · 1.58:1",
    previewAlt: "NID-এর সামনের অংশের ছবি",
    pickImage: "ছবি নির্বাচন করুন",
    changeImage: "ছবি বদলান",
    useCamera: "ক্যামেরা ব্যবহার করুন",
    rotate: "ছবি ঘোরান",
    retake: "আবার তুলুন",
    readInfo: "তথ্য পড়ুন",
    errNoImage: "আগে NID-এর একটি ছবি দিন।",
    scanningTitle: "তথ্য পড়া হচ্ছে",
    scanningSub: "ছবি থেকে নাম, NID নম্বর ও জন্মতারিখ বের করা হচ্ছে।",
    stages: [
      "ছবি প্রস্তুত করা হচ্ছে",
      "বাংলা ও ইংরেজি লেখা পড়া হচ্ছে",
      "NID নম্বর খোঁজা হচ্ছে",
      "তথ্য সাজানো হচ্ছে",
    ],
    cancel: "বাতিল করুন",
    reviewTitle: "তথ্য মিলিয়ে দেখুন",
    reviewSub: "OCR থেকে পাওয়া তথ্য যাচাই করুন। কোনো ভুল থাকলে যাচাইয়ের আগে ঠিক করে দিন।",
    nidFront: "NID-এর সামনের অংশ",
    ocrDone: "OCR সম্পন্ন",
    anotherImage: "নতুন ছবি",
    fieldNid: "NID নম্বর",
    fieldDob: "জন্মতারিখ",
    fieldNameBn: "বাংলা নাম",
    fieldNameEn: "ইংরেজি নাম",
    lowConfidence: "এই তথ্যটি আবার দেখুন",
    consent: "আমি নিশ্চিত করছি যে তথ্যগুলো আমার NID-এর সঙ্গে মিলে গেছে।",
    errConsent: "এগিয়ে যাওয়ার আগে তথ্য মিলে যাওয়ার নিশ্চয়তা দিন।",
    errFields: "NID নম্বর ১০ সংখ্যার হতে হবে এবং কোনো ঘর ফাঁকা রাখা যাবে না।",
    verifyInfo: "তথ্য যাচাই করুন",
    verifyingTitle: "NID যাচাই করা হচ্ছে",
    verifyingSub: "ডেমো পরিচয় ডেটাবেসের সঙ্গে তথ্য মিলিয়ে দেখা হচ্ছে।",
    checks: ["NID নম্বর মিলছে", "জন্মতারিখ মিলছে", "নাম মিলছে"],
    successTitle: "পরিচয় যাচাই সম্পন্ন",
    successSub: "আপনার বাংলাপে অ্যাকাউন্ট এখন সক্রিয়। স্বাগত তহবিল হিসেবে ৳১,০০,০০০.০০ যোগ হয়েছে।",
    sumKyc: "KYC অবস্থা",
    sumVerified: "যাচাইকৃত",
    sumWallet: "ওয়ালেট নম্বর",
    sumBalance: "প্রাথমিক ব্যালেন্স",
    sumBalanceValue: "৳১,০০,০০০.০০",
    sumType: "তহবিলের ধরন",
    sumTypeValue: "প্রাথমিক তহবিল",
    sumLedger: "লেজার অবস্থা",
    sumLedgerValue: "ডেবিট ও ক্রেডিট মিলেছে",
    ledgerNote: "প্রাথমিক তহবিলটি একটি সম্পূর্ণ লেনদেন হিসেবে লেজারে লেখা হয়েছে।",
    goDashboard: "ড্যাশবোর্ডে যান",
    mismatchTitle: "তথ্য মেলেনি",
    mismatchBody: "দেওয়া তথ্য ডেমো NID ডেটাবেসের সঙ্গে মেলেনি। ছবি ও তথ্য আবার পরীক্ষা করুন।",
    duplicateTitle: "এই NID ইতিমধ্যে ব্যবহৃত হয়েছে",
    duplicateBody: "একটি NID দিয়ে শুধুমাত্র একটি বাংলাপে অ্যাকাউন্ট যাচাই করা যায়।",
    unclearTitle: "ছবিটি পরিষ্কার নয়",
    unclearBody: "NID নম্বর বা নাম পড়া যায়নি। পর্যাপ্ত আলোতে আবার ছবি তুলুন।",
    rateTitle: "অনেকবার চেষ্টা হয়েছে",
    rateBody: "নিরাপত্তার জন্য কিছুক্ষণ পর আবার চেষ্টা করুন।",
    fixInfo: "তথ্য ঠিক করুন",
    newImage: "নতুন ছবি দিন",
    tryAgain: "আবার চেষ্টা করুন",
    otherNid: "অন্য NID দিয়ে চেষ্টা করুন",
    waitSeconds: "{s} সেকেন্ড পর আবার চেষ্টা করা যাবে",
  },
  en: {
    brand: "BanglaPay",
    tagline: "Closed ecosystem",
    themeToggle: "Switch theme",
    brandTitle: "Verified identity, secure wallet.",
    brandSub:
      "Your wallet activates once your NID is verified — and the ৳100,000 opening balance is added then.",
    brandPoints: ["One NID, one account", "Your image stays private", "Wallet activates after verification"],
    steps: ["Number", "OTP", "PIN", "KYC"],
    demoBadge: "Simulated KYC · Not connected to a government database",
    introTitle: "Verify your identity",
    introSub: "Verify your National ID before activating your wallet.",
    introExplain:
      "Provide a clear image of the front of your NID. We read the name, NID number and date of birth, then match them against a demo identity database.",
    privacy: "Your NID image is stored privately. It is used only for verification in this hackathon demo.",
    trustPoints: ["Private image", "One NID, one account", "Wallet after verification"],
    scanNid: "Scan NID",
    uploadImage: "Upload image",
    captureTitle: "Provide the front of your NID",
    captureSub: "Drag an image here, choose a file, or use the camera.",
    captureTips: ["Keep all four corners visible", "Use enough light", "Avoid blur and glare", "Front of the NID only"],
    placeholderHint: "NID front · 1.58:1",
    previewAlt: "Image of the front of the NID",
    pickImage: "Choose image",
    changeImage: "Change image",
    useCamera: "Use camera",
    rotate: "Rotate image",
    retake: "Retake",
    readInfo: "Read information",
    errNoImage: "Add an image of your NID first.",
    scanningTitle: "Reading your NID",
    scanningSub: "Extracting the name, NID number and date of birth from the image.",
    stages: ["Preparing image", "Reading Bangla and English text", "Finding NID number", "Organizing extracted information"],
    cancel: "Cancel",
    reviewTitle: "Check the details",
    reviewSub: "Review the extracted information. Correct any OCR mistakes before verification.",
    nidFront: "NID front",
    ocrDone: "OCR complete",
    anotherImage: "New image",
    fieldNid: "NID number",
    fieldDob: "Date of birth",
    fieldNameBn: "Bangla name",
    fieldNameEn: "English name",
    lowConfidence: "Please review this field",
    consent: "I confirm that these details match my NID.",
    errConsent: "Confirm the details match your NID before continuing.",
    errFields: "The NID number must be 10 digits and no field can be empty.",
    verifyInfo: "Verify information",
    verifyingTitle: "Verifying your NID",
    verifyingSub: "Matching the details against the demo identity database.",
    checks: ["NID number matches", "Date of birth matches", "Name matches"],
    successTitle: "Identity verification completed",
    successSub: "Your BanglaPay wallet is now active. ৳100,000.00 has been added as welcome funding.",
    sumKyc: "KYC status",
    sumVerified: "Verified",
    sumWallet: "Wallet number",
    sumBalance: "Opening balance",
    sumBalanceValue: "৳100,000.00",
    sumType: "Funding type",
    sumTypeValue: "INITIAL_FUNDING",
    sumLedger: "Ledger status",
    sumLedgerValue: "Ledger reconciled",
    ledgerNote: "The opening balance was recorded as a complete ledger transaction.",
    goDashboard: "Go to dashboard",
    mismatchTitle: "Details did not match",
    mismatchBody: "The details do not match the demo NID database. Check the image and the fields again.",
    duplicateTitle: "This NID has already been used",
    duplicateBody: "One NID can verify only one BanglaPay account.",
    unclearTitle: "The image is not clear",
    unclearBody: "The NID number or name could not be read. Take the photo again in better light.",
    rateTitle: "Too many attempts",
    rateBody: "For security, please try again in a little while.",
    fixInfo: "Fix the details",
    newImage: "Use another image",
    tryAgain: "Try again",
    otherNid: "Try another NID",
    waitSeconds: "You can try again in {s} seconds",
  },
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.keys(vars).reduce((acc, key) => acc.split(`{${key}}`).join(vars[key]), template);
}
