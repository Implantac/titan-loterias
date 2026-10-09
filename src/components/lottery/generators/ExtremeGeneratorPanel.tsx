import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberStats } from "@/engine/stats/statistics";
import { LotteryConfig, DrawResult } from "@/data/lotteries";
import {
  runExtremePipeline,
  getDefaultExtremeConfig,
  ExtremeConfig,
  ExtremeResult,
  ExtremeBet,
} from "@/engine/extreme-generator";
import { exportToPdf } from "@/engine/pdf-export";
import { HistoricalValidationBadge } from "@/components/lottery/HistoricalValidationBadge";
import { GameAnalysisBlock } from "@/components/lottery/analysis/GameAnalysisBlock";
import { ExtremeComparisonPanel } from "@/components/lottery/generators/ExtremeComparisonPanel";
import { GeneratorFiltersPanel } from "@/components/lottery/generators/GeneratorFiltersPanel";
import { GenerationFilters, DEFAULT_FILTERS } from "@/engine/generation-filters";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, Loader2, Copy, Check, ChevronDown, ChevronUp,
  Award, Download, Sliders, Flame, Snowflake, Minus,
  Filter, BarChart3, Zap, Target, AlertTriangle, ShieldCheck,
  History, TrendingUp, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface Props {
  stats: NumberStats[];
  config: LotteryConfig;
  draws: DrawResult[];
  onSaveBet?: (numbers: number[], strategy?: string, score?: number, grade?: string) => void;
}

const GRADE_COLORS: Record<string, string> = {
  S: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  A: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  B: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  C: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  D: "text-red-400 bg-red-400/10 border-red-400/30",
  F: "text-red-600 bg-red-600/10 border-red-600/30",
};

