import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Play, Loader2, Target, Scale, Sparkles, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { NumberStats, computeFrequencyStats } from "@/engine/stats/statistics";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { generateGames } from "@/ai/generators/universalGameGenerator";
import { buildBenchmarkReport, BenchmarkReport, generateRandomGames } from "@/engine/stats/baseline-benchmark";
import { compareHeldoutHits, splitHeldoutDraws, type HeldoutComparison } from "@/engine/stats/heldout-comparison";
import { createXorshift32, hashStringToSeed } from "@/ai/core/rng";
import { toast } from "sonner";
import type { RiskProfile } from "@/ai/core/aiTypes";

interface Props {
  stats: NumberStats[];
  config: LotteryConfig;
  draws: DrawResult[];
}

const SAMPLE_OPTIONS = [1000, 2500, 5000];
const RISK_OPTIONS: { value: RiskProfile; label: string }[] = [
  { value: "balanced", label: "Equilibrado" },
  { value: "statistical", label: "Estatístico" },
  { value: "aggressive", label: "Agressivo" },
  { value: "conservative", label: "Conservador" },
];

export function BaselineBenchmarkPanel({ stats, config, draws }: Props) {
  const [sampleSize, setSampleSize] = useState(1000);
  const [risk, setRisk] = useState<RiskProfile>("balanced");
  const [baselineWindow, setBaselineWindow] = useState(200);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [heldout, setHeldout] = useState<HeldoutComparison | null>(null);

  useEffect(() => { setReport(null); setHeldout(null); }, [config.id]);

  const supported = ["megasena", "lotofacil", "quina"].includes(config.id);
  const canRun = supported && draws.length >= baselineWindow + 20;

  const run = async () => {
    setRunning(true);
    setReport(null);
    setHeldout(null);
    // permite a UI atualizar
    await new Promise(r => setTimeout(r, 40));
    try {
      if (!canRun) return;
      // Histórico em ordem decrescente: concursos mais recentes reservados para teste.
      const { test: testDraws, training: trainingDraws } = splitHeldoutDraws(draws, baselineWindow);
      const seed = hashStringToSeed(`${config.id}:${testDraws[0]?.concurso}:${sampleSize}:${risk}`);
      const games = generateGames({
        lotteryId: config.id,
        count: sampleSize,
        riskProfile: risk,
        filters: {
          avoidSequences: true,
          balanceParity: true,
          balanceHighLow: true,
          prioritizeHot: false,
          prioritizeCold: false,
          frameCenter: false,
          limitRepetition: true,
        },
        stats: computeFrequencyStats(trainingDraws, config.numbers),
        draws: trainingDraws,
        rng: createXorshift32(seed),
      });
      const numbersOnly = games.map(g => g.numbers);
      const random = generateRandomGames(config, numbersOnly.length, createXorshift32(seed ^ 0x9e3779b9));
      setHeldout(compareHeldoutHits(numbersOnly, random, testDraws, Math.max(1, config.pick - 1), config.pick));
      // O painel abaixo é só de semelhança descritiva das distribuições.
      setReport(buildBenchmarkReport(numbersOnly, testDraws, config.id, baselineWindow));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no comparativo.");
    } finally {
      setRunning(false);
    }
  };

  const parityChart = useMemo(() => {
    if (!report) return [];
    const keys = new Set([
      ...Object.keys(report.generated.parityDistribution),
      ...Object.keys(report.baseline.parityDistribution),
    ]);
    return Array.from(keys)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .map(k => ({
        even: `${k} pares`,
        Geradas: ((report.generated.parityDistribution[k] ?? 0) / report.totalGames) * 100,
        Histórico: ((report.baseline.parityDistribution[k] ?? 0) / report.totalDraws) * 100,
      }));
  }, [report]);

  const decadeChart = useMemo(() => {
    if (!report) return [];
    const gen = report.generated.decadeDistribution;
    const base = report.baseline.decadeDistribution;
    const max = Math.max(gen.length, base.length);
    const genTotal = gen.reduce((a, b) => a + b, 0) || 1;
    const baseTotal = base.reduce((a, b) => a + b, 0) || 1;
    return Array.from({ length: max }).map((_, i) => ({
      decada: `${i * 10 + 1}-${(i + 1) * 10}`,
      Geradas: ((gen[i] ?? 0) / genTotal) * 100,
      Histórico: ((base[i] ?? 0) / baseTotal) * 100,
    }));
  }, [report]);

  const radarData = useMemo(() => {
    if (!report) return [];
    const norm = (a: number, b: number) => {
      const m = Math.max(a, b) || 1;
      return { gen: (a / m) * 100, base: (b / m) * 100 };
    };
    const sum = norm(report.generated.metrics.avgSum, report.baseline.metrics.avgSum);
    const par = norm(report.generated.metrics.avgEven, report.baseline.metrics.avgEven);
    const sp = norm(report.generated.metrics.avgSpread, report.baseline.metrics.avgSpread);
    const sd = norm(report.generated.metrics.avgStdev, report.baseline.metrics.avgStdev);
    const cov = norm(report.generated.coverage.coveragePct, report.baseline.coverage.coveragePct);
    const dec = norm(report.generated.metrics.avgDecadeUsed, report.baseline.metrics.avgDecadeUsed);
    return [
      { metric: "Soma", Geradas: sum.gen, Histórico: sum.base },
      { metric: "Paridade", Geradas: par.gen, Histórico: par.base },
      { metric: "Spread", Geradas: sp.gen, Histórico: sp.base },
      { metric: "Dispersão", Geradas: sd.gen, Histórico: sd.base },
      { metric: "Coverage", Geradas: cov.gen, Histórico: cov.base },
      { metric: "Décadas", Geradas: dec.gen, Histórico: dec.base },
    ];
  }, [report]);

  return (
    <Card className="bg-card/80 backdrop-blur border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="w-5 h-5 text-primary" />
          Comparação fora da amostra + perfil histórico
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Treina com concursos anteriores; compara <strong>{sampleSize.toLocaleString("pt-BR")}</strong> jogos com o mesmo número de jogos aleatórios nos {baselineWindow} concursos mais recentes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Amostra:</span>
            {SAMPLE_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setSampleSize(n)}
                className={`font-mono px-2 py-0.5 rounded border transition ${
                  sampleSize === n ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
                }`}
              >
                {n.toLocaleString("pt-BR")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Baseline:</span>
            {[50, 100, 200, 500].map(n => (
              <button
                key={n}
                onClick={() => setBaselineWindow(n)}
                className={`font-mono px-2 py-0.5 rounded border transition ${
                  baselineWindow === n ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Perfil:</span>
            {RISK_OPTIONS.map(r => (
              <button
                key={r.value}
                onClick={() => setRisk(r.value)}
                className={`px-2 py-0.5 rounded border transition ${
                  risk === r.value ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={run} disabled={running || !canRun} className="w-full gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running
            ? `Gerando e comparando ${sampleSize.toLocaleString("pt-BR")} jogos...`
            : `Rodar benchmark (${sampleSize.toLocaleString("pt-BR")} jogos × ${baselineWindow} sorteios)`}
        </Button>

        {!canRun && (
          <p className="text-xs text-muted-foreground text-center">
            {!supported ? "Esta comparação aceita apenas Mega-Sena, Lotofácil e Quina." : `Carregue pelo menos ${baselineWindow + 20} concursos para separar treino e teste.`}
          </p>
        )}

        {heldout && <div className="rounded-lg border border-primary/30 p-4 space-y-2 text-sm">
          <p className="font-semibold">Teste fora da amostra: {heldout.contests} concursos · {heldout.gamesPerStrategy} jogos por método</p>
          <p>≥ {heldout.targetHits} acertos no melhor jogo: gerados {heldout.generated.targetDraws}/{heldout.contests}; aleatórios {heldout.random.targetDraws}/{heldout.contests}.</p>
          <p className="text-xs text-muted-foreground">Mesmo número de apostas simples (custo equivalente por concurso). Uma janela histórica e uma semente não demonstram vantagem persistente; não há ROI nem previsão aqui.</p>
        </div>}

        <AnimatePresence>
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Alignment score */}
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Alinhamento estatístico</span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-primary">
                    {report.comparison.alignmentScore}/100
                  </span>
                </div>
                <Progress value={report.comparison.alignmentScore} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Medida descritiva de semelhança, não de chance de prêmio. O teste de acertos com orçamento igual aparece acima.
                </p>
              </div>

              {/* Delta cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { label: "Paridade", value: report.comparison.parityDeltaPct, icon: Scale },
                  { label: "Soma", value: report.comparison.sumDeltaPct, icon: TrendingUp },
                  { label: "Spread", value: report.comparison.spreadDeltaPct, icon: Target },
                  { label: "Dispersão", value: report.comparison.stdevDeltaPct, icon: Activity },
                  { label: "Coverage", value: report.comparison.coverageDeltaPct, icon: Target },
                ].map(d => (
                  <div key={d.label} className="p-2.5 rounded-md border border-border bg-muted/20">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                      <d.icon className="w-3 h-3" />
                      Δ {d.label}
                    </div>
                    <p className={`text-lg font-mono font-bold ${
                      d.value < 5 ? "text-primary" : d.value < 15 ? "text-foreground" : "text-destructive"
                    }`}>
                      {d.value.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>

              {/* Coverage */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs font-semibold text-foreground mb-2">Coverage — Geradas</p>
                  <p className="text-2xl font-mono text-primary">{report.generated.coverage.coveragePct.toFixed(1)}%</p>
                  <p className="text-[11px] text-muted-foreground">
                    {report.generated.coverage.numbersCovered}/{report.generated.coverage.totalNumbers} dezenas usadas · Gini {report.generated.coverage.giniCoefficient.toFixed(3)}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs font-semibold text-foreground mb-2">Coverage — Histórico</p>
                  <p className="text-2xl font-mono text-foreground">{report.baseline.coverage.coveragePct.toFixed(1)}%</p>
                  <p className="text-[11px] text-muted-foreground">
                    {report.baseline.coverage.numbersCovered}/{report.baseline.coverage.totalNumbers} dezenas usadas · Gini {report.baseline.coverage.giniCoefficient.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* Radar */}
              <div className="h-64">
                <p className="text-xs font-semibold text-foreground mb-1">Perfil multidimensional (normalizado)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <PolarRadiusAxis stroke="hsl(var(--border))" tick={{ fontSize: 9 }} />
                    <Radar name="Geradas" dataKey="Geradas" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                    <Radar name="Histórico" dataKey="Histórico" stroke="hsl(200,90%,50%)" fill="hsl(200,90%,50%)" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Parity */}
              <div className="h-56">
                <p className="text-xs font-semibold text-foreground mb-1">Distribuição de paridade (% jogos)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parityChart}>
                    <XAxis dataKey="even" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Geradas" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Histórico" fill="hsl(200,90%,50%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Decade dispersion */}
              <div className="h-56">
                <p className="text-xs font-semibold text-foreground mb-1">Dispersão por década (% dezenas)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={decadeChart}>
                    <XAxis dataKey="decada" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Geradas" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Histórico" fill="hsl(200,90%,50%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Most / least used */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs font-semibold text-foreground mb-2">Mais usadas (geradas)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.generated.coverage.mostUsed.map(n => (
                      <Badge key={n.number} variant="default" className="font-mono">
                        {String(n.number).padStart(2, "0")} · {n.count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs font-semibold text-foreground mb-2">Menos usadas (geradas)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.generated.coverage.leastUsed.map(n => (
                      <Badge key={n.number} variant="outline" className="font-mono">
                        {String(n.number).padStart(2, "0")} · {n.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
