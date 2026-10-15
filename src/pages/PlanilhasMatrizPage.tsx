const LOTOFACIL_PRICE = 3.5; // aposta simples Lotofácil (Caixa)
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
  Calculator,
  ChevronDown,
  ChevronUp,
  Percent,
  TrendingUp,
  DollarSign,
  Info,
  ShieldCheck,
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
import { Slider } from "@/components/ui/slider";
import { formatDrawDate } from "@/lib/draw-date";

// Tabela de combinações brutas C(n, 15) para a Calculadora Combinatória Lotofácil
const COMBINATIONS_LOTOFACIL: Record<number, number> = {
  15: 1,
  16: 16,
  17: 136,
  18: 816,
  19: 3876,
  20: 15504,
  21: 54264,
  22: 170544,
  23: 490314, // Número emblemático da aba CALC COMB
  24: 1307504,
  25: 3268760,
};

// Estimativa de prêmios oficiais da Lotofácil da Caixa
const PRIZE_ESTIMATES: Record<number, number> = {
  11: 7,       // Fixo R$ 7,00
  12: 14,      // Fixo R$ 14,00
  13: 35,      // Fixo R$ 35,00
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
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDezenas, setCalcDezenas] = useState(21);

  const matrixData = useMemo(() => computeMatrixAnalysis(draws, config.numbers), [draws, config.numbers]);
  const rankedNumbers = useMemo(() => matrixData.map((row) => row.number), [matrixData]);
  const preset = LOTOFACIL_WORKSHEET_PRESETS.find((item) => item.id === presetId) ?? LOTOFACIL_WORKSHEET_PRESETS[0];
  const inputSize = getPresetInputSize(preset);

  // Mapeamento de status estatístico por dezena usando o motor analítico de Radar
  const radarMap = useMemo(() => {
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

  // Médias estatísticas de filtro de volante dos jogos gerados
  const gameAverages = useMemo(() => {
    if (analysis.games.length === 0) return null;
    const total = analysis.games.length;
    const avgSum = Math.round(analysis.games.reduce((acc, g) => acc + g.sum, 0) / total);
    const avgEven = (analysis.games.reduce((acc, g) => acc + g.even, 0) / total).toFixed(1);
    const avgOdd = (analysis.games.reduce((acc, g) => acc + g.odd, 0) / total).toFixed(1);
    const avgPrimes = (analysis.games.reduce((acc, g) => acc + g.primes, 0) / total).toFixed(1);
    const avgMoldura = (analysis.games.reduce((acc, g) => acc + g.moldura, 0) / total).toFixed(1);
    const avgRepeated = (analysis.games.reduce((acc, g) => acc + g.repeatedFromPrevious, 0) / total).toFixed(1);
    return { avgSum, avgEven, avgOdd, avgPrimes, avgMoldura, avgRepeated };
  }, [analysis.games]);

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

  // Conferência de cada jogo contra TODOS os concursos salvos (mesma regra do concurso a concurso)
  const [checkAll, setCheckAll] = useState(false);
  const allDrawsCheck = useMemo(() => {
    if (!checkAll || !canGenerate || draws.length === 0) return null;
    const toMask = (nums: number[]) => nums.reduce((m, n) => m | (1 << n), 0);
    const popcount = (x: number) => {
      let c = 0;
      while (x) { x &= x - 1; c++; }
      return c;
    };
    const drawMasks = draws.map((d) => toMask(d.numbers));
    const totals: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
    let bestHits = 0;
    let overlapSum = 0;
    const rows = generatedGames.map((game, i) => {
      const gm = toMask(game);
      const counts: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
      const fifteen: number[] = [];
      drawMasks.forEach((dm, di) => {
        const h = popcount(gm & dm);
        overlapSum += h;
        if (h > bestHits) bestHits = h;
        if (h >= 11) {
          counts[h]++;
          totals[h]++;
          if (h === 15) fifteen.push(draws[di].concurso);
        }
      });
      return { index: i + 1, numbers: game, counts, fifteen };
    });
    let prizes = 0;
    for (const h of [11, 12, 13, 14, 15]) prizes += totals[h] * (PRIZE_ESTIMATES[h] || 0);
    const cost = generatedGames.length * draws.length * LOTOFACIL_PRICE;
    const avgOverlap = (overlapSum / (generatedGames.length * draws.length)).toFixed(1);
    return { rows, totals, prizes, cost, drawCount: draws.length, bestHits, avgOverlap, net: prizes - cost };
  }, [checkAll, canGenerate, draws, generatedGames]);

  // Identificação de fixas / pool para modelos híbridos
  const fixedCount = preset.fixedCount || 0;
  const eliminatedCount = preset.eliminatedCount || 0;

  // Atalhos de Seleção
  const autoSelect = () => {
    const numbers = selectTopLotofacilNumbers(rankedNumbers, inputSize);
    setSelectedNumbers(numbers);
  };

  const selectRadarHot = () => {
    if (farol && farol.length > 0) {
      const sorted = [...farol].sort((a, b) => b.titanScore - a.titanScore);
      const topNumbers = sorted.slice(0, inputSize).map((s) => s.number).sort((a, b) => a - b);
      setSelectedNumbers(topNumbers);
      toast.success(`${topNumbers.length} dezenas de maior força estatística selecionadas.`);
    } else {
      autoSelect();
    }
  };

  const selectGoldenRatio = () => {
    if (!latestDraw) return autoSelect();
    const repeatedPool = [...latestDraw.numbers];
    const absentPool = [...absentFromLatest];

    repeatedPool.sort((a, b) => (radarMap.get(b)?.delay ?? 0) - (radarMap.get(a)?.delay ?? 0));
    absentPool.sort((a, b) => (radarMap.get(b)?.freq ?? 0) - (radarMap.get(a)?.freq ?? 0));

    const targetRepeated = Math.min(9, inputSize - 1);
    const targetAbsent = inputSize - targetRepeated;

    const chosen = [
      ...repeatedPool.slice(0, targetRepeated),
      ...absentPool.slice(0, targetAbsent),
    ].sort((a, b) => a - b);

    setSelectedNumbers(chosen);
    toast.success(`Selecionadas ${targetRepeated} repetidas + ${targetAbsent} ausentes (Padrão Ouro).`);
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
    const header = `=== TITAN LOTERIAS — MATRIZ ${preset.sheetName} ===\n` +
      `Modelo: ${preset.label} (${preset.gameCount} jogos)\n` +
      `Custo total: R$ ${(preset.gameCount * LOTOFACIL_PRICE).toFixed(2)}\n\n`;

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
      `Jogos: ${preset.gameCount} | Custo: R$ ${(preset.gameCount * LOTOFACIL_PRICE).toFixed(2)}\n\n`;

    const lines = generatedGames.map((game, i) => {
      const formatted = game.map((n) => String(n).padStart(2, "0")).join(" ");
      return `J${String(i + 1).padStart(2, "0")}: ${formatted}`;
    }).join("\n");

    const blob = new Blob([header + lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `titan-matriz-${preset.id}-${Date.now()}.txt`;
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
        strategy: `Matriz Titan: ${preset.label}`,
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
          title="Matrizes Titan"
          description="Motor exclusivo de desdobramentos combinatórios para Lotofácil"
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
                  As <strong>Matrizes Titan (21x50, 19x5, 17x8, 13x6, etc.)</strong> foram calibradas especificamente para o universo de 25 dezenas com sorteios de 15 números da Lotofácil.
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
        <PageHeader title="Matrizes Titan" description="Geração e conferência em formato de matriz" icon={FileSpreadsheet} />
        <LotteryContextBanner />
        <EmptyState description="Carregando sorteios da Lotofácil para alimentar as matrizes combinatórias..." />
      </div>
    );
  }

  // Cálculos da Calculadora Combinatória
  const combRawCount = COMBINATIONS_LOTOFACIL[calcDezenas] || 1;
  const combRawCost = combRawCount * LOTOFACIL_PRICE;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matrizes Titan — Lotofácil"
        description="Desdobramentos estratégicos de alta cobertura, matrizes combinatórias e conferência financeira em tempo real."
        icon={FileSpreadsheet}
        badge="Lotofácil VIP"
      />
      <LotteryContextBanner />
      <ComplianceDisclaimer />

      {/* --- RADAR DE DEZENAS (CONTEXTO DO ÚLTIMO SORTEIO) --- */}
      {latestDraw && (
        <Card className="glass-card border-primary/20 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-primary/10 bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Radar de Dezenas — Concurso #{latestDraw.concurso} ({formatDrawDate(latestDraw.date)})
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

      {/* --- CALCULADORA COMBINATÓRIA INTERATIVA (INSPIRADA NA ABA CALC COMB) --- */}
      <Card className="glass-card border-border/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCalculator(!showCalculator)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                Calculadora Combinatória Lotofácil
                <Badge variant="outline" className="text-[9px] font-mono">C(n, 15)</Badge>
              </span>
              <p className="text-[11px] text-muted-foreground">
                Compare o custo de jogar fechado na Caixa vs a economia das Matrizes Titan
              </p>
            </div>
          </div>
          {showCalculator ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showCalculator && (
          <CardContent className="p-5 border-t border-border/40 bg-secondary/5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Quantas dezenas você quer cercar?</span>
                <span className="text-base font-black text-primary font-mono">{calcDezenas} Dezenas</span>
              </div>
              <Slider
                value={[calcDezenas]}
                min={16}
                max={24}
                step={1}
                onValueChange={(val) => setCalcDezenas(val[0])}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>16 dezenas</span>
                <span>20 dezenas</span>
                <span>24 dezenas</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Combinações Totais 100% Fechadas</p>
                <p className="mt-1 text-xl font-black font-mono text-foreground">{combRawCount.toLocaleString("pt-BR")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">jogos de 15 números</p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Custo Total Fechado na Caixa</p>
                <p className="mt-1 text-xl font-black font-mono text-rose-300">R$ {combRawCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-rose-400/80 mt-0.5">inviável para apostador comum</p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Economia com Matriz Titan
                </p>
                <p className="mt-1 text-xl font-black font-mono text-emerald-300">
                  {calcDezenas === 21 ? "99,91% de Economia" : ">95% de Economia"}
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5">
                  {calcDezenas === 21 ? "Jogue com apenas 50 jogos (R$ 175,00)" : "Fechamentos balanceados por fração do custo"}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <PlanGate feature="fechamentos" fallbackMessage="Matrizes Titan e conferidor avançado de desdobramentos">
        <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-6">
          
          {/* --- COLUNA ESQUERDA: CONFIGURAÇÃO & SELETOR DO RADAR --- */}
          <div className="space-y-6">
            <Card className="glass-card border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  1. Escolha a Matriz Estratégica
                </CardTitle>
                <CardDescription className="text-xs">
                  Modelos de alta performance calibrados matematicamente para a Lotofácil
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
                          <span className="font-bold">{item.label}</span> — {item.gameCount} jogos
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
                  <Metric label="Custo (R$)" value={`R$ ${(preset.gameCount * LOTOFACIL_PRICE).toFixed(2)}`} highlight />
                </div>

                {/* --- SELETOR DE DEZENAS VISUAL (ESTILO RADAR) --- */}
                <div className="rounded-xl border border-border/60 bg-card/30 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">2. Selecione as {inputSize} Dezenas</span>
                      {preset.mode === "fixed-plus-pool" && (
                        <p className="text-[11px] text-amber-400 font-semibold">
                          Primeiras {fixedCount} dezenas = FIXAS • Restantes = POOL
                        </p>
                      )}
                      {preset.mode === "gf" && (
                        <p className="text-[11px] text-amber-400 font-semibold">
                          Primeiras 3 = FIXAS • Seguintes 2 = ELIMINADAS
                        </p>
                      )}
                      {preset.mode === "base" && (
                        <p className="text-[11px] text-muted-foreground">
                          Cores baseadas na força do Radar estatístico
                        </p>
                      )}
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
                      onClick={selectRadarHot}
                      className="text-[10px] h-8 px-2 gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Flame className="w-3 h-3 text-emerald-400" />
                      Top Radar
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
                      const selectedIndex = selectedNumbers.indexOf(number);
                      const selected = selectedIndex !== -1;
                      const isRepeated = latestDrawSet.has(number);
                      const disabled = !selected && selectedNumbers.length >= inputSize;
                      const radarInfo = radarMap.get(number);
                      const status = radarInfo?.status || "warm";

                      // Tag especial de Fixa / Eliminada se o modelo exigir
                      let roleTag = isRepeated ? "Rep." : "Aus.";
                      if (selected) {
                        if (preset.mode === "fixed-plus-pool" && selectedIndex < fixedCount) {
                          roleTag = "FIXA";
                        } else if (preset.mode === "gf") {
                          if (selectedIndex < 3) roleTag = "FIXA";
                          else if (selectedIndex < 5) roleTag = "ELIM.";
                        }
                      }

                      // Borda baseada no Radar
                      const radarBorder =
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
                              ? roleTag === "ELIM."
                                ? "bg-rose-600 text-white border-rose-600 shadow-md scale-105 z-10"
                                : roleTag === "FIXA"
                                  ? "bg-amber-500 text-black border-amber-500 shadow-md font-extrabold scale-105 z-10"
                                  : "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105 z-10"
                              : disabled
                                ? "bg-muted/10 text-muted-foreground/30 border-transparent cursor-not-allowed opacity-40"
                                : `bg-background/50 hover:bg-background/80 ${radarBorder} hover:scale-102`
                          }`}
                        >
                          <span className="text-sm font-black">{String(number).padStart(2, "0")}</span>
                          <span className="text-[9px] font-sans opacity-85 font-semibold">
                            {roleTag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legenda do Radar */}
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
                  <Button
                    variant={checkAll ? "default" : "outline"}
                    size="sm"
                    className="w-full h-9 text-xs gap-1.5"
                    disabled={!canGenerate}
                    onClick={() => setCheckAll((v) => !v)}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    {checkAll ? "Ocultar conferência em todos os concursos" : `Conferir em todos os ${draws.length} concursos`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* --- COLUNA DIREITA: JOGOS GERADOS, MÉDIAS DE VOLANTE & CONFERIDOR --- */}
          <div className="space-y-6">
            <Card className="glass-card border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Conferidor & Jogos da Matriz
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
                  <Metric label="Melhor Acerto" value={canGenerate ? `${allDrawsCheck ? allDrawsCheck.bestHits : analysis.bestHits}/15` : "-"} highlight />
                  <Metric label="Concurso Alvo" value={allDrawsCheck ? `Todos (${allDrawsCheck.drawCount})` : selectedDraw?.concurso ?? "-"} />
                  <Metric label="Custo Fechamento" value={`R$ ${(allDrawsCheck ? allDrawsCheck.cost : analysis.totalCost).toFixed(2)}`} />
                  <Metric
                    label="Retorno Estimado"
                    value={canGenerate ? `R$ ${(allDrawsCheck ? allDrawsCheck.prizes : financialSummary.totalPrizesValue).toFixed(2)}` : "-"}
                    color={(allDrawsCheck ? allDrawsCheck.net > 0 : financialSummary.isProfitable) ? "text-emerald-400" : undefined}
                  />
                </div>

                {/* Médias Estatísticas dos Volantes Gerados (Equilíbrio de Filtros da Planilha) */}
                {gameAverages && (
                  <div className="rounded-xl border border-border/50 bg-secondary/10 p-3 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-primary" /> Conformidade dos Volantes Gerados:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs pt-1">
                      <div className="bg-background/40 p-1.5 rounded-lg border border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase">Média Soma</p>
                        <p className="font-mono font-bold text-foreground">{gameAverages.avgSum}</p>
                      </div>
                      <div className="bg-background/40 p-1.5 rounded-lg border border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase">Par / Ímpar</p>
                        <p className="font-mono font-bold text-foreground">{gameAverages.avgEven} / {gameAverages.avgOdd}</p>
                      </div>
                      <div className="bg-background/40 p-1.5 rounded-lg border border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase">Média Moldura</p>
                        <p className="font-mono font-bold text-foreground">{gameAverages.avgMoldura}</p>
                      </div>
                      <div className="bg-background/40 p-1.5 rounded-lg border border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase">Média Primos</p>
                        <p className="font-mono font-bold text-foreground">{gameAverages.avgPrimes}</p>
                      </div>
                      <div className="bg-background/40 p-1.5 rounded-lg border border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase">{allDrawsCheck ? "Média Acertos (todos)" : "Média Repetidas"}</p>
                        <p className="font-mono font-bold text-foreground">{allDrawsCheck ? allDrawsCheck.avgOverlap : gameAverages.avgRepeated}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo Financeiro da Premiação da Simulação */}
                {canGenerate && (() => {
                  const fin = allDrawsCheck
                    ? { prizeCounts: allDrawsCheck.totals, netResult: allDrawsCheck.net, isProfitable: allDrawsCheck.net > 0 }
                    : financialSummary;
                  return (
                  <div className="rounded-xl border border-border/50 bg-secondary/15 p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Resultado Financeiro da Simulação{allDrawsCheck ? ` — todos os ${allDrawsCheck.drawCount} concursos` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-black font-mono ${
                            fin.isProfitable ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {fin.netResult >= 0 ? "+" : ""}
                          R$ {fin.netResult.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({fin.isProfitable ? "Lucro Líquido" : "Saldo"})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {fin.prizeCounts[11] > 0 && (
                        <Badge variant="outline" className="text-xs bg-background/50">
                          {fin.prizeCounts[11]}x 11 pts (R$ {(fin.prizeCounts[11] * 7).toFixed(2)})
                        </Badge>
                      )}
                      {fin.prizeCounts[12] > 0 && (
                        <Badge variant="outline" className="text-xs bg-background/50">
                          {fin.prizeCounts[12]}x 12 pts (R$ {(fin.prizeCounts[12] * 14).toFixed(2)})
                        </Badge>
                      )}
                      {fin.prizeCounts[13] > 0 && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          {fin.prizeCounts[13]}x 13 pts (R$ {(fin.prizeCounts[13] * 35).toFixed(2)})
                        </Badge>
                      )}
                      {fin.prizeCounts[14] > 0 && (
                        <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold">
                          {fin.prizeCounts[14]}x 14 PONTOS! 🏆
                        </Badge>
                      )}
                      {fin.prizeCounts[15] > 0 && (
                        <Badge className="text-xs bg-emerald-500 text-white font-extrabold animate-pulse">
                          {fin.prizeCounts[15]}x 15 PONTOS MÁXIMOS! 🎉
                        </Badge>
                      )}
                    </div>
                  </div>
                );
                })()}

                {/* Conferência em todos os concursos */}
                {allDrawsCheck && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Conferência em todos os {allDrawsCheck.drawCount} concursos salvos
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        Prêmios est. R$ {allDrawsCheck.prizes.toFixed(2)} · Custo R$ {allDrawsCheck.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {[11, 12, 13, 14, 15].map((h) => (
                        <div key={h} className="bg-background/40 p-1.5 rounded-lg border border-border/40">
                          <p className="text-[9px] text-muted-foreground uppercase">{h} pts</p>
                          <p className="font-mono font-bold text-foreground">{allDrawsCheck.totals[h]}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-border/50 overflow-x-auto max-h-[320px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="text-xs font-bold">Jogo</TableHead>
                            {[11, 12, 13, 14, 15].map((h) => (
                              <TableHead key={h} className="text-center text-xs font-bold">{h}</TableHead>
                            ))}
                            <TableHead className="text-xs font-bold">15 pts em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allDrawsCheck.rows.map((r) => (
                            <TableRow key={r.index} className={r.counts[15] > 0 ? "bg-emerald-500/10 font-bold" : undefined}>
                              <TableCell className="font-mono text-xs font-bold text-muted-foreground">J{String(r.index).padStart(2, "0")}</TableCell>
                              {[11, 12, 13, 14, 15].map((h) => (
                                <TableCell key={h} className="text-center font-mono text-xs">{r.counts[h]}</TableCell>
                              ))}
                              <TableCell className="font-mono text-xs">
                                {r.fifteen.length ? r.fifteen.map((c) => `#${c}`).join(", ") : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Conferência retroativa: mostra quantas vezes cada jogo teria acertado no passado. Não indica chance de sair no futuro.
                    </p>
                  </div>
                )}

                {/* Tabela de Jogos */}
                {!canGenerate ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground space-y-3">
                    <Target className="w-10 h-10 mx-auto text-primary/40 animate-pulse" />
                    <div>
                      <p className="font-semibold text-foreground text-base">Selecione {inputSize} dezenas para gerar a matriz</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Clique em <strong>Top Radar</strong> ou <strong>9 Rep. + Aus.</strong> para preenchimento rápido em 1 clique.
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
