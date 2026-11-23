import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { safeSpreadsheetRows, serializeCsv } from "./export";

describe("exportação de jogos e rótulos", () => {
  it("escapa aspas, vírgulas e quebras no CSV", () => {
    expect(serializeCsv([["Nome", "a,\"b\"\nc"]])).toBe('\uFEFF"Nome","a,""b""\nc"');
  });
  it("não executa rótulos como fórmulas em CSV ou XLSX", () => {
    const rows = [["Jogo", "=HYPERLINK(\"https://example.com\")", "  +SUM(1,2)", "@CMD", -5]];
    const csv = serializeCsv(rows);
    expect(csv).toContain('"\'=HYPERLINK');
    expect(csv).toContain('"\'  +SUM');
    const sheet = XLSX.utils.aoa_to_sheet(safeSpreadsheetRows(rows));
    expect(sheet.B1.t).toBe("s");
    expect(sheet.B1.f).toBeUndefined();
    expect(sheet.E1.t).toBe("n");
  });
});
