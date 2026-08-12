import { describe, expect, it } from "vitest";
import { isSupportedUploadMime, uploadAcceptAttribute } from "../client/src/lib/ocrUpload";

describe("OCR upload file validation", () => {
  it("accepts supported PDFs and report image formats", () => {
    expect(isSupportedUploadMime("application/pdf")).toBe(true);
    expect(isSupportedUploadMime("image/png")).toBe(true);
    expect(isSupportedUploadMime("image/jpeg")).toBe(true);
    expect(isSupportedUploadMime("image/webp")).toBe(true);
    expect(isSupportedUploadMime("image/gif")).toBe(true);
    expect(uploadAcceptAttribute).toContain("application/pdf");
    expect(uploadAcceptAttribute).toContain("image/jpeg");
  });

  it("rejects unsupported files instead of sending them to OCR", () => {
    expect(isSupportedUploadMime("text/csv")).toBe(false);
    expect(isSupportedUploadMime("application/zip")).toBe(false);
    expect(isSupportedUploadMime("")).toBe(false);
  });
});
