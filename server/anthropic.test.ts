import { describe, expect, it, vi, beforeEach } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("Anthropic custom key routing and LLM wrapper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("formats messages and invokes Anthropic Messages API when custom key is provided", async () => {
    // Mock fetch for Anthropic API
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "msg_123",
        model: "claude-3-5-sonnet-20241022",
        content: [{ type: "text", text: JSON.stringify({ units: [{ societyName: "Test Society", unitNumber: "A-101", areaSqft: 1500, configuration: "3 BHK", floor: "10", locality: "Sector 50", marketRegion: "Gurgaon", zone: "SPR", microZone: "Sector 50", status: "Available", askPriceDisplay: "1.5 Cr", askPriceValue: 15000000, isMarkedNew: false }] }) }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    // Mock db to return custom Claude API key
    vi.mock("./db", async () => {
      const actual = await vi.importActual("./db");
      return {
        ...actual,
        getDb: async () => ({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => [{ configKey: "CLAUDE_API_KEY", configValue: "sk-ant-api03-testkey1234567890" }]
              })
            })
          })
        })
      };
    });

    const res = await invokeLLM({
      messages: [{ role: "user", content: "Extract inventory" }]
    });

    expect(res).toBeDefined();
    expect(res.choices[0].message.content).toContain("Test Society");
  });
});
