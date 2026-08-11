import { describe, expect, it } from "vitest";
import { validateInventoryResetPassword } from "./resetSecurity";

describe("inventory reset secret", () => {
  it("accepts the configured server-side reset password and rejects incorrect input", () => {
    const configured = process.env.INVENTORY_RESET_PASSWORD;
    expect(configured).toBeTruthy();
    expect(validateInventoryResetPassword(configured ?? "")).toBe(true);
    expect(validateInventoryResetPassword(`${configured ?? ""}-incorrect`)).toBe(false);
  });
});
