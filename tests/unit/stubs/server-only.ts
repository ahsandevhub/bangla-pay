// server-only's real package throws unconditionally outside Next.js's own
// bundler (it relies on Next's "react-server" export condition to pick a
// no-op instead) -- Vitest runs in plain Node, so aliasing to this empty
// stub here is what lets tests import server-only-guarded modules at all.
// The guard itself is untouched in the actual Next.js build.
export {};
