import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberStats } from "@/engine/stats/statistics";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { STRATEGIES, Strategy } from "@/engine/strategies";
import { runBacktest, BacktestResult } from "@/engine/simulators/backtesting";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Play, Trophy, TrendingUp, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

interface Props {
  stats: NumberStats[];
  config: LotteryConfig;
  draws: DrawResult[];
}

const COLORS = [
  "hsl(142, 70%, 45%)", "hsl(200, 90%, 50%)", "hsl(280, 70%, 55%)",
  "hsl(45, 95%, 55%)", "hsl(0, 80%, 55%)", "hsl(170, 70%, 45%)",
];

export function BacktestPanel({ stats, config, draws }: Props) {
  const [selectedStrategies, setSelectedStrategies] = useState<Strategy[]>(
    ["smart", "hot", "cold", "trend", "cycle", "hybrid"]
  );
  const [testWindow, setTestWindow] = useState(50);
  const [betsPerDraw, setBetsPerDraw] = useState(3);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult[] | null>(null);

  // Reset state when lottery changes
  const prevLotteryId = useRef(config.id);
  useEffect(() => {
    if (prevLotteryId.current !== config.id) {
      prevLotteryId.current = config.id;
      setResults(null);
    }
  }, [config.id]);

  const toggleStrategy = (s: Strategy) => {
    setSelectedStrategies(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const run = () => {
    setRunning(true);
    setResults(null);
    setTimeout(() => {
      const minPrizeMap: Record<string, number> = {
        megasena: 4, lotofacil: 11, quina: 2, lotomania: 15,
        duplasena: 3, timemania: 3, diadesorte: 4, supersete: 3,
      };
      const minPrize = minPrizeMap[config.id] || (config.pick <= 6 ? 4 : config.pick <= 10 ? 5 : config.pick - 4);
      const res = runBacktest(stats, config, draws, {
        strategies: selectedStrategies,
        testWindow,
        betsPerDraw,
        minPrizeHits: minPrize,
      });
      setResults(res);
      setRunning(false);
    }, 50);
  };

  const chartData = results?.map(r => ({
    name: r.label,
    "Taxa de Cobertura (%)": r.winRate,
    "Média Acertos": r.avgHits,
    "Consistência (%)": Math.round(r.consistency * 100),
  })) ?? [];

  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative group">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FlaskConical className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
          Backtesting Elite v5.3
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Teste cada estratégia contra {draws.length} resultados históricos reais e compare desempenho
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy selector */}
        <div className="flex flex-wrap gap-1.5">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => toggleStrategy(s.id)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                selectedStrategies.includes(s.id)
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Config */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Sorteios:</span>
            {[20, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => setTestWindow(n)}
                className={`font-mono px-2 py-0.5 rounded border ${
                  testWindow === n ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Apostas/sorteio:</span>
            {[1, 3, 5].map(n => (
              <button
                key={n}
                onClick={() => setBetsPerDraw(n)}
                className={`font-mono px-2 py-0.5 rounded border ${
                  betsPerDraw === n ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={run} disabled={running || selectedStrategies.length === 0} className="w-full h-11 rounded-xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
          {running ? <Zap className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
          {running ? "Executando backtesting..." : `Testar ${selectedStrategies.length} estratégias × ${testWindow} sorteios`}
        </Button>

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Ranking */}
              <div className="space-y-2">
                {results.map((r, idx) => (
                  <div key={r.strategy} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border group/row hover:border-primary/40 hover:bg-muted/30 transition-all cursor-default">
                    <span className="text-lg font-black font-mono text-primary/40 group-hover/row:text-primary transition-colors w-7 text-right">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{r.label}</span>
                        {idx === 0 && <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground font-black tracking-widest"><Trophy className="w-2.5 h-2.5 mr-0.5" />Melhor</Badge>}
                      </div>
                      <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span>Média: <strong className="text-foreground">{r.avgHits}</strong></span>
                        <span>Melhor: <strong className="text-foreground">{r.bestHit}</strong></span>
                        <span>Win: <strong className="text-primary">{r.winRate}%</strong></span>
                        <span>ROI: <strong className="text-foreground">{r.profit}x</strong></span>
                        <span className="hidden sm:inline">Série+: <strong>{r.streaks.bestWin}</strong></span>
                        <span className="hidden sm:inline">Série-: <strong>{r.streaks.worstLoss}</strong></span>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">Consistência</p>
                      <div className="flex items-center gap-1">
                        <Progress value={r.consistency * 100} className="w-16 h-1.5" />
                        <span className="text-xs font-mono text-foreground">{Math.round(r.consistency * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Taxa de Cobertura (%)" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Consistência (%)" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
