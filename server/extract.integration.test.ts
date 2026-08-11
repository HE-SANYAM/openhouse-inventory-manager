import { describe, expect, it } from "vitest";
import { parseExtractionResponse } from "./ocrParsing";

describe("extract review payload compatibility", () => {
  it("produces the units collection expected by the review workflow from non-ideal model output", () => {
    const response = parseExtractionResponse("The model returned:\n```json\n{\"units\":[{\"societyName\":\"Arihant Amber\",\"unitNumber\":\"D-1407\"}],}\n```");
    expect(response).toMatchObject({ units: [{ societyName: "Arihant Amber", unitNumber: "D-1407" }] });
    expect(Array.isArray(response.units)).toBe(true);
  });
});
