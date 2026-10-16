/**
 * ClosingDashboardPanel — Fase 3 do Motor de Fechamentos.
 * Monte Carlo (probabilidade) + Backtest histórico (ROI real) para um
 * fechamento já gerado.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Dice5, History, Info, Trophy, Flame, X } from "lucide-react";
import type {
  ClosingResult, MonteCarloResult, BacktestResult, HistoricalDraw,
} from "@/engine/closing";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useLotteryDraws } from "@/hooks/useLotteryDraws";
import { useMonteCarloWorker, MonteCarloCanceledError } from "@/hooks/useMonteCarloWorker";
import { useBacktestWorker, BacktestCanceledError } from "@/hooks/useBacktestWorker";
import { cn } from "@/lib/utils";

interface Props {
  result: ClosingResult;
  /** Prêmios estimados por faixa (hits → BRL). Opcional. */
  prizeTiers?: Record<number, number>;
}

const DEFAULT_TIERS: Record<string, Record<number, number>> = {
  lotofacil: { 15: 1_500_000, 14: 2_000, 13: 35, 12: 14, 11: 7 },
  megasena: { 6: 50_000_000, 5: 60_000, 4: 1_500 },
  quina: { 5: 8_000_000, 4: 8_000, 3: 100, 2: 3 },
  lotomania: { 20: 4_000_000, 19: 40_000, 18: 800, 17: 40, 16: 6, 0: 2_000_000 },
};

