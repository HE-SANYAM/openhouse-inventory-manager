import { timingSafeEqual } from "node:crypto";

export function validateInventoryResetPassword(candidate: string) {
  const expected = process.env.INVENTORY_RESET_PASSWORD ?? "";
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return expectedBuffer.length > 0 && candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}
