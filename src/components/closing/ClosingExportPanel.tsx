/**
 * ClosingExportPanel — Fase 4: exportação e persistência.
 * - Exporta jogos em CSV, TXT ou JSON.
 * - Copia para clipboard.
 * - Salva todos os jogos em saved_bets (com limite do plano).
 */

import { useState } from "react";
import { validateWheelCoverage } from "@/engine/wheeling/coverageValidator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Save, FileJson, FileText, FileSpreadsheet, FileDown, Loader2, Check } from "lucide-react";
import type { ClosingResult } from "@/engine/closing";
import { useSavedBets } from "@/hooks/useSavedBets";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { toast } from "sonner";

interface Props {
  result: ClosingResult;
}

export function ClosingExportPanel({ result }: Props) {
  const { config } = useLotteryContext();
  const { saveBet, remaining, isAtLimit } = useSavedBets(config.id);
  const [savingAll, setSavingAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const strategyLabel = result.strategy;

  const toTXT = () =>
    result.games.map((g, i) => `#${i + 1}\t${g.map(pad).join("  ")}`).join("\n");

  const toCSV = () => {
    const header = ["jogo", ...Array.from({ length: result.request.lottery.pick }, (_, i) => `n${i + 1}`)].join(",");
    const rows = result.games.map((g, i) => [i + 1, ...g].join(","));
    return [header, ...rows].join("\n");
  };

  const toJSON = () =>
    JSON.stringify(
      {
        lottery: result.request.lottery,
        strategy: result.strategy,
        guarantee: result.request.guarantee,
        gameCount: result.gameCount,
        cost: result.cost,
        validation: result.validation,
        score: result.score,
        games: result.games,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    );

  const download = (content: string, ext: "txt" | "csv" | "json") => {
    const mime = ext === "json" ? "application/json" : ext === "csv" ? "text/csv" : "text/plain";
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fechamento-${config.id}-${strategyLabel}-${result.gameCount}jogos.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exportado como .${ext}`);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(toTXT());
      setCopied(true);
      toast.success("Jogos copiados!");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  /**
   * Toda afirmação de garantia impressa aqui é verificada contra os jogos reais.
   * Antes o PDF imprimia a garantia pedida sem checar se o fechamento a cumpre.
   */
  const coverage = validateWheelCoverage(
    result.games,
    result.request.baseNumbers.length,
    result.request.lottery.pick,
    result.request.guarantee.hitsInBase,
    result.request.guarantee.minHits,
  );

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Fechamento — ${result.request.lottery.name}`, 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    const info = [
      `Estrategia: ${result.strategy}`,
      `Jogos: ${result.gameCount}   Custo: R$ ${result.cost.toFixed(2)}`,
      `Garantia: ${result.request.guarantee.minHits} acertos se ${result.request.guarantee.hitsInBase} cairem na base de ${result.request.baseNumbers.length}`,
      // Uma garantia só é garantia se todos os cenários foram enumerados. Quando o
      // universo é grande demais o validador amostra, e isso precisa estar escrito
      // no documento que o usuário leva — não apenas num campo que ninguém exibe.
      coverage.exhaustive
        ? `Verificacao: EXAUSTIVA (${coverage.testedScenarios} cenarios enumerados)`
        : `Verificacao: AMOSTRAL (${coverage.testedScenarios} cenarios) - NAO e uma prova`,
      `Menor acerto realmente entregue em qualquer cenario testado: ${coverage.guaranteedHits}`,
      coverage.meetsGoalPercent < 100
        ? `ATENCAO: a meta falhou em ${(100 - coverage.meetsGoalPercent).toFixed(1)}% dos cenarios testados.`
        : `A meta foi atingida em 100% dos cenarios testados.`,
      `Score: ${result.score.overall}/100   Gerado em ${new Date().toLocaleString("pt-BR")}`,
    ];
    info.forEach((t, i) => doc.text(t, 40, 70 + i * 14));
    autoTable(doc, {
      startY: 140,
      head: [["#", ...Array.from({ length: result.request.lottery.pick }, (_, i) => `N${i + 1}`)]],
      body: result.games.map((g, i) => [i + 1, ...g.map(pad)]),
      styles: { font: "helvetica", fontSize: 10, halign: "center", cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 40], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: 40, right: 40 },
    });
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Titan Loterias — pagina ${doc.getNumberOfPages()}`, w - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    doc.save(`fechamento-${config.id}-${result.strategy}-${result.gameCount}jogos.pdf`);
    toast.success("PDF exportado");
  };



  const saveAll = async () => {
    if (isAtLimit) {
      toast.error("Limite de jogos salvos atingido no seu plano.");
      return;
    }
    setSavingAll(true);
    setSavedCount(0);
    const toSave = result.games.slice(0, remaining);
    let ok = 0;
    for (let i = 0; i < toSave.length; i++) {
      const success = await saveBet({
        numbers: toSave[i],
        strategy: `fechamento:${result.strategy}`,
        score: result.score.overall,
        grade: result.score.overall >= 90 ? "S" : result.score.overall >= 75 ? "A" : result.score.overall >= 60 ? "B" : "C",
        label: `Fechamento #${i + 1}/${result.gameCount}`,
      });
      if (success) ok++;
      setSavedCount(ok);
    }
    setSavingAll(false);
    if (ok > 0) toast.success(`${ok} jogo(s) salvos em Meus Jogos.`);
    if (ok < result.games.length) {
      toast.warning(`${result.games.length - ok} não salvo(s) — limite do plano.`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar & Salvar
          <Badge variant="secondary" className="ml-auto">
            {result.gameCount} jogos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/20 p-2.5 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Status da Garantia:</span>
            <Badge variant="outline" className={coverage.exhaustive ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px]" : "text-amber-400 border-amber-500/30 bg-amber-500/10 font-mono text-[10px]"}>
              {coverage.exhaustive ? `EXAUSTIVA (${coverage.testedScenarios} cenários enumerados)` : `AMOSTRAL (${coverage.testedScenarios} cenários simulados)`}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Garantia real: {coverage.guaranteedHits} acertos ({coverage.meetsGoalPercent.toFixed(1)}% na meta)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Button variant="outline" size="sm" onClick={downloadPDF}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => download(toTXT(), "txt")}>
            <FileText className="h-4 w-4 mr-1" /> TXT
          </Button>
          <Button variant="outline" size="sm" onClick={() => download(toCSV(), "csv")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => download(toJSON(), "json")}>
            <FileJson className="h-4 w-4 mr-1" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={copyAll}>
            {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
            Copiar
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
          <div className="text-sm">
            <p className="font-semibold">Salvar em Meus Jogos</p>
            <p className="text-xs text-muted-foreground">
              {isAtLimit
                ? "Limite do plano atingido."
                : `Serão salvos até ${Math.min(remaining, result.gameCount)} de ${result.gameCount} jogos.`}
            </p>
          </div>
          <Button size="sm" onClick={saveAll} disabled={savingAll || isAtLimit}>
            {savingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {savedCount}/{Math.min(remaining, result.gameCount)}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> Salvar todos
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
