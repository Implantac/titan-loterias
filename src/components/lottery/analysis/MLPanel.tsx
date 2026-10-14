import { useState, useMemo } from "react";
import { NumberStats, computeFrequencyStats } from "@/engine/stats/statistics";
import { LotteryConfig, DrawResult } from "@/data/lotteries";
import { runAllModels, getConsensusRanking, ModelResult, MLPrediction, ScoreBreakdown } from "@/engine/ai/ml-models";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Play, Trophy, Target, Percent, Info, BarChart2, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  stats: NumberStats[];
  config: LotteryConfig;
  draws?: DrawResult[];
}

function BreakdownBar({ breakdown }: { breakdown?: ScoreBreakdown }) {
  if (!breakdown) return null;
  const factors = [
    { key: "Frequência", value: breakdown.frequency, color: "bg-emerald-500" },
    { key: "Recência", value: breakdown.recency, color: "bg-blue-500" },
    { key: "Tendência", value: breakdown.trend, color: "bg-amber-500" },
    { key: "Ciclo", value: breakdown.cycle, color: "bg-purple-500" },
    { key: "Momentum", value: breakdown.momentum, color: "bg-rose-500" },
    { key: "Consistência", value: breakdown.consistency, color: "bg-cyan-500" },
  ].filter(f => f.value > 3);

  return (
    <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full">
      {factors.map(f => (
        <div key={f.key} className={`${f.color} opacity-80`} style={{ width: `${f.value}%` }} title={`${f.key}: ${f.value}%`} />
      ))}
    </div>
  );
}

function BacktestBadge({ model }: { model: ModelResult }) {
  if (!model.backtestDetails || model.backtestDetails.totalDrawsTested === 0) {
    return <span className="text-[10px] text-muted-foreground/60 italic">sem backtesting</span>;
  }
  const bt = model.backtestDetails;
  return (
    <div className="flex items-center gap-1 mt-1">
      <Beaker className="w-2.5 h-2.5 text-primary/60" />
      <span className="text-[10px] text-muted-foreground">
        {bt.totalDrawsTested} sorteios | avg {bt.avgHitsInTop15} hits/top15
      </span>
    </div>
  );
}

