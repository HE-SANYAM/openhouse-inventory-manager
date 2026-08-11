import { describe, expect, it } from "vitest";
import { parseExtractionResponse } from "./ocrParsing";

describe("OCR extraction response parsing", () => {
  it("accepts a normal JSON object", () => {
    expect(parseExtractionResponse('{"units":[{"unitNumber":"A-101"}]}').units).toHaveLength(1);
  });
  it("removes markdown fences and surrounding text", () => {
    const result = parseExtractionResponse('Here is the result:\n```json\n{"units":[{"unitNumber":"B-202"}]}\n```');
    expect((result.units[0] as any).unitNumber).toBe("B-202");
  });
  it("repairs common malformed JSON", () => {
    const result = parseExtractionResponse('{"units":[{"unitNumber":"C-303",}],}');
    expect((result.units[0] as any).unitNumber).toBe("C-303");
  });
  it("fails with a user-readable OCR message when no object exists", () => {
    expect(() => parseExtractionResponse("Unable to extract")).toThrow(/OCR response/);
  });
});
