export type ZoneFields = {
  marketRegion: string | null;
  zone: string | null;
  microZone: string | null;
};

export type NcrTaxonomyNode = {
  region: string;
  zones: Array<{ name: string; microZones?: string[] }>;
};

/**
 * Starter suggestions for the UI. These are not an enum or validation list:
 * OCR can return new regions/zones and the filters are always facet-driven.
 */
export const NCR_TAXONOMY_SUGGESTIONS: NcrTaxonomyNode[] = [
  {
    region: "Gurgaon",
    zones: [
      { name: "SPR" },
      { name: "Dwarka Expressway" },
      { name: "New Gurgaon" },
    ],
  },
  {
    region: "Noida",
    zones: [
      { name: "Noida Extension", microZones: ["Gaur City 1 & Gaur City 2", "Sector 1", "Sector 2", "Sector 10", "Sector 12", "Sector 16", "Sector 16B"] },
      { name: "Noida Expressway" },
      { name: "Central Noida" },
    ],
  },
  {
    region: "Ghaziabad",
    zones: [
      { name: "Crossing Republik" },
      { name: "Raj Nagar Extension" },
      { name: "NH-24" },
    ],
  },
];

export const normalizeTaxonomyValue = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
};

export const normalizeZoneFields = (fields: Partial<ZoneFields>): ZoneFields => ({
  marketRegion: normalizeTaxonomyValue(fields.marketRegion),
  zone: normalizeTaxonomyValue(fields.zone),
  microZone: normalizeTaxonomyValue(fields.microZone),
});

export const facetLabel = (value: string | null | undefined) => value || "Unassigned";

export const zoneSearchText = (unit: Partial<ZoneFields> & { locality?: string | null; societyName?: string | null }) =>
  [unit.marketRegion, unit.zone, unit.microZone, unit.locality, unit.societyName].filter(Boolean).join(" ").toLowerCase();
