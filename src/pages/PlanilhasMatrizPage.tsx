import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Grid3X3,
  FileSpreadsheet,
  CheckCircle2,
  Save,
  Sparkles,
  Target,
  AlertTriangle,
  Table2,
  Copy,
  Download,
  Flame,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Info,
} from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { computeMatrixAnalysis } from "@/engine/matrix-analysis";
import {
  analyzeWorksheetGames,
  generateWorksheetMatrixGames,
  getPresetInputSize,
  LOTOFACIL_WORKSHEET_PRESETS,
  selectTopLotofacilNumbers,
} from "@/engine/worksheet-matrices";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";
import { EmptyState } from "@/components/common/EmptyState";
import { PlanGate } from "@/components/PlanGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDrawDate } from "@/lib/draw-date";

// Estimativa de prêmios oficiais da Lotofácil da Caixa
const PRIZE_ESTIMATES: Record<number, number> = {
  11: 6,       // Fixo R$ 6,00
  12: 12,      // Fixo R$ 12,00
  13: 30,      // Fixo R$ 30,00
  14: 1500,    // Média estimada de rateio
  15: 1500000, // Média estimada de rateio principal
};

export default function PlanilhasMatrizPage() {
  const { config, draws, selectedLottery, setSelectedLottery, farol } = useLotteryContext();
  const { saveBet } = useSavedBets(selectedLottery);
  const [presetId, setPresetId] = useState(LOTOFACIL_WORKSHEET_PRESETS[0].id);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedDrawConcurso, setSelectedDrawConcurso] = useState<string>("latest");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const matrixData = useMemo(() => computeMatrixAnalysis(draws, config.numbers), [draws, config.numbers]);
  const rankedNumbers = useMemo(() => matrixData.map((row) => row.number), [matrixData]);
  const preset = LOTOFACIL_WORKSHEET_PRESETS.find((item) => item.id === presetId) ?? LOTOFACIL_WORKSHEET_PRESETS[0];
  const inputSize = getPresetInputSize(preset);

  // Mapeamento de status estatístico por dezena usando o motor FAROL
  const farolMap = useMemo(() => {
    const map = new Map<number, { status: "hot" | "warm" | "cold"; delay: number; grade: string; freq: number }>();
    if (farol && farol.length > 0) {
      for (const item of farol) {
        map.set(item.number, {
          status: item.trendStatus || "warm",
          delay: item.currentDelay || 0,
          grade: item.titanGrade || "Medium",
          freq: item.frequency || 0,
        });
      }
    }
    return map;
  }, [farol]);

  // Último sorteio para cálculo de dezenas repetidas x ausentes
  const latestDraw = draws[0] ?? null;
  const latestDrawSet = useMemo(() => new Set(latestDraw?.numbers ?? []), [latestDraw]);
  const absentFromLatest = useMemo(() => {
    if (!latestDraw) return [];
    return Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !latestDrawSet.has(n));
  }, [latestDraw, latestDrawSet]);

  const selectedDraw = useMemo(() => {
    if (selectedDrawConcurso === "latest") return draws[0] ?? null;
    return draws.find((draw) => String(draw.concurso) === selectedDrawConcurso) ?? draws[0] ?? null;
  }, [draws, selectedDrawConcurso]);

  const previousDraw = useMemo(() => {
    if (!selectedDraw) return null;
    const idx = draws.findIndex((draw) => draw.concurso === selectedDraw.concurso);
    return idx >= 0 ? draws[idx + 1] ?? null : null;
  }, [draws, selectedDraw]);

  const generatedGames = useMemo(
    () => generateWorksheetMatrixGames(preset, selectedNumbers),
    [preset, selectedNumbers],
  );

  const analysis = useMemo(
    () => analyzeWorksheetGames(generatedGames, selectedDraw, previousDraw),
    [generatedGames, selectedDraw, previousDraw],
  );

  // Cálculo financeiro da simulação
  const financialSummary = useMemo(() => {
    let totalPrizesValue = 0;
    let prizeCounts: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };

    for (const [hitsStr, count] of Object.entries(analysis.hitDistribution)) {
      const hits = Number(hitsStr);
      if (hits >= 11 && hits <= 15) {
        prizeCounts[hits] = (prizeCounts[hits] || 0) + count;
        totalPrizesValue += count * (PRIZE_ESTIMATES[hits] || 0);
      }
    }

    const netResult = totalPrizesValue - analysis.totalCost;
    return {
      prizeCounts,
      totalPrizesValue,
      netResult,
      isProfitable: netResult > 0,
    };
  }, [analysis]);

  const canGenerate = selectedNumbers.length >= inputSize && generatedGames.length > 0;

  // Atalhos de Seleção
  const autoSelect = () => {
    const numbers = selectTopLotofacilNumbers(rankedNumbers, inputSize);
    setSelectedNumbers(numbers);
  };

  const selectFarolHot = () => {
    if (farol && farol.length > 0) {
      const sorted = [...farol].sort((a, b) => b.titanScore - a.titanScore);
      const topNumbers = sorted.slice(0, inputSize).map((s) => s.number).sort((a, b) => a - b);
      setSelectedNumbers(topNumbers);
      toast.success(`${topNumbers.length} dezenas de maior força no Farol selecionadas.`);
    } else {
      autoSelect();
    }
  };

  const selectGoldenRatio = () => {
    // 9 repetidas do último sorteio + ausentes mais quentes (padrão ouro)
    if (!latestDraw) return autoSelect();
    const repeatedPool = [...latestDraw.numbers];
    const absentPool = [...absentFromLatest];

    // Ordenar pelo Farol
    repeatedPool.sort((a, b) => (farolMap.get(b)?.delay ?? 0) - (farolMap.get(a)?.delay ?? 0));
    absentPool.sort((a, b) => (farolMap.get(b)?.freq ?? 0) - (farolMap.get(a)?.freq ?? 0));

    const targetRepeated = Math.min(9, inputSize - 1);
    const targetAbsent = inputSize - targetRepeated;

    const chosen = [
      ...repeatedPool.slice(0, targetRepeated),
      ...absentPool.slice(0, targetAbsent),
    ].sort((a, b) => a - b);

    setSelectedNumbers(chosen);
    toast.success(`Selecionadas ${targetRepeated} repetidas + ${targetAbsent} ausentes (Padrão Farol).`);
  };

  const toggleNumber = (number: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(number)) return prev.filter((item) => item !== number);
      if (prev.length >= inputSize) return prev;
      return [...prev, number].sort((a, b) => a - b);
    });
  };

  const copyGamesToClipboard = async () => {
    if (!canGenerate) return;
    const header = `=== TITAN LOTERIAS — PLANILHA ${preset.sheetName} ===\n` +
      `Modelo: ${preset.label} (${preset.gameCount} jogos)\n` +
      `Custo total: R$ ${(preset.gameCount * 3).toFixed(2)}\n\n`;

    const lines = generatedGames.map((game, i) => {
      const formatted = game.map((n) => String(n).padStart(2, "0")).join(" ");
      return `Jogo ${String(i + 1).padStart(2, "0")}: ${formatted}`;
    }).join("\n");

    try {
      await navigator.clipboard.writeText(header + lines);
      setCopied(true);
      toast.success(`${generatedGames.length} jogos copiados para a área de transferência!`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  const downloadTxtFile = () => {
    if (!canGenerate) return;
    const header = `TITAN LOTERIAS - ${preset.sheetName}\n` +
      `Data: ${new Date().toLocaleDateString("pt-BR")}\n` +
      `Jogos: ${preset.gameCount} | Custo: R$ ${(preset.gameCount * 3).toFixed(2)}\n\n`;

    const lines = generatedGames.map((game, i) => {
      const formatted = game.map((n) => String(n).padStart(2, "0")).join(" ");
      return `J${String(i + 1).padStart(2, "0")}: ${formatted}`;
    }).join("\n");

    const blob = new Blob([header + lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `titan-farol-${preset.id}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo TXT gerado com sucesso.");
  };

  const saveAllGames = async () => {
    if (!canGenerate) return;
    setSaving(true);
    let saved = 0;
    for (const game of generatedGames) {
      const ok = await saveBet({
        numbers: game,
        strategy: `Planilha Matriz: ${preset.label}`,
        label: `${preset.sheetName} J${saved + 1}`,
      });
      if (ok) saved++;
    }
    setSaving(false);
    if (saved > 0) toast.success(`${saved} jogos salvos no seu histórico.`);
  };

  // Se não estiver na Lotofácil, oferece alternância rápida com 1 clique
  if (selectedLottery !== "lotofacil") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Planilhas Farol"
          description="Metodologia exclusiva de desdobramentos para Lotofácil"
          icon={FileSpreadsheet}
          badge="Exclusivo Lotofácil"
        />
        <LotteryContextBanner />
        <Card className="glass-card border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Esta metodologia é exclusiva para a Lotofácil
                </h3>
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Os modelos matemáticos <strong>Farol (21x50, 19x5, 17x8, 13x6, etc.)</strong> foram construídos especificamente para o universo de 25 dezenas com sorteios de 15 números da Lotofácil.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setSelectedLottery("lotofacil")}
              size="lg"
              className="gap-2 shrink-0 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-4 h-4" />
              Alternar para Lotofácil
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (draws.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Planilhas Farol" description="Geração e conferência em formato de planilha" icon={FileSpreadsheet} />
        <LotteryContextBanner />
        <EmptyState description="Carregando sorteios da Lotofácil para alimentar os modelos do Farol..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planilhas Farol — Lotofácil"
        description="Desdobramentos dinâmicos baseados na planilha oficial Farol Selecionador (21x50, 19x5, 17x8, 13x6 e mais)."
        icon={FileSpreadsheet}
        badge="Lotofácil Oficial"
      />
      <LotteryContextBanner />
      <ComplianceDisclaimer />

      {/* --- FAROL CONTEXT BAR (COMO NA ABA FAROL DA PLANILHA) --- */}
      {latestDraw && (
        <Card className="glass-card border-primary/20 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-primary/10 bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Painel Farol — Concurso #{latestDraw.concurso} ({formatDrawDate(latestDraw.date)})
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                <span>15 Sorteadas</span>
                <span className="text-border">•</span>
                <span>10 Ausentes</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Flame className="w-3 h-3" /> Dezenas Sorteadas (Repetidas Potenciais):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {latestDraw.numbers.map((n) => (
                  <span
                    key={n}
                    className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center shadow-sm"
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Dezenas Ausentes no Último Concurso:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {absentFromLatest.map((n) => (
                  <span
                    key={n}
                    className="w-7 h-7 rounded-lg bg-secondary/30 border border-border/50 text-muted-foreground font-mono text-xs font-medium flex items-center justify-center"
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PlanGate feature="fechamentos" fallbackMessage="Planilhas Farol e conferidor de matrizes">
        <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-6">
          
          {/* --- COLUNA ESQUERDA: CONFIGURAÇÃO & SELETOR DO FAROL --- */}
          <div className="space-y-6">
            <Card className="glass-card border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  1. Escolha o Desdobramento
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione uma das matrizes inspiradas na planilha oficial Farol v2.1
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Modelo de Fechamento</span>
                  <Select
                    value={preset.id}
                    onValueChange={(value) => {
                      setPresetId(value);
                      setSelectedNumbers([]);
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOTOFACIL_WORKSHEET_PRESETS.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <span className="font-bold">{item.label}</span> — {item.gameCount} jogos ({item.sheetName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/15 p-2.5 rounded-lg border border-border/40">
                    {preset.description}
                  </p>
                  {(preset.statisticalCoverage || preset.minPrizeChance) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {preset.statisticalCoverage && (
                        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs">
                          Cobertura Teórica: {preset.statisticalCoverage}
                        </Badge>
                      )}
                      {preset.minPrizeChance && (
                        <Badge variant="outline" className="border-accent/40 text-accent bg-accent/5 text-xs">
                          Premiação ≥11: {preset.minPrizeChance}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Dezenas" value={inputSize} />
                  <Metric label="Total Jogos" value={preset.gameCount} />
                  <Metric label="Custo (R$)" value={`R$ ${(preset.gameCount * 3).toFixed(2)}`} highlight />
                </div>

                {/* --- SELETOR DE DEZENAS VISUAL (ESTILO FAROL) --- */}
                <div className="rounded-xl border border-border/60 bg-card/30 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">2. Selecione as {inputSize} Dezenas</span>
                      <p className="text-[11px] text-muted-foreground">Cores baseadas na força do Farol estatístico</p>
                    </div>
                    <Badge
                      variant={selectedNumbers.length === inputSize ? "default" : "outline"}
                      className={`font-mono text-xs ${selectedNumbers.length === inputSize ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {selectedNumbers.length} / {inputSize}
                    </Badge>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectFarolHot}
                      className="text-[10px] h-8 px-2 gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Flame className="w-3 h-3 text-emerald-400" />
                      Top Farol
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectGoldenRatio}
                      className="text-[10px] h-8 px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      9 Rep. + Aus.
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={autoSelect}
                      className="text-[10px] h-8 px-2 gap-1"
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNumbers([])}
                      className="text-[10px] h-8 px-2 text-muted-foreground"
                    >
                      Limpar
                    </Button>
                  </div>

                  {/* Grade 5x5 estilo volante */}
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {Array.from({ length: 25 }, (_, i) => i + 1).map((number) => {
                      const selected = selectedNumbers.includes(number);
                      const isRepeated = latestDrawSet.has(number);
                      const disabled = !selected && selectedNumbers.length >= inputSize;
                      const farolInfo = farolMap.get(number);
                      const status = farolInfo?.status || "warm";

                      // Borda baseada no Farol
                      const farolBorder =
                        status === "hot"
                          ? "border-emerald-500/60 text-emerald-400"
                          : status === "cold"
                            ? "border-rose-500/60 text-rose-400"
                            : "border-amber-500/50 text-amber-300";

                      return (
                        <button
                          key={number}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleNumber(number)}
                          className={`relative h-12 rounded-xl border-2 text-xs font-bold font-mono transition-all flex flex-col items-center justify-center ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105 z-10"
                              : disabled
                                ? "bg-muted/10 text-muted-foreground/30 border-transparent cursor-not-allowed opacity-40"
                                : `bg-background/50 hover:bg-background/80 ${farolBorder} hover:scale-102`
                          }`}
                        >
                          <span className="text-sm font-black">{String(number).padStart(2, "0")}</span>
                          <span className="text-[9px] font-sans opacity-75 font-semibold">
                            {isRepeated ? "Rep." : "Aus."}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legenda do Farol */}
                  <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Forte
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Padrão
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Atrasada
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground">3. Conferir e Simular com Concurso</span>
                  <Select value={selectedDrawConcurso} onValueChange={setSelectedDrawConcurso}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Último concurso oficial (#{draws[0]?.concurso})</SelectItem>
                      {draws.slice(0, 40).map((draw) => (
                        <SelectItem key={draw.concurso} value={String(draw.concurso)}>
                          Concurso {draw.concurso} — {formatDrawDate(draw.date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* --- COLUNA DIREITA: JOGOS GERADOS & CONFERIDOR FINANCEIRO --- */}
          <div className="space-y-6">
            <Card className="glass-card border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Conferidor & Jogos do Desdobramento
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {preset.label} — {generatedGames.length} jogos gerados
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyGamesToClipboard}
                      disabled={!canGenerate}
                      className="gap-1.5 text-xs h-9"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTxtFile}
                      disabled={!canGenerate}
                      className="gap-1.5 text-xs h-9"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar TXT
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveAllGames}
                      disabled={!canGenerate || saving}
                      className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? "Salvando..." : "Salvar Jogos"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Resumo com Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Metric label="Melhor Acerto" value={canGenerate ? `${analysis.bestHits}/15` : "-"} highlight />
                  <Metric label="Concurso Alvo" value={selectedDraw?.concurso ?? "-"} />
                  <Metric label="Custo Fechamento" value={`R$ ${analysis.totalCost.toFixed(2)}`} />
                  <Metric
                    label="Retorno Estimado"
                    value={canGenerate ? `R$ ${financialSummary.totalPrizesValue.toFixed(2)}` : "-"}
                    color={financialSummary.isProfitable ? "text-emerald-400" : undefined}
                  />
                </div>

                {/* Resumo Financeiro da Premiação da Simulação */}
                {canGenerate && (
                  <div className="rounded-xl border border-border/50 bg-secondary/15 p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Resultado Financeiro da Simulação
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-black font-mono ${
                            financialSummary.isProfitable ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {financialSummary.netResult >= 0 ? "+" : ""}
                          R$ {financialSummary.netResult.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({financialSummary.isProfitable ? "Lucro Líquido" : "Saldo"})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {financialSummary.prizeCounts[11] > 0 && (
                        <Badge variant="outline" className="text-xs bg-background/50">
                          {financialSummary.prizeCounts[11]}x 11 pts (R$ {(financialSummary.prizeCounts[11] * 6).toFixed(2)})
                        </Badge>
                      )}
                      {financialSummary.prizeCounts[12] > 0 && (
                        <Badge variant="outline" className="text-xs bg-background/50">
                          {financialSummary.prizeCounts[12]}x 12 pts (R$ {(financialSummary.prizeCounts[12] * 12).toFixed(2)})
                        </Badge>
                      )}
                      {financialSummary.prizeCounts[13] > 0 && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          {financialSummary.prizeCounts[13]}x 13 pts (R$ {(financialSummary.prizeCounts[13] * 30).toFixed(2)})
                        </Badge>
                      )}
                      {financialSummary.prizeCounts[14] > 0 && (
                        <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold">
                          {financialSummary.prizeCounts[14]}x 14 PONTOS! 🏆
                        </Badge>
                      )}
                      {financialSummary.prizeCounts[15] > 0 && (
                        <Badge className="text-xs bg-emerald-500 text-white font-extrabold animate-pulse">
                          {financialSummary.prizeCounts[15]}x 15 PONTOS MÁXIMOS! 🎉
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabela de Jogos */}
                {!canGenerate ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground space-y-3">
                    <Target className="w-10 h-10 mx-auto text-primary/40 animate-pulse" />
                    <div>
                      <p className="font-semibold text-foreground text-base">Selecione {inputSize} dezenas para gerar a planilha</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Clique em <strong>Top Farol</strong> ou <strong>9 Rep. + Aus.</strong> para preenchimento rápido em 1 clique.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 overflow-hidden max-h-[520px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-14 font-bold text-xs">Jogo</TableHead>
                          <TableHead className="font-bold text-xs">Dezenas Geradas</TableHead>
                          <TableHead className="text-center font-bold text-xs">Acertos</TableHead>
                          <TableHead className="text-center font-bold text-xs">Soma</TableHead>
                          <TableHead className="text-center font-bold text-xs">Par/Ímp</TableHead>
                          <TableHead className="text-center font-bold text-xs">Mold.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.games.map((game) => {
                          const isTopWinner = game.hits >= 14;
                          const isWinner = game.hits >= 11;
                          return (
                            <TableRow
                              key={game.index}
                              className={
                                isTopWinner
                                  ? "bg-amber-500/10 font-bold"
                                  : isWinner
                                    ? "bg-emerald-500/5"
                                    : undefined
                              }
                            >
                              <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                                J{String(game.index).padStart(2, "0")}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {game.numbers.map((number) => {
                                    const hit = selectedDraw?.numbers.includes(number);
                                    return (
                                      <span
                                        key={number}
                                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                                          hit
                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                                            : "bg-secondary/40 text-muted-foreground border border-transparent"
                                        }`}
                                      >
                                        {String(number).padStart(2, "0")}
                                      </span>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={`font-mono text-xs ${
                                    isTopWinner
                                      ? "bg-amber-500 text-black font-extrabold"
                                      : isWinner
                                        ? "bg-emerald-600 text-white font-bold"
                                        : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  {game.hits} pts
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">{game.sum}</TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {game.even}/{game.odd}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">{game.moldura}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição dos Acertos */}
            {canGenerate && (
              <Card className="glass-card border-border/60">
                <CardHeader className="py-3 px-5 border-b border-border/40">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-accent" />
                    Distribuição dos Acertos nos {generatedGames.length} Jogos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.hitDistribution)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([hits, count]) => {
                        const h = Number(hits);
                        const isPrize = h >= 11;
                        return (
                          <Badge
                            key={hits}
                            variant="outline"
                            className={`text-xs py-1 px-3 gap-1.5 ${
                              h >= 14
                                ? "border-amber-500/60 bg-amber-500/10 text-amber-300 font-bold"
                                : isPrize
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold"
                                  : "border-border/50 text-muted-foreground"
                            }`}
                          >
                            <span>{hits} acertos:</span>
                            <span className="font-mono font-bold">{count} jogo(s)</span>
                          </Badge>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </PlanGate>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
  color,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 bg-card/40 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border/50"
      }`}
    >
      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-black font-mono ${color || (highlight ? "text-primary" : "text-foreground")}`}>
        {value}
      </p>
    </div>
  );
}
