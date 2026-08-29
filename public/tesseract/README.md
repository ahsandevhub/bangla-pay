# Vendored Tesseract.js assets

Bundled locally per `docs/ARCHITECTURE.md` ("Bundle Bengali and English OCR
language assets to avoid hackathon network dependency"). `lib/kyc/ocr.ts`
points `createWorker`'s `workerPath`/`corePath`/`langPath` at these instead
of tesseract.js's CDN defaults.

- `worker.min.js` — copied from `node_modules/tesseract.js/dist/worker.min.js` (tesseract.js 7.0.0).
- `core/` — all 6 WASM core variants tesseract.js's browser runtime can pick
  between (3 CPU-feature tiers -- relaxedSimd/simd/none -- x lstm/non-lstm;
  see `getCore.js` in the tesseract.js source), copied from
  `node_modules/tesseract.js-core` (also 7.0.0). tesseract.js's own docs
  only mention 4 of these (omitting the two `relaxedsimd` variants) --
  bundling only those 4 breaks OCR outright on any browser whose WASM
  feature detection picks a `relaxedsimd` variant (confirmed via a real
  `importScripts` failure in Chromium while testing this integration):
  `tesseract-core.wasm(.js)`, `tesseract-core-simd.wasm(.js)`,
  `tesseract-core-lstm.wasm(.js)`, `tesseract-core-simd-lstm.wasm(.js)`,
  `tesseract-core-relaxedsimd.wasm(.js)`, `tesseract-core-relaxedsimd-lstm.wasm(.js)`.
- `lang-data/{eng,ben}.traineddata.gz` — LSTM-only trained data (matches the
  `createWorker(..., 1, ...)` OEM.LSTM_ONLY mode used in `lib/kyc/ocr.ts`),
  fetched once from `https://cdn.jsdelivr.net/npm/@tesseract.js-data/{lang}/4.0.0_best_int/{lang}.traineddata.gz`
  -- tesseract.js's own default source when no `langPath` is set.

To re-vendor after a tesseract.js/tesseract.js-core version bump, repeat the
copy/fetch above with the new version and confirm `npm run build` + a
manual `/kyc` OCR run still work.
