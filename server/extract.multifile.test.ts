import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => ({ invokeLLM }));
vi.mock("./db", () => ({ changeEvents: {}, getDb: vi.fn().mockResolvedValue(null), getLatestActiveUnits: vi.fn().mockResolvedValue([]), getLatestSnapshot: vi.fn().mockResolvedValue(null), getUnitsForSnapshot: vi.fn().mockResolvedValue([]), inventorySnapshots: {}, inventoryUnits: {}, snapshotAssets: {} }));

import { appRouter } from "./routers";

describe("extract multi-file workflow", () => {
  beforeEach(() => {
    invokeLLM.mockReset();
    invokeLLM.mockImplementation(async ({ messages }: any) => {
      const image = messages[1].content.find((part: any) => part.type === "image_url").image_url.url;
      const suffix = image.split("/").pop()?.replace(".png", "") ?? "x";
      return { choices: [{ message: { content: JSON.stringify({ units: [{ societyName: "Test Society", unitNumber: `U-${suffix}`, areaSqft: 1000, configuration: "2 BHK", floor: "5", locality: "Noida", status: "Available", askPriceDisplay: "90 Lacs", askPriceValue: 9000000, isMarkedNew: false }] }) } }] };
    });
  });

  it("calls OCR once per uploaded screenshot and returns coverage for every file", async () => {
    const ctx: any = { user: { id: 1, openId: "test", role: "user" }, req: {}, res: {} };
    const files = ["a", "b", "c"].map((name) => ({ name: `${name}.png`, mimeType: "image/png", url: `https://blob.test/${name}.png` }));
    const result = await appRouter.createCaller(ctx).extract({ files });
    expect(invokeLLM).toHaveBeenCalledTimes(3);
    expect(result.processedImageCount).toBe(3);
    expect(result.coverage).toHaveLength(3);
    expect(result.coverage.every((item: any) => item.status === "processed")).toBe(true);
    expect(result.units).toHaveLength(3);
  });
});
