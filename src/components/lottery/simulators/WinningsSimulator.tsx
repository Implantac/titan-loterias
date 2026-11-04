import { useState, useMemo } from "react";
import { DrawResult } from "@/data/lotteries";
import { DrawResultWithPrizes } from "@/hooks/useLotteryDraws";
import { useSavedBets } from "@/hooks/useSavedBets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import {
  Calculator, TrendingUp, History, Sparkles, Plus, X, Trophy,
  Coins, ChartLine, Bot, User as UserIcon, AlertTriangle, Landmark
} from "lucide-react";
import { CaixaPrizeRedemptionDialog } from "@/components/lottery/CaixaPrizeRedemptionDialog";

interface Props {
  lotteryId: string;
  pick: number;
  maxNumbers: number;
  draws: DrawResult[];
  drawsWithPrizes?: DrawResultWithPrizes[];
}

interface BetEntry {
  id: string;
  numbers: number[];
  source: "manual" | "ai" | "saved";
  label?: string;
}

interface SimResult {
  totalDraws: number;
  totalBets: number;
  totalCost: number;
  totalPrize: number;
  netProfit: number;
  roi: number;
  hitDistribution: Record<number, number>;
  prizeByTier: Record<number, { count: number; total: number; label: string }>;
  bestDraw: { concurso: number; date: string; hits: number; prize: number } | null;
  avgPrizePerDraw: number;
  hitRate: number; // chance of any prize per bet per draw
}

// Custo oficial da aposta simples (fonte única em betting-budget)
import { LOTTERY_BET_COST } from "@/engine/betting-budget";
const COST_PER_BET: Record<string, number> = LOTTERY_BET_COST;

const PRIZE_TABLE: Record<string, Record<number, { value: number; label: string }>> = {
  megasena: { 6: { value: 50000000, label: "Sena" }, 5: { value: 40000, label: "Quina" }, 4: { value: 800, label: "Quadra" } },
  lotofacil: {
    15: { value: 1500000, label: "15 pts" }, 14: { value: 2000, label: "14 pts" },
    13: { value: 35, label: "13 pts" }, 12: { value: 14, label: "12 pts" }, 11: { value: 7, label: "11 pts" },
  },
  quina: { 5: { value: 5000000, label: "Quina" }, 4: { value: 6000, label: "Quadra" }, 3: { value: 150, label: "Terno" }, 2: { value: 5, label: "Duque" } },
  lotomania: {
    20: { value: 3000000, label: "20 pts" }, 19: { value: 50000, label: "19 pts" },
    18: { value: 2500, label: "18 pts" }, 17: { value: 200, label: "17 pts" },
    16: { value: 35, label: "16 pts" }, 15: { value: 6, label: "15 pts" }, 0: { value: 3000000, label: "0 pts" },
  },
  duplasena: { 6: { value: 1000000, label: "Sena" }, 5: { value: 5000, label: "Quina" }, 4: { value: 150, label: "Quadra" }, 3: { value: 6, label: "Terno" } },
  timemania: { 7: { value: 3000000, label: "7 pts" }, 6: { value: 25000, label: "6 pts" }, 5: { value: 100, label: "5 pts" }, 4: { value: 10, label: "4 pts" }, 3: { value: 3, label: "3 pts" } },
  diadesorte: { 7: { value: 500000, label: "7 pts" }, 6: { value: 2500, label: "6 pts" }, 5: { value: 25, label: "5 pts" }, 4: { value: 5, label: "4 pts" } },
  supersete: { 7: { value: 2000000, label: "7 col" }, 6: { value: 15000, label: "6 col" }, 5: { value: 1000, label: "5 col" }, 4: { value: 50, label: "4 col" }, 3: { value: 3, label: "3 col" } },
};

function getPrize(lotteryId: string, hits: number, realPrizes?: DrawResultWithPrizes["prizeTiers"]): { value: number; label: string } | null {
  // Try real prize from draw's prizeTiers if provided
  if (realPrizes && Array.isArray(realPrizes)) {
    const tier = (realPrizes as any[]).find((t: any) => Number(t.acertos ?? t.hits) === hits && Number(t.valor ?? t.value ?? 0) > 0);
    if (tier) return { value: Number(tier.valor ?? tier.value), label: `${hits} acertos` };
  }
  const table = PRIZE_TABLE[lotteryId];
  if (!table) return null;
  return table[hits] || null;
}

