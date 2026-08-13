import { createApp } from "../server/_core/app";

// Vercel treats an Express app as a request handler directly -- no adapter
// needed. Static client assets are served by Vercel's own hosting layer
// (see vercel.json), not by this function; this only handles /api/*.
export default createApp();
