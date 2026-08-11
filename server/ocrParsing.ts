import { jsonrepair } from "jsonrepair";

export function parseExtractionResponse(content: unknown): { units: unknown[] } {
  const raw = Array.isArray(content)
    ? content.map((part: any) => typeof part === "string" ? part : part?.text ?? "").join("\n")
    : typeof content === "string" ? content : JSON.stringify(content ?? {});
  const withoutFence = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The OCR response did not contain a JSON object. Please retry the upload.");
  const candidate = withoutFence.slice(start, end + 1);
  try {
    const parsed = JSON.parse(candidate);
    return { units: Array.isArray(parsed?.units) ? parsed.units : [] };
  } catch {
    try {
      const repaired = JSON.parse(jsonrepair(candidate));
      return { units: Array.isArray(repaired?.units) ? repaired.units : [] };
    } catch {
      throw new Error("The OCR response could not be read as structured data. Please retry the upload.");
    }
  }
}
