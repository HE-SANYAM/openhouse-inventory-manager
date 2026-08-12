export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

type LoginListener = () => void;
const loginListeners = new Set<LoginListener>();

// PasswordLoginModal subscribes here so startLogin() can open it from
// anywhere (buttons, the global unauthorized-response handler in main.tsx)
// without those call sites needing to know about the modal.
export function onLoginRequested(listener: LoginListener): () => void {
  loginListeners.add(listener);
  return () => loginListeners.delete(listener);
}

// Open the password-login modal. Call this from an event handler or effect at
// the moment you want to prompt for sign-in, e.g. `onClick={() => startLogin()}`.
export const startLogin = () => {
  loginListeners.forEach(listener => listener());
};
