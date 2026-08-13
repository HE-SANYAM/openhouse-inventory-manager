import { createApp } from "./app";

// Vercel's per-file /api builder doesn't reliably trace this project's
// cross-directory imports (server/, shared/, drizzle/) or its tsconfig path
// aliases (@shared/*), so it's bundled into a single self-contained file by
// esbuild (see vercel.json's buildCommand) instead of shipping this source
// file directly. Vercel treats an Express app as a request handler as-is --
// no adapter needed.
export default createApp();
