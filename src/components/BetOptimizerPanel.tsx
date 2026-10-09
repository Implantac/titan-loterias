import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberStats } from "@/engine/stats/statistics";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { evaluateBetQuality, BetQualityReport } from "@/engine/stats/bet-quality";
import { runCombinatorialOptimization, OptimizationResult } from "@/engine/math/combinatorial-optimizer";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gem, Shield, AlertTriangle, CheckCircle2, Cpu } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatNumber } from "@/utils/formatters";

interface Props {
  stats: NumberStats[];
  config: LotteryConfig;
  draws: DrawResult[];
}

const GRADE_COLORS: Record<string, string> = {
  S: "text-primary",
  A: "text-primary",
  B: "text-foreground",
  C: "text-muted-foreground",
  D: "text-destructive",
  F: "text-destructive",
};

export function BetOptimizerPanel({ stats, config, draws }: Props) {
  const [manualBet, setManualBet] = useState("");
  const [qualityReport, setQualityReport] = useState<BetQualityReport | null>(null);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState(3000);

  const handleEvaluate = () => {
    const numbers = manualBet
      .split(/[,\s]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= config.numbers);

    if (numbers.length !== config.pick) return;
    const report = evaluateBetQuality(numbers, stats, config, draws);
    setQualityReport(report);
  };

  const handleOptimize = () => {
    setRunning(true);
    setOptResult(null);
    setTimeout(() => {
      const result = runCombinatorialOptimization(stats, config, draws, iterations);
      setOptResult(result);
      setRunning(false);
    }, 50);
  };

  return (
    <Card className="bg-card/80 backdrop-blur border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Gem className="w-5 h-5 text-primary" />
          Avaliador & Otimizador de Apostas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Avalie a qualidade de apostas em 9 dimensões ou encontre a combinação ótima via algoritmo genético
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual bet evaluation */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            <Shield className="w-3 h-3 inline mr-1" />
            Avalie sua aposta ({config.pick} números, 1 a {config.numbers})
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualBet}
              onChange={e => setManualBet(e.target.value)}
              aria-label="Números da aposta a avaliar"
              placeholder={`Ex: ${Array.from({ length: config.pick }, (_, i) => i * Math.floor(config.numbers / config.pick) + 1).join(", ")}`}
              className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <Button size="sm" onClick={handleEvaluate}>Avaliar</Button>
          </div>
        </div>

        {/* Quality Report */}
        <AnimatePresence>
          {qualityReport && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-black font-mono ${GRADE_COLORS[qualityReport.grade]}`}>
                  {qualityReport.grade}
                </span>
                <div className="flex-1">
                  <Progress value={qualityReport.overall} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{qualityReport.overall}/100 pontos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {qualityReport.dimensions.map(d => (
                  <div key={d.name} className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.detail}</p>
                    </div>
                    <Badge variant={d.score >= 70 ? "default" : d.score >= 40 ? "secondary" : "destructive"} className="text-[10px]">
                      {d.score}
                    </Badge>
                  </div>
                ))}
              </div>

              {qualityReport.warnings.length > 0 && (
                <div className="space-y-1">
                  {qualityReport.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {w}
                    </p>
                  ))}
                </div>
              )}
              {qualityReport.strengths.length > 0 && (
                <div className="space-y-1">
                  {qualityReport.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {s}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Combinatorial Optimizer */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Otimização Combinatória (Algoritmo Genético)
              </h4>
              <p className="text-[10px] text-muted-foreground">Evolui populações de apostas para maximizar qualidade</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1000, 3000, 5000, 10000].map(n => (
              <button
                key={n}
                onClick={() => setIterations(n)}
                className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all ${
                  iterations === n
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {n >= 1000 ? `${n / 1000}K` : n}
              </button>
            ))}
            <Button size="sm" onClick={handleOptimize} disabled={running} className="ml-auto gap-1">
              <Cpu className="w-3 h-3" />
              {running ? "Otimizando..." : "Otimizar"}
            </Button>
          </div>
        </div>

        {/* Optimization Results */}
        <AnimatePresence>
          {optResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-xs text-muted-foreground">
                {formatNumber(optResult.iterations)} gerações em {formatNumber(optResult.elapsedMs)}ms
              </div>

              {/* Best bet */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">Melhor Aposta</Badge>
                  <span className={`text-lg font-black font-mono ${GRADE_COLORS[optResult.best.quality.grade]}`}>
                    {optResult.best.quality.grade}
                  </span>
                  <span className="text-sm font-mono text-foreground">{formatNumber(optResult.best.quality.overall)}/100</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {optResult.best.numbers.map(n => (
                    <span key={n} className="lottery-ball text-xs w-8 h-8">
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>
                {optResult.best.quality.strengths.map((s, i) => (
                  <p key={i} className="text-[10px] text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> {s}
                  </p>
                ))}
              </div>

              {/* Top 5 */}
              <div className="space-y-1.5">
                {optResult.top5.slice(1).map((bet, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border">
                    <span className="text-xs font-mono text-muted-foreground w-5">#{idx + 2}</span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {bet.numbers.map(n => (
                        <span key={n} className="text-[10px] font-mono bg-muted rounded px-1.5 py-0.5 text-foreground">
                          {String(n).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {bet.quality.grade} {bet.quality.overall}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Convergence chart */}
              {optResult.convergenceHistory.length > 0 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={optResult.convergenceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="iteration" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Score" />
                    </LineChart>
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
