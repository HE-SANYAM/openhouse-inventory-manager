import { describe, expect, it } from "vitest";
import { inventoryToExportRows } from "../client/src/lib/inventoryExport";

describe("inventory Excel export shaping", () => {
  it("includes region, zone, micro-zone, and inventory fields", () => {
    const [row] = inventoryToExportRows([{
      marketRegion: "Noida",
      zone: "Noida Extension",
      microZone: "Gaur City 1 & Gaur City 2",
      locality: "Gaur City",
      societyName: "Sample Heights",
      unitNumber: "A-1204",
      areaSqft: "1200",
      status: "Available",
      askPriceDisplay: "1.09 Cr",
      isMarkedNew: true,
    }]);

    expect(row).toMatchObject({
      "Market region": "Noida",
      Zone: "Noida Extension",
      "Micro-zone": "Gaur City 1 & Gaur City 2",
      Society: "Sample Heights",
      "Unit number": "A-1204",
      "Ask price": "1.09 Cr",
      "Marked new": "Yes",
    });
  });
});
