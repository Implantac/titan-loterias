import * as XLSX from "xlsx";

/** Prevent user-supplied labels from becoming formulas when opened in a spreadsheet. */
export function safeSpreadsheetCell(value: unknown): string | number | boolean {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  const text = String(value ?? "");
  return /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) ? `'${text}` : text;
}

export function serializeCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map(row => row.map(value => {
    const text = String(safeSpreadsheetCell(value));
    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function safeSpreadsheetRows(rows: unknown[][]): (string | number | boolean)[][] {
  return rows.map(row => row.map(safeSpreadsheetCell));
}

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToCsv(filename: string, data: unknown[][]): void {
  download(`${filename}.csv`, new Blob([serializeCsv(data)], { type: "text/csv;charset=utf-8" }));
}

/** Real OOXML workbook, not HTML mislabelled as a legacy .xls file. */
export function exportToExcel(filename: string, data: unknown[][]): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(safeSpreadsheetRows(data));
  XLSX.utils.book_append_sheet(workbook, sheet, "Jogos salvos");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  download(`${filename}.xlsx`, new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}