export function ExtremeGeneratorPanel({ stats, config, draws, onSaveBet }: Props) {
  const defaults = useMemo(() => getDefaultExtremeConfig(config, draws), [config, draws]);
  const [ecfg, setEcfg] = useState<ExtremeConfig>(defaults);
  const [result, setResult] = useState<ExtremeResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [expandedBet, setExpandedBet] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<number>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [userFilters, setUserFilters] = useState<GenerationFilters>({ ...DEFAULT_FILTERS });

  // Reset config when lottery changes
  useMemo(() => {
    setEcfg(defaults);
    setResult(null);
  }, [config.id]);

  const handleGenerate = () => {
    setGenerating(true);
    setSelectedForCompare(new Set());
    setShowComparison(false);
    setTimeout(() => {
      const res = runExtremePipeline(stats, config, draws, ecfg);
      setResult(res);
      setGenerating(false);
      toast.success(`Pipeline completo: ${res.bets.length} jogos em ${res.elapsedMs}ms`);
    }, 50);
  };

  const copyBet = (bet: number[], index: number) => {
    navigator.clipboard.writeText(bet.join(" - "));
    setCopied(index);
    toast.success("Aposta copiada!");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAllBets = () => {
    if (!result) return;
    const text = result.bets.map(b =>
      `#${b.rank} [${b.quality.grade}] ${b.numbers.join(" - ")} (Score: ${b.score})`
    ).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Todas as apostas copiadas!");
  };

  const handleExport = () => {
    if (!result) return;
    const avgCombined = averages ? averages.avgCombined : 0;
    exportToPdf({
      title: `Gerador Extremo - ${config.name}`,
      subtitle: `Top ${result.bets.length} jogos • Nota média: ${avgCombined} • Pipeline ${result.elapsedMs}ms`,
      config,
      bets: result.bets.map(b => {
        const combined = Math.round(b.score * 0.7 + b.backtest.winRate * 0.2 + b.backtest.consistency * 0.1);
        return {
          numbers: b.numbers,
          strategy: `WR:${b.backtest.winRate}% C:${b.backtest.consistency}`,
          score: combined,
          grade: b.quality.grade,
        };
      }),
      type: "apostas",
    });
  };

  const handleSave = (bet: ExtremeBet) => {
    onSaveBet?.(bet.numbers, "Gerador Extremo", bet.score, bet.quality.grade);
    toast.success("Aposta salva!");
  };

  const updateConfig = (key: keyof ExtremeConfig, value: any) => {
    setEcfg(prev => ({ ...prev, [key]: value }));
  };

  const toggleCompare = (index: number) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const averages = useMemo(() => {
    if (!result || result.bets.length === 0) return null;
    const bets = result.bets;
    const avgScore = Math.round(bets.reduce((s, b) => s + b.score, 0) / bets.length);
    const avgWinRate = Math.round(bets.reduce((s, b) => s + b.backtest.winRate, 0) / bets.length);
    const avgConsistency = Math.round(bets.reduce((s, b) => s + b.backtest.consistency, 0) / bets.length);
    const avgCombined = Math.round(bets.reduce((s, b) => s + b.score * 0.7 + b.backtest.winRate * 0.2 + b.backtest.consistency * 0.1, 0) / bets.length);
    const avgHits = (bets.reduce((s, b) => s + b.backtest.avgHits, 0) / bets.length).toFixed(1);
    const bestGrade = bets[0]?.quality.grade || "-";
    return { avgScore, avgWinRate, avgConsistency, avgCombined, avgHits, bestGrade, total: bets.length };
  }, [result]);

  const isLF = config.id === "lotofacil";

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              🚀 Gerador Extremo — Pipeline de 8 Etapas
            </h3>
            <p className="text-xs text-muted-foreground">
              Gera milhares → Filtra agressivamente → Otimiza → Ranking final
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs gap-1"
        >
          <Sliders className="w-3 h-3" />
          {showConfig ? "Ocultar" : "Configurar"}
        </Button>
      </div>

      {/* Configuration panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 p-4 rounded-lg bg-secondary/30 border border-border">
              {/* Candidates */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Jogos a gerar: <span className="font-bold text-foreground">{ecfg.totalCandidates.toLocaleString()}</span>
                </label>
                <Slider
                  value={[ecfg.totalCandidates]}
                  onValueChange={([v]) => updateConfig("totalCandidates", v)}
                  min={5000}
                  max={100000}
                  step={5000}
                />
              </div>

              {/* Top N */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Top jogos finais: <span className="font-bold text-foreground">{ecfg.topN}</span>
                </label>
                <Slider
                  value={[ecfg.topN]}
                  onValueChange={([v]) => updateConfig("topN", v)}
                  min={10}
                  max={200}
                  step={10}
                />
              </div>

              {/* Parity */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Pares: <span className="font-bold text-foreground">{ecfg.parityRange[0]}–{ecfg.parityRange[1]}</span>
                </label>
                <Slider
                  value={ecfg.parityRange}
                  onValueChange={([a, b]) => updateConfig("parityRange", [a, b])}
                  min={0}
                  max={config.pick}
                  step={1}
                />
              </div>

              {/* Sum */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Soma: <span className="font-bold text-foreground">{ecfg.sumRange[0]}–{ecfg.sumRange[1]}</span>
                </label>
                <Slider
                  value={ecfg.sumRange}
                  onValueChange={([a, b]) => updateConfig("sumRange", [a, b])}
                  min={Math.round(ecfg.sumRange[0] * 0.7)}
                  max={Math.round(ecfg.sumRange[1] * 1.3)}
                  step={5}
                />
              </div>

              {/* Max Sequence */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Máx. sequência: <span className="font-bold text-foreground">{ecfg.maxSequenceRun}</span>
                </label>
                <Slider
                  value={[ecfg.maxSequenceRun]}
                  onValueChange={([v]) => updateConfig("maxSequenceRun", v)}
                  min={2}
                  max={6}
                  step={1}
                />
              </div>

              {/* Repeat from last */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Repetição anterior: <span className="font-bold text-foreground">{ecfg.repeatRange[0]}–{ecfg.repeatRange[1]}</span>
                </label>
                <Slider
                  value={ecfg.repeatRange}
                  onValueChange={([a, b]) => updateConfig("repeatRange", [a, b])}
                  min={0}
                  max={config.pick}
                  step={1}
                />
              </div>

              {isLF && (
                <>
                  {/* Frame range */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Moldura: <span className="font-bold text-foreground">{ecfg.frameRange[0]}–{ecfg.frameRange[1]}</span>
                    </label>
                    <Slider
                      value={ecfg.frameRange}
                      onValueChange={([a, b]) => updateConfig("frameRange", [a, b])}
                      min={5}
                      max={15}
                      step={1}
                    />
                  </div>

                  {/* Row per line */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Mín/Máx por linha: <span className="font-bold text-foreground">{ecfg.minPerRow}–{ecfg.maxPerRow}</span>
                    </label>
                    <Slider
                      value={[ecfg.minPerRow, ecfg.maxPerRow]}
                      onValueChange={([a, b]) => { updateConfig("minPerRow", a); updateConfig("maxPerRow", b); }}
                      min={0}
                      max={5}
                      step={1}
                    />
                  </div>
                </>
              )}

              {/* Frequency mix */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Mix: <Flame className="w-3 h-3 inline text-red-400" /> {ecfg.hotCount} / <Minus className="w-3 h-3 inline text-blue-400" /> {ecfg.mediumCount} / <Snowflake className="w-3 h-3 inline text-cyan-400" /> {ecfg.coldCount}
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={ecfg.hotCount}
              aria-label="Quantidade de dezenas quentes"
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      updateConfig("hotCount", v);
                      updateConfig("mediumCount", config.pick - v - ecfg.coldCount);
                    }}
                    className="w-12 text-xs text-center rounded border border-border bg-background px-1 py-0.5"
                    min={0}
                    max={config.pick}
                  />
                  <input
                    type="number"
                    value={ecfg.mediumCount}
              aria-label="Quantidade de dezenas mornas"
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      updateConfig("mediumCount", v);
                    }}
                    className="w-12 text-xs text-center rounded border border-border bg-background px-1 py-0.5"
                    min={0}
                    max={config.pick}
                  />
                  <input
                    type="number"
                    value={ecfg.coldCount}
              aria-label="Quantidade de dezenas frias"
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      updateConfig("coldCount", v);
                      updateConfig("mediumCount", config.pick - ecfg.hotCount - v);
                    }}
                    className="w-12 text-xs text-center rounded border border-border bg-background px-1 py-0.5"
                    min={0}
                    max={config.pick}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate button */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Button
          onClick={handleGenerate}
          disabled={generating || draws.length === 0}
          className="gap-1.5 text-xs"
          size="sm"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Executar Pipeline Extremo
        </Button>
        {result && (
          <>
            <Button size="sm" variant="outline" onClick={copyAllBets} className="text-xs gap-1">
              <Copy className="w-3 h-3" /> Copiar todos
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="text-xs gap-1">
              <Download className="w-3 h-3" /> PDF
            </Button>
            {selectedForCompare.size >= 2 && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowComparison(true)}
                className="text-xs gap-1"
              >
                <BarChart3 className="w-3 h-3" /> Comparar {selectedForCompare.size} jogos
              </Button>
            )}
          </>
        )}
      </div>

      {/* Summary Panel */}
      {averages && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Resumo — {averages.total} jogos gerados</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {[
              { label: "Nota Combinada", value: averages.avgCombined, color: averages.avgCombined >= 60 ? "text-emerald-500" : averages.avgCombined >= 35 ? "text-yellow-500" : "text-red-500" },
              { label: "Score Médio", value: averages.avgScore, color: "text-foreground" },
              { label: "Win Rate Médio", value: `${averages.avgWinRate}%`, color: "text-primary" },
              { label: "Consistência", value: averages.avgConsistency, color: "text-foreground" },
              { label: "Média Acertos", value: averages.avgHits, color: "text-foreground" },
              { label: "Melhor Nota", value: averages.bestGrade, color: "text-yellow-400" },
            ].map((item, idx) => (
              <div key={idx} className="p-2 rounded bg-background border border-border">
                <div className="text-[9px] text-muted-foreground">{item.label}</div>
                <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Panel */}
      {showComparison && result && selectedForCompare.size >= 2 && (
        <div className="mb-4">
          <ExtremeComparisonPanel
            bets={result.bets.filter((_, i) => selectedForCompare.has(i))}
            stats={stats}
            config={config}
            onClose={() => setShowComparison(false)}
          />
        </div>
      )}

      {/* User Filters */}
      <div className="mb-4">
        <GeneratorFiltersPanel
          config={config}
          draws={draws}
          stats={stats}
          filters={userFilters}
          onFiltersChange={setUserFilters}
        />
      </div>

      {/* Pipeline visualization */}
      {result && (
        <div className="mb-4">
          <div className="flex items-center gap-1 flex-wrap text-[10px]">
            {result.pipeline.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`px-2 py-1 rounded border ${
                  step.fallback 
                    ? "bg-yellow-500/10 border-yellow-500/30" 
                    : "bg-secondary/50 border-border"
                }`}>
                  <div className="font-bold text-foreground flex items-center gap-1">
                    {step.fallback && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                    {!step.fallback && step.filtered > 0 && <ShieldCheck className="w-3 h-3 text-primary" />}
                    {step.name}
                  </div>
                  <div className="text-muted-foreground">
                    {step.inputCount.toLocaleString()} → {step.outputCount.toLocaleString()}
                    {step.filtered > 0 && !step.fallback && (
                      <span className="text-destructive ml-1">(-{step.filtered.toLocaleString()})</span>
                    )}
                    {step.fallback && (
                      <span className="text-yellow-500 ml-1 font-semibold">fallback</span>
                    )}
                  </div>
                </div>
                {i < result.pipeline.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </div>
            ))}
            <div className="ml-2 px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-bold">
              ⏱ {result.elapsedMs}ms
            </div>
          </div>
          {result.pipeline.some(s => s.fallback) && (
            <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-[10px] text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Alguns filtros foram relaxados automaticamente (fallback) para garantir resultados. 
                Ajuste os parâmetros em "Configurar" para refinar.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && result.bets.length > 0 && (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {result.bets.map((bet, i) => {
            const isExpanded = expandedBet === i;
            return (
              <motion.div
                key={`${i}-${bet.numbers.join(",")}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className={`rounded-lg bg-secondary/30 border overflow-hidden ${
                  selectedForCompare.has(i) ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                }`}
              >
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedBet(isExpanded ? null : i)}
                >
                  {/* Compare checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedForCompare.has(i)}
                    aria-label={`Selecionar aposta ${i + 1} para comparar`}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleCompare(i)}
                    className="w-3.5 h-3.5 rounded border-border accent-primary flex-shrink-0 cursor-pointer"
                    title="Selecionar para comparação"
                  />

                  {/* Rank */}
                  <div className="w-8 flex-shrink-0">
                    {bet.rank <= 3 ? (
                      <Award className={`w-4 h-4 ${
                        bet.rank === 1 ? "text-yellow-400" :
                        bet.rank === 2 ? "text-gray-400" : "text-amber-600"
                      }`} />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">#{bet.rank}</span>
                    )}
                  </div>

                  {/* Grade */}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${GRADE_COLORS[bet.quality.grade]}`}>
                    {bet.quality.grade}
                  </span>

                  {/* Numbers */}
                  <div className="flex flex-wrap gap-1 flex-1">
                    {bet.numbers.map(n => {
                      const stat = stats.find(s => s.number === n);
                      const ballClass =
                        stat?.status === "hot" ? "lottery-ball-hot" :
                        stat?.status === "cold" ? "lottery-ball-cold" : "";
                      return (
                        <span key={n} className={`lottery-ball text-[10px] w-7 h-7 ${ballClass}`}>
                          {String(n).padStart(2, "0")}
                        </span>
                      );
                    })}
                  </div>

                  {/* Score + Combined */}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         {(() => {
                           const combined = Math.round(bet.score * 0.7 + bet.backtest.winRate * 0.2 + bet.backtest.consistency * 0.1);
                           const colorClass = combined >= 60 ? "text-emerald-500" : combined >= 35 ? "text-yellow-500" : "text-red-500";
                           const bgClass = combined >= 60 ? "bg-emerald-500/10 border-emerald-500/30" : combined >= 35 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-red-500/10 border-red-500/30";
                           return (
                             <div className={`text-right flex-shrink-0 min-w-[50px] sm:min-w-[60px] cursor-help rounded-md border px-1.5 py-0.5 sm:px-2 sm:py-1 ${bgClass}`}>
                               <div className={`text-xs font-bold ${colorClass}`}>
                                 {combined}
                               </div>
                               <div className="text-[9px] text-muted-foreground">combinada</div>
                               <div className="text-[9px] text-muted-foreground/60">{bet.score} + bt</div>
                             </div>
                           );
                         })()}
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        <p className="font-semibold mb-1">Nota Combinada</p>
                        <p>Score×0.7 + WinRate×0.2 + Consistência×0.1</p>
                        <p className="mt-1 text-muted-foreground">
                          {bet.score}×0.7 + {bet.backtest.winRate}×0.2 + {bet.backtest.consistency}×0.1 = {Math.round(bet.score * 0.7 + bet.backtest.winRate * 0.2 + bet.backtest.consistency * 0.1)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Actions */}
                  <button
                    onClick={(e) => { e.stopPropagation(); copyBet(bet.numbers, i); }}
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                  >
                    {copied === i ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {onSaveBet && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSave(bet); }}
                      className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </div>

                {/* Validation badge */}
                <div className="px-3 pb-1 space-y-1">
                  <HistoricalValidationBadge bet={bet.numbers} draws={draws} config={config} />
                  <GameAnalysisBlock numbers={bet.numbers} stats={stats} config={config} draws={draws} />
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-3 space-y-3">
                        {/* Stats grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                          <div className="p-2 rounded bg-background border border-border">
                            <div className="text-[10px] text-muted-foreground">Paridade</div>
                            <div className="text-xs font-bold text-foreground">{bet.parityLabel}</div>
                          </div>
                          <div className="p-2 rounded bg-background border border-border">
                            <div className="text-[10px] text-muted-foreground">Soma</div>
                            <div className="text-xs font-bold text-foreground">{bet.sum}</div>
                          </div>
                          {isLF && (
                            <div className="p-2 rounded bg-background border border-border">
                              <div className="text-[10px] text-muted-foreground">Mold/Centro</div>
                              <div className="text-xs font-bold text-foreground">{bet.frameCenter}</div>
                            </div>
                          )}
                          <div className="p-2 rounded bg-background border border-border">
                            <div className="text-[10px] text-muted-foreground">Linhas</div>
                            <div className="text-xs font-bold text-foreground">{bet.rowDist}</div>
                          </div>
                          <div className="p-2 rounded bg-background border border-border">
                            <div className="text-[10px] text-muted-foreground">Repet. Ant.</div>
                            <div className="text-xs font-bold text-foreground">{bet.repeatFromLast}</div>
                          </div>
                          <div className="p-2 rounded bg-background border border-border">
                            <div className="text-[10px] text-muted-foreground">
                              <Flame className="w-3 h-3 inline text-red-400" /> / <Snowflake className="w-3 h-3 inline text-cyan-400" />
                            </div>
                            <div className="text-xs font-bold text-foreground">{bet.hotNumbers}/{bet.coldNumbers}</div>
                          </div>
                        </div>

                        {/* Backtesting Results */}
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-1.5 mb-2">
                            <History className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[11px] font-bold text-foreground">
                              Backtesting — Últimos {bet.backtest.testedDraws} concursos
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                            <div className="p-1.5 rounded bg-background border border-border">
                              <div className="text-[9px] text-muted-foreground">Média Acertos</div>
                              <div className="text-xs font-bold text-foreground">{bet.backtest.avgHits}</div>
                            </div>
                            <div className="p-1.5 rounded bg-background border border-border">
                              <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5"><Trophy className="w-2.5 h-2.5" /> Melhor</div>
                              <div className="text-xs font-bold text-primary">{bet.backtest.bestHit}</div>
                            </div>
                            <div className="p-1.5 rounded bg-background border border-border">
                              <div className="text-[9px] text-muted-foreground">Pior</div>
                              <div className="text-xs font-bold text-muted-foreground">{bet.backtest.worstHit}</div>
                            </div>
                            <div className="p-1.5 rounded bg-background border border-border">
                              <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" /> Win Rate</div>
                              <div className={`text-xs font-bold ${bet.backtest.winRate > 0 ? "text-primary" : "text-muted-foreground"}`}>{bet.backtest.winRate}%</div>
                            </div>
                            <div className="p-1.5 rounded bg-background border border-border">
                              <div className="text-[9px] text-muted-foreground">Consistência</div>
                              <div className="flex items-center justify-center gap-1">
                                <div className="w-8 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${bet.backtest.consistency >= 70 ? "bg-primary" : bet.backtest.consistency >= 40 ? "bg-yellow-500" : "bg-destructive"}`} style={{ width: `${bet.backtest.consistency}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-foreground">{bet.backtest.consistency}</span>
                              </div>
                            </div>
                          </div>
                          {/* Hit distribution bar */}
                          <div className="mt-2">
                            <div className="text-[9px] text-muted-foreground mb-1">Distribuição de acertos:</div>
                            <div className="flex gap-px h-6">
                              {Object.entries(bet.backtest.hitDistribution)
                                .filter(([, count]) => count > 0)
                                .map(([hits, count]) => {
                                  const pct = (count / bet.backtest.testedDraws) * 100;
                                  return (
                                    <div key={hits} className="flex flex-col items-center flex-1 min-w-0" title={`${hits} acertos: ${count}x (${pct.toFixed(0)}%)`}>
                                      <div className="w-full bg-secondary rounded-t relative" style={{ height: `${Math.max(pct * 0.6, 2)}px` }}>
                                        <div className={`absolute inset-0 rounded-t ${Number(hits) >= bet.backtest.bestHit - 1 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                                      </div>
                                      <span className="text-[7px] text-muted-foreground mt-0.5">{hits}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>

                        {/* Quality dimensions */}
                        <div className="space-y-1.5">
                          {bet.quality.dimensions.map((dim, di) => (
                            <div key={di} className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-32 truncate">{dim.name}</span>
                              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    dim.score >= 70 ? "bg-primary" :
                                    dim.score >= 40 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${dim.score}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{dim.score}</span>
                            </div>
                          ))}
                        </div>

                        {/* Strengths & Warnings */}
                        {bet.quality.strengths.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {bet.quality.strengths.map((s, si) => (
                              <span key={si} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {bet.quality.warnings.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {bet.quality.warnings.map((w, wi) => (
                              <span key={wi} className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                ⚠ {w}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {!result && !generating && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p>Clique em "Executar Pipeline Extremo" para gerar apostas</p>
          <p className="text-[10px] mt-1">
            Pipeline: Geração Massiva → Filtros Matemáticos → Filtros Estatísticos → Filtros de Padrões → Ranking
          </p>
        </div>
      )}

      {generating && (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Executando pipeline de 8 etapas...</p>
          <p className="text-[10px]">Gerando {ecfg.totalCandidates.toLocaleString()} combinações e filtrando...</p>
        </div>
      )}
    </div>
  );
}
