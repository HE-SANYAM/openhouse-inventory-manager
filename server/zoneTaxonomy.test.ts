import { describe, expect, it } from "vitest";
import { normalizeZoneFields, zoneSearchText } from "../shared/zoneTaxonomy";
import { normalizeUnit } from "../shared/inventoryLogic";

describe("NCR zone taxonomy", () => {
  it("normalizes whitespace without restricting future labels", () => {
    expect(normalizeZoneFields({ marketRegion: "  Gurgaon  ", zone: "  Dwarka   Expressway ", microZone: "" })).toEqual({
      marketRegion: "Gurgaon",
      zone: "Dwarka Expressway",
      microZone: null,
    });
  });

  it("keeps arbitrary OCR labels on normalized units", () => {
    const unit = normalizeUnit({
      societyName: "Sample Society",
      unitNumber: "D- 1407",
      areaSqft: 1200,
      configuration: "3 BHK",
      floor: "14",
      locality: "Gaur City",
      marketRegion: "Noida",
      zone: "Noida Extension",
      microZone: "Future Sector 99",
      status: "Available",
      askPriceDisplay: "1.09 Cr",
      askPriceValue: null,
      isMarkedNew: true,
    });

    expect(unit.unitNumber).toBe("D-1407");
    expect(unit.marketRegion).toBe("Noida");
    expect(unit.zone).toBe("Noida Extension");
    expect(unit.microZone).toBe("Future Sector 99");
    expect(zoneSearchText(unit)).toContain("future sector 99");
  });
});