export function ClosingDashboardPanel({ result, prizeTiers }: Props) {
  const { config } = useLotteryContext();
  const { draws: drawsData } = useLotteryDraws(config.id);
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  const [bt, setBt] = useState<BacktestResult | null>(null);
  const [trials, setTrials] = useState(100_000);
  const [drawLimit, setDrawLimit] = useState(500);

  const mcWorker = useMonteCarloWorker();
  const btWorker = useBacktestWorker();

  const tiers = prizeTiers ?? DEFAULT_TIERS[config.id] ?? {};

  const runMC = async () => {
    try {
      const r = await mcWorker.run(
        {
          games: result.games,
          totalNumbers: result.request.lottery.totalNumbers,
          drawSize: result.request.lottery.pick,
          trials,
          targetHits: result.validation.targetMinHits,
          captureHeatmap: true,
        },
        20,
      );
      setMc(r);
    } catch (e) {
      if (!(e instanceof MonteCarloCanceledError)) console.error(e);
    }
  };

  const runBT = async () => {
    if (!drawsData || drawsData.length === 0) return;
    try {
      const historic: HistoricalDraw[] = drawsData
        .slice(0, drawLimit)
        .map(d => ({ contest: d.concurso, date: d.date, numbers: d.numbers }));
      const r = await btWorker.run({
        games: result.games,
        draws: historic,
        ticketPrice: result.request.lottery.ticketPrice,
        prizeTiers: tiers,
      });
      setBt(r);
    } catch (e) {
      if (!(e instanceof BacktestCanceledError)) console.error(e);
    }
  };

  const runningMC = mcWorker.running;
  const runningBT = btWorker.running;
  const mcPct = mcWorker.progress.total > 0
    ? (mcWorker.progress.current / mcWorker.progress.total) * 100 : 0;
  const btPct = btWorker.progress.total > 0
    ? (btWorker.progress.current / btWorker.progress.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Dashboard Executivo — Simulação & Backtest
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="montecarlo">
          <TabsList>
            <TabsTrigger value="montecarlo">
              <Dice5 className="h-4 w-4 mr-1" /> Monte Carlo
            </TabsTrigger>
            <TabsTrigger value="backtest">
              <History className="h-4 w-4 mr-1" /> Backtest Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="montecarlo" className="space-y-4 mt-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Sorteios simulados</label>
                <div className="flex gap-2 mt-1">
                  {[10_000, 100_000, 500_000, 1_000_000].map(n => (
                    <Button key={n} size="sm" variant={trials === n ? "default" : "outline"}
                      onClick={() => setTrials(n)}>
                      {formatNumber(n)}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={runMC} disabled={runningMC}>
                {runningMC ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Dice5 className="h-4 w-4 mr-1" />}
                Simular
              </Button>
              {runningMC && (
                <Button variant="outline" size="icon" onClick={mcWorker.cancel} title="Cancelar">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {runningMC && (
              <div className="space-y-1">
                <Progress value={mcPct} />
                <p className="text-xs text-muted-foreground font-mono">
                  {formatNumber(mcWorker.progress.current)} / {formatNumber(mcWorker.progress.total)} trials
                  {typeof mcWorker.progress.hitRate === "number" &&
                    ` · hit-rate parcial ${mcWorker.progress.hitRate.toFixed(2)}%`}
                </p>
              </div>
            )}
            {mc && <MCResults mc={mc} />}
          </TabsContent>

          <TabsContent value="backtest" className="space-y-4 mt-4">
            {!drawsData || drawsData.length === 0 ? (
              <Alert><Info className="h-4 w-4" />
                <AlertDescription>Sem histórico local. Sincronize concursos antes do backtest.</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">
                      Concursos testados (histórico disponível: {drawsData.length})
                    </label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {[50, 100, 500, drawsData.length].map(n => (
                        <Button key={n} size="sm" variant={drawLimit === n ? "default" : "outline"}
                          onClick={() => setDrawLimit(n)}>
                          {n === drawsData.length ? "Todos" : n}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={runBT} disabled={runningBT}>
                    {runningBT ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <History className="h-4 w-4 mr-1" />}
                    Backtest
                  </Button>
                  {runningBT && (
                    <Button variant="outline" size="icon" onClick={btWorker.cancel} title="Cancelar">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {runningBT && (
                  <div className="space-y-1">
                    <Progress value={btPct} />
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatNumber(btWorker.progress.current)} / {formatNumber(btWorker.progress.total)} concursos
                    </p>
                  </div>
                )}
                {bt && <BTResults bt={bt} />}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MCResults({ mc }: { mc: MonteCarloResult }) {
  const dist = Object.entries(mc.distribution).sort(([a], [b]) => Number(b) - Number(a));
  const maxCount = Math.max(...dist.map(([, c]) => c));
  const ciLow = mc.hitRateCI95[0];
  const ciHigh = mc.hitRateCI95[1];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Trials" value={formatNumber(mc.trials)} />
        <StatBox
          label="Hit-rate ≥ meta"
          value={`${mc.hitRate.toFixed(2)}%`}
          accent
          hint={`IC 95%: ${ciLow.toFixed(2)}% – ${ciHigh.toFixed(2)}%`}
        />
        <StatBox label="Média de acertos" value={mc.meanHits.toFixed(2)} />
        <StatBox label="Melhor / pior" value={`${mc.bestHits} / ${mc.worstHits}`} />
      </div>

      {mc.convergence.length > 1 && (
        <div>
          <p className="text-sm font-semibold mb-2">Curva de convergência (hit-rate ao longo dos trials)</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mc.convergence} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="trial" tick={{ fontSize: 10 }}
                  tickFormatter={(v) => formatNumber(v as number)} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]}
                  tickFormatter={(v) => `${(v as number).toFixed(1)}%`} />
                <RTooltip
                  formatter={(v: number | string, name) =>
                    name === "hitRate"
                      ? [`${Number(v).toFixed(3)}%`, "Hit-rate"]
                      : [Number(v).toFixed(2), "Média acertos"]
                  }
                  labelFormatter={(l) => `Trial ${formatNumber(l as number)}`}
                />
                <ReferenceArea y1={ciLow} y2={ciHigh} fill="hsl(var(--primary))" fillOpacity={0.08} />
                <Line type="monotone" dataKey="hitRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Faixa sombreada = IC 95% (Wilson) da estimativa final.
          </p>
        </div>
      )}

      {mc.heatmap && Object.keys(mc.heatmap).length > 0 && <MCHeatmap heatmap={mc.heatmap} trials={mc.trials} />}

      <div>
        <p className="text-sm font-semibold mb-2">Distribuição de acertos (melhor jogo por sorteio)</p>
        <div className="space-y-1.5">
          {dist.map(([hits, count]) => {
            const pct = (count / mc.trials) * 100;
            return (
              <div key={hits} className="flex items-center gap-2 text-xs">
                <span className="w-16 font-mono">{hits} pts</span>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-primary transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="w-28 text-right font-mono text-muted-foreground">
                  {formatNumber(count)} · {pct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Simulado em {mc.elapsedMs}ms.</p>
    </div>
  );
}

function MCHeatmap({ heatmap, trials }: { heatmap: Record<number, number>; trials: number }) {
  const entries = Object.entries(heatmap)
    .map(([n, c]) => ({ n: Number(n), c }))
    .sort((a, b) => a.n - b.n);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(e => e.c));
  const min = Math.min(...entries.map(e => e.c));
  const range = Math.max(1, max - min);
  return (
    <div>
      <p className="text-sm font-semibold mb-2 flex items-center gap-1">
        <Flame className="h-4 w-4 text-orange-500" />
        Heatmap por dezena — frequência nos sorteios simulados
      </p>
      <div className="grid grid-cols-10 gap-1">
        {entries.map(({ n, c }) => {
          const intensity = (c - min) / range;
          const pct = (c / trials) * 100;
          return (
            <div
              key={n}
              title={`Dezena ${n}: ${pct.toFixed(2)}%`}
              className="aspect-square rounded flex items-center justify-center text-[10px] font-mono font-semibold border"
              style={{
                background: `hsl(var(--primary) / ${0.12 + intensity * 0.75})`,
                color: intensity > 0.55 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Cores mais quentes = dezena apareceu com mais frequência nos {formatNumber(trials)} sorteios simulados.
      </p>
    </div>
  );
}

function BTResults({ bt }: { bt: BacktestResult }) {
  const dist = Object.entries(bt.hitDistribution).sort(([a], [b]) => Number(b) - Number(a));
  const roiPositive = bt.roi >= 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Concursos" value={formatNumber(bt.totalDraws)} />
        <StatBox label="Custo total" value={formatCurrency(bt.totalCost)} />
        <StatBox label="Prêmios" value={formatCurrency(bt.totalPrize)} accent />
        <StatBox
          label="ROI"
          value={`${bt.roi >= 0 ? "+" : ""}${bt.roi.toFixed(2)}%`}
          highlight={roiPositive ? "green" : "red"}
        />
      </div>

      {bt.bestOutcome && bt.bestOutcome.bestHits > 0 && (
        <Alert>
          <Trophy className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Melhor concurso:</span> #{bt.bestOutcome.contest}
            {bt.bestOutcome.date && ` (${bt.bestOutcome.date})`} —
            <span className="font-mono ml-1">{bt.bestOutcome.bestHits} acertos</span>
            {bt.bestOutcome.prize > 0 && <> · prêmio {formatCurrency(bt.bestOutcome.prize)}</>}
          </AlertDescription>
        </Alert>
      )}

      <div>
        <p className="text-sm font-semibold mb-2">Distribuição histórica de acertos</p>
        <div className="space-y-1.5">
          {dist.map(([hits, count]) => {
            const pct = (count / bt.totalDraws) * 100;
            return (
              <div key={hits} className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="w-16 font-mono justify-center">{hits} pts</Badge>
                <Progress value={pct} className="flex-1" />
                <span className="w-28 text-right font-mono text-muted-foreground">
                  {count} · {pct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Backtest em {bt.elapsedMs}ms · média {bt.meanHits.toFixed(2)} acertos/concurso.
      </p>
    </div>
  );
}

function StatBox({
  label, value, accent, highlight, hint,
}: { label: string; value: string; accent?: boolean; highlight?: "green" | "red"; hint?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-xl font-bold font-mono mt-1",
        accent && "text-primary",
        highlight === "green" && "text-green-500",
        highlight === "red" && "text-red-500",
      )}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1 font-mono">{hint}</p>}
    </div>
  );
}
