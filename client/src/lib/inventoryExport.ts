import * as XLSX from "xlsx";

export type ExportSheet = {
  name: string;
  rows: Array<Record<string, unknown>>;
};

const columnLetter = (column: number) => {
  let value = "";
  let current = column;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
};

const inventoryRow = (unit: any) => ({
  "Market region": unit.marketRegion ?? "Unassigned",
  Zone: unit.zone ?? "Unassigned",
  "Micro-zone": unit.microZone ?? "Unassigned",
  Locality: unit.locality ?? "",
  Society: unit.societyName ?? "",
  "Unit number": unit.unitNumber ?? "",
  Floor: unit.floor ?? "",
  Configuration: unit.configuration ?? "",
  "Area (sqft)": unit.areaSqft ?? "",
  Status: unit.status ?? "",
  "Ask price": unit.askPriceDisplay ?? (unit.askPriceValue != null ? Number(unit.askPriceValue) : ""),
  "Ask price value": unit.askPriceValue != null ? Number(unit.askPriceValue) : "",
  "Marked new": unit.isMarkedNew ? "Yes" : "No",
  "Last seen": unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString() : "",
});

export const inventoryToExportRows = (rows: any[]) => rows.map(inventoryRow);

const withWidths = (worksheet: XLSX.WorkSheet, rows: Array<Record<string, unknown>>) => {
  const headers = rows.length ? Object.keys(rows[0]!) : ["Status"];
  worksheet["!cols"] = headers.map(header => {
    const maxValue = rows.reduce((max, row) => Math.max(max, String(row[header] ?? "").length), header.length);
    return { wch: Math.min(Math.max(maxValue + 2, 12), 34) };
  });
  const lastRow = Math.max(rows.length + 1, 2);
  worksheet["!autofilter"] = { ref: `A1:${columnLetter(headers.length)}${lastRow}` };
};

export const downloadWorkbook = (filename: string, sheets: ExportSheet[]) => {
  const workbook = XLSX.utils.book_new();
  const normalizedSheets = sheets.length ? sheets : [{ name: "Export", rows: [{ Status: "No records available" }] }];

  normalizedSheets.forEach(sheet => {
    const rows = sheet.rows.length ? sheet.rows : [{ Status: "No records available" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    withWidths(worksheet, rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31) || "Export");
  });

  XLSX.writeFile(workbook, filename);
};

export const downloadInventorySection = (filename: string, sectionName: string, rows: any[]) => {
  downloadWorkbook(filename, [{ name: sectionName, rows: inventoryToExportRows(rows) }]);
};
