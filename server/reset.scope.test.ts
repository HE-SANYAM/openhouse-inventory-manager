import { describe, expect, it } from "vitest";
import { changeEvents, inventorySnapshots, inventoryUnits, snapshotAssets, users } from "../drizzle/schema";
import { resetInventoryData } from "./db";

describe("resetInventoryData", () => {
  it("deletes child inventory records before snapshots and never touches users", async () => {
    const deleted: unknown[] = [];
    const fakeDb = { delete: (table: unknown) => { deleted.push(table); return Promise.resolve(); } };
    await resetInventoryData(fakeDb);
    expect(deleted).toEqual([changeEvents, snapshotAssets, inventoryUnits, inventorySnapshots]);
    expect(deleted).not.toContain(users);
  });
});
