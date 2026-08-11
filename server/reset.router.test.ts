import { describe, expect, it, vi } from "vitest";

const { resetInventoryData } = vi.hoisted(() => ({ resetInventoryData: vi.fn() }));
vi.mock("./db", () => ({ resetInventoryData, changeEvents: {}, inventorySnapshots: {}, inventoryUnits: {}, snapshotAssets: {}, getDb: vi.fn(), getLatestSnapshot: vi.fn(), getUnitsForSnapshot: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { appRouter } from "./routers";

describe("inventory reset authorization and scope", () => {
  const context = (role: "admin" | "user") => ({ user: { id: 1, openId: `${role}-user`, role }, req: {}, res: {} } as any);

  it("rejects authenticated non-admin users before deletion", async () => {
    await expect(appRouter.createCaller(context("user")).resetInventory({ password: process.env.INVENTORY_RESET_PASSWORD ?? "" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(resetInventoryData).not.toHaveBeenCalled();
  });

  it("allows an admin with the configured password", async () => {
    resetInventoryData.mockResolvedValueOnce({ success: true });
    await expect(appRouter.createCaller(context("admin")).resetInventory({ password: process.env.INVENTORY_RESET_PASSWORD ?? "" })).resolves.toEqual({ success: true });
    expect(resetInventoryData).toHaveBeenCalledTimes(1);
  });

});