function matchHits(bet: number[], draw: number[], lotteryId: string): number {
  if (lotteryId === "supersete") {
    let h = 0;
    const len = Math.min(bet.length, draw.length);
    for (let i = 0; i < len; i++) if (bet[i] === draw[i]) h++;
    return h;
  }
  const set = new Set(draw);
  return bet.filter(n => set.has(n)).length;
}

function fmtBRL(v: number): string {
  return formatCurrency(v);
}

export function WinningsSimulator({ lotteryId, pick, maxNumbers, draws, drawsWithPrizes }: Props) {
  const { savedBets } = useSavedBets(lotteryId);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [futureDraws, setFutureDraws] = useState(52);
  const [historyWindow, setHistoryWindow] = useState(100);
  const [redemptionOpen, setRedemptionOpen] = useState(false);

  const drawsByConcurso = useMemo(() => {
    const map = new Map<number, DrawResultWithPrizes>();
    (drawsWithPrizes || []).forEach(d => map.set(d.concurso, d));
    return map;
  }, [drawsWithPrizes]);

  const addManual = () => {
    const nums = manualInput.split(/[\s,;-]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= maxNumbers);
    const unique = [...new Set(nums)].sort((a, b) => a - b);
    if (unique.length !== pick) {
      toast.error(`Informe exatamente ${pick} números entre 1 e ${maxNumbers}`);
      return;
    }
    setBets(prev => [...prev, { id: `m-${Date.now()}`, numbers: unique, source: "manual", label: "Manual" }]);
    setManualInput("");
    toast.success("Aposta adicionada");
  };

  const importSaved = () => {
    if (savedBets.length === 0) { toast.error("Nenhuma aposta salva nesta modalidade"); return; }
    const imported: BetEntry[] = savedBets
      .filter(b => b.numbers.length === pick)
      .map(b => ({
        id: `s-${b.id}`,
        numbers: b.numbers,
        source: (b.strategy && /ia|gerador|smart|ai|intelig|extrem|evol|profis|monte/i.test(b.strategy)) ? "ai" : "saved",
        label: b.strategy || b.label || "Salva",
      }));
    const newOnes = imported.filter(i => !bets.some(b => b.id === i.id));
    if (newOnes.length === 0) { toast.info("Todas as apostas salvas já foram importadas"); return; }
    setBets(prev => [...prev, ...newOnes]);
    toast.success(`${newOnes.length} aposta(s) importada(s)`);
  };

  const removeBet = (id: string) => setBets(prev => prev.filter(b => b.id !== id));
  const clearAll = () => setBets([]);

  const sim = useMemo<SimResult | null>(() => {
    if (bets.length === 0 || draws.length === 0) return null;
    const window = [...draws].sort((a, b) => b.concurso - a.concurso).slice(0, historyWindow);
    const cost = COST_PER_BET[lotteryId] ?? 3;
    const hitDist: Record<number, number> = {};
    const prizeByTier: Record<number, { count: number; total: number; label: string }> = {};
    let totalPrize = 0;
    let bestDraw: SimResult["bestDraw"] = null;
    let anyPrizeCount = 0;
    const totalEvents = bets.length * window.length;

    for (const draw of window) {
      const drawWithPrizes = drawsByConcurso.get(draw.concurso);
      let drawPrize = 0;
      let drawHits = 0;
      for (const bet of bets) {
        const hits = matchHits(bet.numbers, draw.numbers, lotteryId);
        hitDist[hits] = (hitDist[hits] || 0) + 1;
        const prize = getPrize(lotteryId, hits, drawWithPrizes?.prizeTiers as any);
        if (prize) {
          totalPrize += prize.value;
          drawPrize += prize.value;
          anyPrizeCount++;
          if (!prizeByTier[hits]) prizeByTier[hits] = { count: 0, total: 0, label: prize.label };
          prizeByTier[hits].count++;
          prizeByTier[hits].total += prize.value;
          if (hits > drawHits) drawHits = hits;
        }
      }
      if (drawPrize > 0 && (!bestDraw || drawPrize > bestDraw.prize)) {
        bestDraw = { concurso: draw.concurso, date: draw.date, hits: drawHits, prize: drawPrize };
      }
    }

    const totalCost = bets.length * window.length * cost;
    const netProfit = totalPrize - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      totalDraws: window.length,
      totalBets: bets.length,
      totalCost,
      totalPrize,
      netProfit,
      roi,
      hitDistribution: hitDist,
      prizeByTier,
      bestDraw,
      avgPrizePerDraw: totalPrize / window.length,
      hitRate: totalEvents > 0 ? (anyPrizeCount / totalEvents) * 100 : 0,
    };
  }, [bets, draws, lotteryId, historyWindow, drawsByConcurso]);

  // Future projection based on per-draw expected prize
  const projection = useMemo(() => {
    if (!sim) return null;
    const expectedPerDraw = sim.avgPrizePerDraw;
    const costPerDraw = sim.totalCost / sim.totalDraws;
    const projPrize = expectedPerDraw * futureDraws;
    const projCost = costPerDraw * futureDraws;
    const projNet = projPrize - projCost;
    // Confidence based on hits frequency and sample
    const confidence = Math.min(95, Math.max(20, Math.round(40 + sim.totalDraws / 5 + sim.hitRate / 2)));
    return {
      futureDraws,
      projPrize,
      projCost,
      projNet,
      breakEvenDraws: expectedPerDraw > costPerDraw ? Math.ceil(0) : null,
      confidence,
    };
  }, [sim, futureDraws]);

  const aiCount = bets.filter(b => b.source === "ai").length;
  const manualCount = bets.filter(b => b.source !== "ai").length;

  return (
    <div className="rounded-xl glass-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            Simulador de Ganhos
            <Badge variant="outline" className="text-[9px] h-4">NOVO</Badge>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Veja quanto teria ganho em sorteios passados e a projeção de ganhos futuros
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/30">
        <div className="flex gap-2">
          <Input
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder={`Cole ${pick} números separados por espaço, vírgula ou hífen`}
            className="text-xs h-9"
            onKeyDown={e => e.key === "Enter" && addManual()}
          />
          <Button size="sm" onClick={addManual} className="h-9">
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={importSaved} className="text-xs h-8">
            <Sparkles className="w-3 h-3 mr-1" /> Importar apostas salvas ({savedBets.length})
          </Button>
          {bets.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs h-8 text-destructive">
              <X className="w-3 h-3 mr-1" /> Limpar tudo
            </Button>
          )}
        </div>
        {bets.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
            <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {manualCount} usuário</span>
            <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-primary" /> {aiCount} IA</span>
            <span className="ml-auto">Total: <strong className="text-foreground">{bets.length}</strong></span>
          </div>
        )}
      </div>

      {/* Bet list */}
      <AnimatePresence>
        {bets.length > 0 && (
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {bets.map(bet => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 p-2 rounded-md bg-card border border-border/30 text-xs"
              >
                {bet.source === "ai" ? <Bot className="w-3 h-3 text-primary shrink-0" /> : <UserIcon className="w-3 h-3 text-muted-foreground shrink-0" />}
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{bet.label}</span>
                <span className="font-mono tracking-tight text-foreground flex-1 truncate">
                  {bet.numbers.map(n => String(n).padStart(2, "0")).join(" ")}
                </span>
                <button onClick={() => removeBet(bet.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {bets.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border/40 rounded-lg space-y-2">
          <Coins className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-xs text-muted-foreground">Adicione apostas manuais ou importe as geradas pela IA</p>
        </div>
      )}

      {/* Window controls */}
      {bets.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 p-3 rounded-lg border border-border/40">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><History className="w-3 h-3" /> Sorteios analisados</span>
              <span className="font-bold text-foreground">{Math.min(historyWindow, draws.length)}</span>
            </div>
            <Slider value={[historyWindow]} onValueChange={v => setHistoryWindow(v[0])} min={10} max={Math.min(500, draws.length)} step={10} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><ChartLine className="w-3 h-3" /> Sorteios futuros (projeção)</span>
              <span className="font-bold text-foreground">{futureDraws}</span>
            </div>
            <Slider value={[futureDraws]} onValueChange={v => setFutureDraws(v[0])} min={4} max={260} step={4} />
          </div>
        </div>
      )}

      {/* Results: PAST */}
      {sim && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" /> Resultado histórico ({sim.totalDraws} sorteios)
              </h4>
              {sim.totalPrize > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRedemptionOpen(true)}
                  className="h-6 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Landmark className="w-3 h-3" /> Resgate Líquido Caixa
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox label="Investido" value={fmtBRL(sim.totalCost)} tone="neutral" />
              <StatBox label="Premiação" value={fmtBRL(sim.totalPrize)} tone="positive" icon={<Trophy className="w-3 h-3" />} />
              <StatBox
                label="Lucro / Prejuízo"
                value={fmtBRL(sim.netProfit)}
                tone={sim.netProfit >= 0 ? "positive" : "negative"}
              />
              <StatBox
                label="ROI"
                value={`${sim.roi >= 0 ? "+" : ""}${formatNumber(sim.roi)}%`}
                tone={sim.roi >= 0 ? "positive" : "negative"}
                icon={<TrendingUp className="w-3 h-3" />}
              />
            </div>
          </div>

          {/* Tier breakdown */}
          {Object.keys(sim.prizeByTier).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Detalhamento por faixa de prêmio</p>
              {Object.entries(sim.prizeByTier)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([hits, info]) => (
                  <div key={hits} className="flex items-center gap-3 p-2 rounded-md bg-card border border-border/30 text-xs">
                    <Badge variant="outline" className="text-[10px]">{info.label}</Badge>
                    <span className="text-muted-foreground">{formatNumber(info.count)}× acertos</span>
                    <span className="ml-auto font-bold text-foreground tabular-nums">{fmtBRL(info.total)}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Best draw */}
          {sim.bestDraw && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center gap-2 text-xs">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Melhor sorteio:</span>
                <span className="font-bold text-foreground">#{sim.bestDraw.concurso}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{sim.bestDraw.hits} acertos</span>
                <span className="ml-auto font-bold text-primary tabular-nums">{fmtBRL(sim.bestDraw.prize)}</span>
              </div>
            </div>
          )}

          {/* Future projection */}
          {projection && (
            <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ChartLine className="w-3.5 h-3.5 text-primary" /> Projeção para os próximos {formatNumber(futureDraws)} sorteios
                </h4>
                <Badge variant="outline" className="text-[10px]">Confiança: {formatNumber(projection.confidence)}%</Badge>
              </div>
              <Progress value={projection.confidence} className="h-1" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatBox label="Custo previsto" value={fmtBRL(projection.projCost)} tone="neutral" />
                <StatBox label="Ganho esperado" value={fmtBRL(projection.projPrize)} tone="positive" icon={<Trophy className="w-3 h-3" />} />
                <StatBox
                  label="Resultado líquido"
                  value={fmtBRL(projection.projNet)}
                  tone={projection.projNet >= 0 ? "positive" : "negative"}
                  icon={<TrendingUp className="w-3 h-3" />}
                />
              </div>
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 rounded bg-background/50 border border-border/30">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Projeção estatística baseada no desempenho histórico. Loterias são jogos de azar — resultados passados
                  <strong> não garantem </strong> ganhos futuros.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <CaixaPrizeRedemptionDialog
        open={redemptionOpen}
        onOpenChange={setRedemptionOpen}
        initialPrize={sim?.totalPrize || 50000}
        lotteryName={lotteryId.toUpperCase()}
      />
    </div>
  );
}

function StatBox({ label, value, tone, icon }: { label: string; value: string; tone: "positive" | "negative" | "neutral"; icon?: React.ReactNode }) {
  const toneCls =
    tone === "positive" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
    : tone === "negative" ? "text-rose-500 border-rose-500/30 bg-rose-500/5"
    : "text-foreground border-border/40 bg-card";
  return (
    <div className={`p-2.5 rounded-lg border ${toneCls}`}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
