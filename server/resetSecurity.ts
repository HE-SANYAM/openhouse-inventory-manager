import { timingSafeEqual } from "node:crypto";

export function validateInventoryResetPassword(candidate: string) {
  const expected = process.env.INVENTORY_RESET_PASSWORD ?? "";
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return expectedBuffer.length > 0 && candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

// Gates access to the app itself (separate from the admin/reset password
// above). Used as a standalone login when the deployment isn't wired up to
// Manus's OAuth (e.g. self-hosted on Railway), so APP_LOGIN_PASSWORD is
// actually enforced instead of sitting unused.
export function validateAppLoginPassword(candidate: string) {
  const expected = process.env.APP_LOGIN_PASSWORD ?? "";
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return expectedBuffer.length > 0 && candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}
