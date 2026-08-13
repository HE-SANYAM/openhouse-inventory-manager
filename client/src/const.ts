export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// This deployment has no login: server/_core/context.ts auto-authenticates
// every request as a single local admin user. Kept as a no-op (rather than
// removed) so existing call sites -- Sign in buttons, the global
// unauthorized-response handler in main.tsx -- don't need to change.
export const startLogin = () => {};
