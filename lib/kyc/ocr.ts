"use client";

import { createWorker, type Worker } from "tesseract.js";

// All three paths point at public/tesseract/ (worker script, WASM core
// variants, and eng+ben LSTM language data) instead of tesseract.js's CDN
// defaults, per docs/ARCHITECTURE.md's "bundle OCR language assets to avoid
// hackathon network dependency". See public/tesseract/README.md for how
// these were vendored.
const WORKER_PATH = "/tesseract/worker.min.js";
const CORE_PATH = "/tesseract/core";
const LANG_PATH = "/tesseract/lang-data";

export type OcrExtractedFields = {
  nidNumber: string;
  dateOfBirth: string; // ISO yyyy-mm-dd, "" if not confidently found
  banglaName: string;
  englishName: string;
};

let workerPromise: Promise<Worker> | null = null;
// The worker is a module-level singleton (creating one is the expensive
// part -- loading WASM + two language models); this lets a single
// in-flight recognize() report progress without needing a new worker per
// call, since createWorker's logger can only be set once at creation.
let currentProgressCallback: ((fraction: number) => void) | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(["eng", "ben"], 1, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (message) => {
        if (message.status === "recognizing text" && currentProgressCallback) {
          currentProgressCallback(message.progress);
        }
      },
    });
  }
  return workerPromise;
}

/** Warms up the worker (downloads/initializes WASM + language data) ahead of the first real recognition, so the "scanning" step doesn't stall on it. */
export function preloadOcrWorker(): void {
  void getWorker();
}

export async function recognizeNidImage(
  image: File | Blob,
  onProgress?: (fraction: number) => void,
): Promise<{ text: string; fields: OcrExtractedFields }> {
  currentProgressCallback = onProgress ?? null;
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(image);
    return { text: data.text, fields: extractFields(data.text) };
  } finally {
    currentProgressCallback = null;
  }
}

const BANGLA_PATTERN = /[ঀ-৿]/;
const MONTH_BY_ABBREVIATION: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/**
 * Best-effort field extraction from raw OCR text off a Bangladeshi NID
 * front. Deliberately forgiving rather than strict: a missed or wrong field
 * just leaves that input blank/incorrect for the user to fix in the review
 * step, per docs/ARCHITECTURE.md ("let the user correct extracted values
 * before verification") -- extraction quality is not the security boundary
 * here, the exact-match check against the registry is.
 */
export function extractFields(rawText: string): OcrExtractedFields {
  return {
    nidNumber: extractNidNumber(rawText),
    dateOfBirth: extractDateOfBirth(rawText),
    banglaName: extractBanglaName(rawText),
    englishName: extractEnglishName(rawText),
  };
}

function extractNidNumber(text: string): string {
  const digitRuns = text.match(/\d+/g) ?? [];
  const byPreferredLength = [17, 13, 10];
  for (const length of byPreferredLength) {
    const match = digitRuns.find((run) => run.length === length);
    if (match) return match;
  }
  // No run matches a real NID length exactly; fall back to the longest run
  // so the user has something to correct rather than a blank field.
  return digitRuns.sort((a, b) => b.length - a.length)[0] ?? "";
}

function extractDateOfBirth(text: string): string {
  const lines = text.split("\n");
  const labelIndex = lines.findIndex((line) => /date of birth|\bdob\b|জন্ম\s*তারিখ/i.test(line));
  const searchText = labelIndex >= 0 ? lines.slice(labelIndex, labelIndex + 2).join(" ") : text;

  const match = searchText.match(/(\d{1,2})[/\-.\s]+([A-Za-z]{3,9}|\d{1,2})[/\-.\s]+(\d{4})/);
  if (!match) return "";

  const [, day, monthRaw, year] = match;
  const monthNumber = /^\d+$/.test(monthRaw)
    ? monthRaw.padStart(2, "0")
    : MONTH_BY_ABBREVIATION[monthRaw.slice(0, 3).toLowerCase()];
  if (!monthNumber) return "";

  return `${year}-${monthNumber}-${day.padStart(2, "0")}`;
}

function extractEnglishName(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const inline = lines[i].match(/^name\s*[:\-]?\s*(.+)$/i);
    if (inline && inline[1].trim().length > 1 && !BANGLA_PATTERN.test(inline[1])) {
      return inline[1].trim();
    }
    if (/^name\s*[:\-]?$/i.test(lines[i]) && lines[i + 1] && !BANGLA_PATTERN.test(lines[i + 1])) {
      return lines[i + 1].trim();
    }
  }
  return "";
}

// Bangla label words to skip past when looking for the name line -- avoids
// mistaking the card's own "National ID Card" / "Date of Birth" headings
// (in Bangla) for the cardholder's name.
const BANGLA_LABEL_PATTERN = /জাতীয়|পরিচয়|জন্ম|তারিখ|নং|গণপ্রজাতন্ত্রী|বাংলাদেশ/;

function extractBanglaName(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (
      BANGLA_PATTERN.test(line) &&
      !BANGLA_LABEL_PATTERN.test(line) &&
      line.length >= 2 &&
      line.length <= 40
    ) {
      return line.replace(/^নাম\s*[:\-]?\s*/, "").trim();
    }
  }
  return "";
}
