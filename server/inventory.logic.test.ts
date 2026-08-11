import { describe, expect, it } from "vitest";
import { compareUnits, completenessScore, incompleteUploadWarning, mergeExtractedUnits, normalizeUnit, unitKey } from "@shared/inventoryLogic";

const unit = (overrides = {}) => ({ societyName: "Arihant Amber", unitNumber: "D- 1407", areaSqft: 1250, configuration: "3 BHK", floor: "14", locality: "Noida", status: "Available", askPriceDisplay: "90 Lacs", askPriceValue: 9000000, isMarkedNew: true, ...overrides });

describe("inventory comparison logic", () => {
  it("normalizes OCR spacing while keeping identity stable", () => {
    const normalized = normalizeUnit(unit());
    expect(normalized.unitNumber).toBe("D-1407");
    expect(unitKey(normalized)).toBe("arihant amber::d-1407");
  });
  it("scores complete rows at 100", () => {
    expect(completenessScore([normalizeUnit(unit())])).toBe(100);
    expect(normalizeUnit(unit({ askPriceDisplay: "1.09 Cr", askPriceValue: null })).askPriceValue).toBe(10900000);
    expect(incompleteUploadWarning(150, 70, 90)).toContain("80 units are missing");
  });
  it("merges rows from multiple screenshots and removes duplicate unit keys", () => {
    const merged = mergeExtractedUnits([[unit({ unitNumber: "A-101" })], [unit({ unitNumber: "B-202" }), unit({ unitNumber: "A-101", askPriceValue: 9100000 })]]);
    expect(merged.map(u => u.unitNumber)).toEqual(["A-101", "B-202"]);
    expect(merged[0]?.askPriceValue).toBe(9100000);
  });
  it("classifies sourced, updated, existing, and sold units", () => {
    const yesterday = [{ ...unit({ unitNumber: "D-1407" }), unitKey: "arihant amber::d-1407" }, { ...unit({ unitNumber: "B-907" }), unitKey: "arihant amber::b-907" }];
    const today = [unit({ unitNumber: "D-1407", askPriceValue: 8800000 }), unit({ unitNumber: "C-1202" })];
    const changes = compareUnits(today, yesterday);
    expect(changes.map(change => change.type)).toEqual(expect.arrayContaining(["price_changed", "sourced", "potentially_sold"]));
    expect(changes.find(change => change.type === "price_changed")?.unit.unitNumber).toBe("D-1407");
  });
});
