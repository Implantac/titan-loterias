/**
 * ClosingProExportPanel
 * Exportação profissional: PDF multipágina com capa/estatísticas/jogos
 * e planilha Excel com múltiplas abas (Resumo, Jogos, Distribuição, Frequência).
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import type { ClosingResult } from "@/engine/closing";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { formatCurrency } from "@/utils/formatters";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface Props {
  result: ClosingResult;
}

export function ClosingProExportPanel({ result }: Props) {
  const { config } = useLotteryContext();
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = new Date().toLocaleString("pt-BR");

  const freq = (() => {
    const map = new Map<number, number>();
    result.request.baseNumbers.forEach(n => map.set(n, 0));
    result.games.forEach(g => g.forEach(n => map.set(n, (map.get(n) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();

  const exportPDF = async () => {
    setBusy("pdf");
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const w = doc.internal.pageSize.getWidth();

      // Capa
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, w, 130, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Relatório de Fechamento", 40, 60);
      doc.setFontSize(12);
      doc.text(`${config.name} · Estratégia: ${result.strategy}`, 40, 84);
      doc.setFontSize(10);
      doc.text(`Gerado em ${stamp}`, 40, 104);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Resumo executivo", 40, 170);

      autoTable(doc, {
        startY: 185,
        head: [["Métrica", "Valor"]],
        body: [
          ["Dezenas na base", result.request.baseNumbers.length.toString()],
          ["Dezenas por jogo", result.request.lottery.pick.toString()],
          ["Meta de garantia", `${result.request.guarantee.minHits} acertos`],
          ["Garantia real entregue", `${result.validation.guaranteedHits} acertos`],
          ["Jogos gerados", result.gameCount.toString()],
          ["Mínimo teórico (Schönheim)", result.lowerBound.toString()],
          ["Custo total", formatCurrency(result.cost)],
          ["Preço por jogo", formatCurrency(result.request.lottery.ticketPrice)],
          ["Cobertura", `${result.validation.coveragePercent.toFixed(1)}%`],
          ["Eficiência", `${result.validation.efficiencyPercent.toFixed(1)}%`],
          ["Nota geral (0-100)", result.score.overall.toString()],
          ["Tempo de geração", `${result.elapsedMs} ms`],
        ],
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
      });

      // Distribuição de acertos
      const finalY1 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400;
      doc.setFontSize(14);
      doc.text("Distribuição de acertos", 40, finalY1 + 30);
      const distRows = Object.entries(result.validation.distribution)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([hits, count]) => {
          const pct = (count / result.validation.testedScenarios) * 100;
          return [`${hits} acertos`, count.toString(), `${pct.toFixed(2)}%`];
        });
      autoTable(doc, {
        startY: finalY1 + 40,
        head: [["Acertos", "Cenários", "%"]],
        body: distRows,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
      });

      // Frequência
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Frequência das dezenas nos jogos", 40, 50);
      autoTable(doc, {
        startY: 65,
        head: [["Dezena", "Aparições", "% dos jogos"]],
        body: freq.map(([n, count]) => [
          pad(n),
          count.toString(),
          `${((count / Math.max(1, result.gameCount)) * 100).toFixed(1)}%`,
        ]),
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
      });

      // Jogos
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Jogos do fechamento (${result.gameCount})`, 40, 50);
      autoTable(doc, {
        startY: 65,
        head: [["#", "Dezenas"]],
        body: result.games.map((g, i) => [(i + 1).toString(), g.map(pad).join("  ")]),
        theme: "grid",
        styles: { font: "courier", fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59], font: "helvetica" },
      });

      // Rodapé em todas as páginas
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${config.name} · ${result.strategy} · ${result.gameCount} jogos · Página ${i}/${pages}`,
          40,
          doc.internal.pageSize.getHeight() - 20,
        );
      }

      doc.save(`fechamento-${config.id}-${result.strategy}-${result.gameCount}jogos.pdf`);
      toast.success("PDF profissional gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setBusy(null);
    }
  };

  const exportXLSX = async () => {
    setBusy("xlsx");
    try {
      // Import dinâmico: o `xlsx` pesa ~400 kB e só é necessário quando o
      // usuário clica em exportar. Com import estático ele entrava no bundle
      // inicial e ainda anulava o code-splitting que `parsers.ts` já fazia —
      // o build avisava: "dynamic import will not move module into another
      // chunk".
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Aba Resumo
      const summary = [
        ["Relatório de Fechamento"],
        ["Modalidade", config.name],
        ["Estratégia", result.strategy],
        ["Gerado em", stamp],
        [],
        ["Métrica", "Valor"],
        ["Dezenas na base", result.request.baseNumbers.length],
        ["Dezenas por jogo", result.request.lottery.pick],
        ["Meta de garantia", result.request.guarantee.minHits],
        ["Garantia real", result.validation.guaranteedHits],
        ["Jogos gerados", result.gameCount],
        ["Mínimo teórico (Schönheim)", result.lowerBound],
        ["Custo total (R$)", result.cost],
        ["Preço por jogo (R$)", result.request.lottery.ticketPrice],
        ["Cobertura (%)", result.validation.coveragePercent],
        ["Eficiência (%)", result.validation.efficiencyPercent],
        ["Nota geral (0-100)", result.score.overall],
        ["Tempo (ms)", result.elapsedMs],
        [],
        ["Base"],
        [result.request.baseNumbers.map(n => pad(n)).join(", ")],
      ];
      const wsSum = XLSX.utils.aoa_to_sheet(summary);
      wsSum["!cols"] = [{ wch: 32 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, wsSum, "Resumo");

      // Aba Jogos
      const gamesHeader = ["#", ...Array.from({ length: result.request.lottery.pick }, (_, i) => `n${i + 1}`)];
      const gamesRows = result.games.map((g, i) => [i + 1, ...g]);
      const wsGames = XLSX.utils.aoa_to_sheet([gamesHeader, ...gamesRows]);
      wsGames["!cols"] = [{ wch: 6 }, ...Array.from({ length: result.request.lottery.pick }, () => ({ wch: 5 }))];
      XLSX.utils.book_append_sheet(wb, wsGames, "Jogos");

      // Aba Distribuição
      const distRows = Object.entries(result.validation.distribution)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([hits, count]) => [
          Number(hits),
          count,
          (count / result.validation.testedScenarios) * 100,
        ]);
      const wsDist = XLSX.utils.aoa_to_sheet([["Acertos", "Cenários", "%"], ...distRows]);
      wsDist["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsDist, "Distribuição");

      // Aba Frequência
      const freqRows = freq.map(([n, count]) => [
        pad(n),
        count,
        (count / Math.max(1, result.gameCount)) * 100,
      ]);
      const wsFreq = XLSX.utils.aoa_to_sheet([["Dezena", "Aparições", "% dos jogos"], ...freqRows]);
      wsFreq["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsFreq, "Frequência");

      XLSX.writeFile(wb, `fechamento-${config.id}-${result.strategy}-${result.gameCount}jogos.xlsx`);
      toast.success("Planilha Excel gerada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar Excel.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Exportação Profissional
          <Badge variant="outline" className="ml-2 text-xs">PDF + Excel multi-aba</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Gera um relatório completo com capa, resumo executivo, distribuição de acertos, frequência
          das dezenas e a lista de jogos. Ideal para arquivar ou compartilhar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportPDF} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            PDF profissional
          </Button>
          <Button variant="secondary" onClick={exportXLSX} disabled={busy !== null}>
            {busy === "xlsx" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
            Excel (4 abas)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