export function MLPanel({ stats, config, draws }: Props) {
  const [models, setModels] = useState<ModelResult[] | null>(null);
  const [consensus, setConsensus] = useState<MLPrediction[] | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<MLPrediction | null>(null);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const results = runAllModels(stats, config, draws, computeFrequencyStats);
      setModels(results);
      setConsensus(getConsensusRanking(results));
      setSelectedNumber(null);
      setRunning(false);
    }, 800);
  };

  const renderChart = (predictions: MLPrediction[], color: string) => {
    const top20 = predictions.slice(0, 20);
    return (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top20} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <XAxis dataKey="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} cursor="pointer"
              onClick={(data: any) => data && setSelectedNumber(data)}>
              {top20.map((_, i) => (
                <Cell key={i} fill={`hsl(${color}, ${80 - i * 2}%)`} fillOpacity={1 - i * 0.02} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderBreakdownDetail = () => {
    if (!selectedNumber?.breakdown) return null;
    const bd = selectedNumber.breakdown;
    const factors = [
      { label: "Frequência", value: bd.frequency, color: "bg-emerald-500", desc: "Peso da frequência histórica" },
      { label: "Recência", value: bd.recency, color: "bg-blue-500", desc: "Aparições nos últimos sorteios" },
      { label: "Tendência", value: bd.trend, color: "bg-amber-500", desc: "Direção da frequência recente" },
      { label: "Ciclo", value: bd.cycle, color: "bg-purple-500", desc: "Padrão cíclico de aparição" },
      { label: "Momentum", value: bd.momentum, color: "bg-rose-500", desc: "Aceleração/desaceleração" },
      { label: "Consistência", value: bd.consistency, color: "bg-cyan-500", desc: "Regularidade dos gaps" },
    ].filter(f => f.value > 0);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-secondary/50 border border-border p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Info className="w-3 h-3 text-primary" />
            Nº {String(selectedNumber.number).padStart(2, '0')} — Score: {selectedNumber.score}%
          </p>
          <button onClick={() => setSelectedNumber(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="space-y-1.5">
          {factors.map(f => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0">{f.label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className={`${f.color} h-full rounded-full opacity-80`} style={{ width: `${f.value}%` }} />
              </div>
              <span className="text-[10px] font-mono text-foreground w-8 text-right">{f.value}%</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          Clique em qualquer barra do gráfico para ver o breakdown de fatores
        </p>
      </motion.div>
    );
  };

  return (
    <div className="rounded-xl bg-card border border-border p-3 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-neon-purple" />
          Modelos e Scores Estatísticos
        </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            6 modelos com evidência histórica real e breakdown de fatores
          </p>
        </div>
        <Button
          size="sm"
          onClick={run}
          disabled={running}
          className="bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30"
        >
          <Play className="w-3 h-3 mr-1" />
          {running ? "Processando..." : "Executar Modelos"}
        </Button>
      </div>

      {running && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cálculo de evidência e calibração dos 6 modelos...</p>
        </div>
      )}

      {models && !running && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Model stats cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mb-4">
              {models.map((model) => (
                <div key={model.name} className="rounded-lg bg-secondary/50 border border-border p-3">
                  <p className="text-xs font-semibold text-foreground mb-2 truncate">{model.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Target className="w-3 h-3 shrink-0" />
                    Performance: <span className="text-foreground font-mono">{model.performanceScore !== null ? model.performanceScore.toFixed(1) : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Percent className="w-3 h-3 shrink-0" />
                    Confiança: <span className="text-foreground font-mono">{model.confidence.toFixed(1)}%</span>
                  </div>
                  <BacktestBadge model={model} />
                </div>
              ))}
            </div>

            {/* Breakdown detail panel */}
            {renderBreakdownDetail()}

            <Tabs defaultValue="consensus" className="w-full">
              <TabsList className="w-full bg-secondary/50 border border-border flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="consensus" className="text-xs">
                  <Trophy className="w-3 h-3 mr-1" /> Consenso
                </TabsTrigger>
                {models.map(m => (
                  <TabsTrigger key={m.name} value={m.name} className="text-xs">
                    {m.name.length > 12 ? m.name.slice(0, 12) + "…" : m.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="consensus" className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Top 20 — média ponderada pelo desempenho e cobertura dos 6 modelos estatísticos (clique em uma barra para ver detalhes):
                </p>
                {consensus && (
                  <>
                    {renderChart(consensus, "270, 70%")}
                    <div className="mt-3 space-y-1">
                      {consensus.slice(0, 5).map(p => (
                        <div key={p.number} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-foreground w-8">Nº{String(p.number).padStart(2, '0')}</span>
                          <BreakdownBar breakdown={p.breakdown} />
                          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{p.score}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {models.map((model, mi) => {
                const colors = ["142, 70%", "200, 90%", "0, 72%", "45, 80%", "180, 60%", "300, 70%"];
                return (
                  <TabsContent key={model.name} value={model.name} className="mt-4">
                    <p className="text-xs text-muted-foreground mb-1">{model.description}</p>
                    <p className="text-xs text-muted-foreground mb-3">Top 20 números — clique para ver breakdown:</p>
                    {renderChart(model.predictions, colors[mi])}
                    {/* Top 5 breakdown bars */}
                    <div className="mt-3 space-y-1">
                      {model.predictions.slice(0, 5).map(p => (
                        <div key={p.number} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-foreground w-8">Nº{String(p.number).padStart(2, '0')}</span>
                          <BreakdownBar breakdown={p.breakdown} />
                          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{p.score}%</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </motion.div>
        </AnimatePresence>
      )}

      {!models && !running && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Clique em "Executar Modelos" para rodar os 6 algoritmos estatísticos com evidência histórica real
        </div>
      )}
    </div>
  );
}
