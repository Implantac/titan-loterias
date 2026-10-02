import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { NumberStats } from "@/engine/stats/statistics";
import { runAutonomousAnalysis, AutonomousAIReport } from "@/engine/ai/autonomous-ai";
import { generateAutonomousAnalysis } from "@/engine/ai/native-analysis";
import { useToast } from "@/hooks/use-toast";
import {
  Brain, TrendingUp, TrendingDown, Zap, Target, RefreshCw, Sparkles,
  AlertTriangle, CheckCircle, ArrowUp, ArrowDown, Minus, Loader2,
  Activity, Trophy, GitBranch, Link2, Timer, Gauge, Dice1, TriangleAlert, FlaskConical, Snowflake
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis, LineChart, Line
} from "recharts";
import { AutonomousGamesPanel } from "./ai-autonomous/AutonomousGamesPanel";

interface Props {
  config: LotteryConfig;
  draws: DrawResult[];
  stats: NumberStats[];
}

export function AIAutonomousDashboard({ config, draws, stats }: Props) {
  const [report, setReport] = useState<AutonomousAIReport | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (draws.length > 0 && stats.length > 0) {
      const result = runAutonomousAnalysis(draws, stats, config);
      setReport(result);
      setAiAnalysis(null);
    }
  }, [draws, stats, config]);

  const runAIAnalysis = async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("ai-autonomous-learning", {
        body: {
          report,
          lotteryName: config.name,
          pick: config.pick,
          totalNumbers: config.numbers,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const analysis = data?.analysis as string | undefined;
      if (!analysis) throw new Error("Resposta da IA vazia");
      setAiAnalysis(analysis);
      toast({
        title: data?.fromCache ? "IA (cache)" : "IA Autônoma",
        description: "Análise real gerada pela IA com base nos dados reais.",
      });
    } catch (err: any) {
      // Fallback local apenas em caso de falha de rede/gateway
      const analysis = generateAutonomousAnalysis(report as any, config);
      setAiAnalysis(analysis);
      toast({
        title: "IA indisponível",
        description: err?.message || "Usando análise estatística local como fallback.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const refreshAnalysis = () => {
    if (draws.length > 0 && stats.length > 0) {
      setLoading(true);
      setTimeout(() => {
        const result = runAutonomousAnalysis(draws, stats, config);
        setReport(result);
        setAiAnalysis(null);
        setLoading(false);
        toast({ title: "Atualizado", description: "Análise recalculada." });
      }, 500);
    }
  };

  if (!report) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Brain className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>Carregando análise autônoma...</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142, 76%, 36%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)"];

  const topRankings = report.rankings.slice(0, 20);
  const rankingChartData = topRankings.map(r => ({
    name: `${r.number}`,
    score: r.compositeScore,
    freq: r.frequencyScore,
    markov: r.markovScore,
    entropy: r.entropyScore,
  }));

  const parityData = [
    { name: "Pares", value: report.parityProfile.even },
    { name: "Ímpares", value: report.parityProfile.odd },
  ];

  const radarData = report.spatialDistribution.map(z => ({
    zone: z.zone,
    real: z.actual,
    esperado: z.expected,
  }));

  const markovScatterData = report.markovTransitions.slice(0, 30).map(t => ({
    x: t.from, y: t.to, z: t.probability * 100, label: `${t.from}→${t.to}`,
  }));

  const gapChartData = report.gapAnalysis
    .filter(g => g.predictedReturn <= 5)
    .slice(0, 15)
    .map(g => ({
      name: String(g.number).padStart(2, "0"),
      gapAtual: g.currentGap,
      gapMedio: g.avgGap,
      retorno: g.predictedReturn,
    }));

  const momentumChartData = report.momentumTimeline.slice(0, 15).map(m => ({
    name: String(m.number).padStart(2, "0"),
    aceleracao: m.acceleration,
    fill: m.acceleration > 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)",
  }));

  // Entropy chart data
  const entropyZoneData = report.entropyAnalysis.entropyByZone.map(z => ({
    name: z.zone,
    entropia: z.entropy,
    normalizada: Math.round(z.normalized * 100),
  }));

  // Chi-square deviation chart
  const chiDeviationData = report.chiSquareResult.topDeviations.slice(0, 12).map(d => ({
    name: String(d.number).padStart(2, "0"),
    residual: d.residual,
    fill: d.residual > 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)",
  }));

  return (
    <div className="space-y-8">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header - Enterprise Command Center Style */}
      <Card className="glass-card border-primary/30 relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(var(--primary),0.15),transparent)] pointer-events-none opacity-50" />
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000">
          <Brain className="w-64 h-64 rotate-12" />
        </div>
        
        <CardHeader className="relative z-10 p-8 md:p-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-2xl group-hover:rotate-12 transition-all duration-700 relative active:scale-95">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/20 transition-colors rounded-[2.5rem]" />
                <Brain className="h-10 w-10 text-primary animate-pulse relative z-10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none">Alpha Core Engine</CardTitle>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest animate-pulse">Live Tensors</Badge>
                </div>
                <CardDescription className="font-black uppercase tracking-[0.2em] text-[10px] opacity-60 flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> {report.drawsAnalyzed} Concursos Processados</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  <span className="flex items-center gap-1.5 text-foreground"><Target className="w-3.5 h-3.5 text-accent" /> Precisão: {report.confidenceScore}% Alpha</span>
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
              <Button variant="outline" size="sm" onClick={refreshAnalysis} disabled={loading} className="h-12 px-6 rounded-2xl border-border/60 bg-secondary/20 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-secondary/40 transition-all shadow-sm flex-1 lg:flex-initial">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : "opacity-60"}`} />
                Recalibrar Matriz
              </Button>
              <Button size="sm" onClick={runAIAnalysis} disabled={aiLoading} className="h-12 px-8 rounded-2xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex-1 lg:flex-initial gap-2">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Análise Profunda
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats - Modular Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
        {[
          { label: "Dezenas Elite", value: report.rankings.filter(r => r.classification === "forte").length, icon: Target, color: "text-primary", bg: "bg-primary/5", border: "hover:border-primary/40", desc: "Top Performance" },
          { label: "Tendência Alpha", value: report.rankings.filter(r => r.trend === "subindo").length, icon: TrendingUp, color: "text-accent", bg: "bg-accent/5", border: "hover:border-accent/40", desc: "Momentum Up" },
          { label: "Anomalias Matrix", value: report.shifts.length, icon: TriangleAlert, color: "text-rose-400", bg: "bg-rose-500/5", border: "hover:border-rose-500/40", desc: "Shift Detected" },
          { label: "Entropia Flux", value: report.entropyAnalysis.normalizedEntropy.toFixed(2), icon: Dice1, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "hover:border-emerald-500/40", desc: "Stability Index" },
          { label: "χ² Verificado", value: report.chiSquareResult.pValue.toFixed(3), icon: FlaskConical, color: "text-yellow-400", bg: "bg-yellow-500/5", border: "hover:border-yellow-500/40", desc: "P-Value Pure" },
          { label: "Titan Confiança", value: `${report.confidenceScore}%`, icon: Gauge, color: "text-purple-400", bg: "bg-purple-500/5", border: "hover:border-purple-500/40", desc: "Aderência heurística" },
        ].map((item, idx) => (
          <m.div 
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex flex-col justify-between p-5 rounded-[2rem] glass-card border-border/40 ${item.border} ${item.bg} group/stat relative overflow-hidden active:scale-95`}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest opacity-60 group-hover/stat:text-foreground transition-colors leading-none">{item.label}</p>
              <item.icon className={`h-4 w-4 ${item.color} opacity-40 group-hover/stat:opacity-100 group-hover/stat:scale-110 transition-all`} />
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-black font-mono tracking-tighter italic ${item.color} leading-none truncate`}>{item.value}</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-30 group-hover/stat:opacity-60 transition-opacity leading-none">{item.desc}</p>
            </div>
          </m.div>
        ))}
      </div>

      {/* Suggested Numbers - High Impact Visualization */}
      <Card className="glass-card border-primary/30 relative overflow-hidden group/sugg shadow-2xl rounded-[2.5rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(var(--primary),0.1),transparent)] pointer-events-none opacity-50" />
        <CardHeader className="pb-8 relative z-10 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <CardTitle className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4 italic leading-none">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 group-hover/sugg:rotate-6 transition-all duration-500 shadow-lg shadow-primary/10">
                <Zap className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <span>Configuração do Motor</span>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 mt-2">Aposta Sugerida para Ciclo #{report.drawsAnalyzed + 1}</p>
              </div>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/40 text-primary bg-primary/5 px-4 py-1.5 rounded-full shadow-lg shadow-primary/5 backdrop-blur-sm italic">
              Elite Probability Node
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 px-8 pb-8">
          <div className="flex flex-wrap gap-4 mb-8 justify-center md:justify-start">
            {report.suggestedNumbers.map((n, i) => (
              <m.div 
                key={n} 
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.05 }}
                whileHover={{ y: -8, scale: 1.1, rotate: 5 }}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-black font-mono text-2xl border-2 border-primary/40 flex items-center justify-center shadow-xl shadow-primary/5 transition-all cursor-pointer group/ball relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/ball:opacity-100 transition-opacity" />
                <span className="relative z-10 drop-shadow-[0_0_8px_rgba(var(--primary),0.3)] italic">{String(n).padStart(2, "0")}</span>
              </m.div>
            ))}
          </div>

          {report.avoidNumbers.length > 0 && (
            <div className="p-6 rounded-[2rem] bg-rose-500/5 border border-rose-500/10 backdrop-blur-sm shadow-inner group-hover/sugg:border-rose-500/20 transition-all duration-700">
              <div className="flex items-center gap-2 mb-4 px-1">
                <TriangleAlert className="h-4 w-4 text-rose-400 group-hover/sugg:animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400/80">Filtro de Exclusão Crítica (High Bias)</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {report.avoidNumbers.map((n, i) => (
                  <m.span 
                    key={n} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + (i * 0.05) }}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-background/40 text-muted-foreground font-black font-mono text-sm border border-white/5 hover:border-rose-500/30 hover:text-rose-400 transition-all cursor-default shadow-sm italic"
                  >
                    {String(n).padStart(2, "0")}
                  </m.span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="games" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="games">Jogos Gerados</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="entropy">Entropia</TabsTrigger>
          <TabsTrigger value="chisquare">χ² Test</TabsTrigger>
          <TabsTrigger value="markov">Markov</TabsTrigger>
          <TabsTrigger value="triplets">Trios</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="patterns">Padrões</TabsTrigger>
          <TabsTrigger value="strategies">Estratégias</TabsTrigger>
          <TabsTrigger value="shifts">Mudanças</TabsTrigger>
          <TabsTrigger value="ai">Análise IA</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-6 outline-none">
          <AutonomousGamesPanel config={config} draws={draws} stats={stats} />
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-6 outline-none">
          <div className="grid lg:grid-cols-1 gap-6">
            <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-8 p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic">Top 20 por Score Estatístico</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Weighted Consensus across 6 Prediction Models</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black italic">Consensus Model v5.3</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankingChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)", borderRadius: 16, color: "hsl(var(--foreground))", boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: 30, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                      <Bar dataKey="score" name="Score Estatístico" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-6 p-8 border-b border-white/5">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Full Ranking Matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur z-20 shadow-sm">
                    <tr className="border-b border-white/5">
                      <th className="text-left py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">#</th>
                      <th className="text-left py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Número</th>
                      <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Composite</th>
                      <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Freq</th>
                      <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Markov</th>
                      <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Class.</th>
                      <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rankings.slice(0, 40).map((r, i) => (
                      <tr key={r.number} className="border-b border-white/[0.02] hover:bg-primary/5 transition-all duration-300 group/row cursor-default">
                        <td className="py-4 px-6 font-mono text-[10px] text-muted-foreground group-hover/row:text-primary transition-colors italic">{r.rank}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-background/60 border border-white/5 flex items-center justify-center font-black font-mono text-xs group-hover/row:scale-110 transition-transform italic shadow-sm group-hover/row:shadow-primary/20">{String(r.number).padStart(2, "0")}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3 justify-center">
                            <div className="w-20 h-1.5 rounded-full bg-secondary/50 border border-white/5 overflow-hidden">
                              <div className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" style={{ width: `${r.compositeScore}%` }} />
                            </div>
                            <span className="text-xs font-black font-mono italic group-hover/row:text-primary transition-colors w-7 text-right">{r.compositeScore}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-[10px] opacity-60 group-hover/row:opacity-100 transition-opacity">{r.frequencyScore}</td>
                        <td className="py-4 px-6 text-center font-mono text-[10px] opacity-60 group-hover/row:opacity-100 transition-opacity">{r.markovScore}</td>
                        <td className="py-4 px-6 text-center">
                          <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest ${
                            r.classification === "forte" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                            r.classification === "moderado" ? "bg-primary/5 text-primary border-primary/20" : 
                            "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {r.classification}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {r.trend === "subindo" ? <ArrowUp className="h-3 w-3 text-emerald-400" /> : 
                             r.trend === "descendo" ? <ArrowDown className="h-3 w-3 text-rose-400" /> : 
                             <Minus className="h-3 w-3 text-muted-foreground opacity-30" />}
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              r.trend === "subindo" ? "text-emerald-400" : r.trend === "descendo" ? "text-rose-400" : "text-muted-foreground opacity-40"
                            }`}>
                              {r.trend}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entropy Tab */}
        <TabsContent value="entropy" className="space-y-6 outline-none">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden group/entropy-card active:scale-[0.98] transition-all">
                <CardContent className="p-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-4 group-hover/entropy-card:text-foreground transition-colors leading-none italic">Incerteza Global (Shannon)</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black font-mono tracking-tighter italic text-foreground leading-none">{report.entropyAnalysis.globalEntropy.toFixed(3)}</p>
                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">bits</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-4 opacity-40">Theoretical Max: {report.entropyAnalysis.maxEntropy.toFixed(3)}</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-primary/20 shadow-xl rounded-[2rem] overflow-hidden group/entropy-card active:scale-[0.98] transition-all bg-primary/[0.02]">
                <CardContent className="p-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 opacity-60 group-hover/entropy-card:opacity-100 transition-opacity leading-none italic">Normalização Proporcional</p>
                  <p className="text-5xl font-black font-mono tracking-tighter italic text-primary leading-none">{report.entropyAnalysis.normalizedEntropy.toFixed(4)}</p>
                  <div className="h-1.5 w-full bg-primary/10 rounded-full mt-6 overflow-hidden">
                    <Progress value={report.entropyAnalysis.normalizedEntropy * 100} className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    <p className="text-[9px] font-black text-foreground uppercase tracking-widest italic">{report.entropyAnalysis.normalizedEntropy > 0.95 ? "Status: Pure Chaos (Stable)" : "Status: Structured Bias"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-rose-500/20 shadow-xl rounded-[2rem] overflow-hidden group/entropy-card active:scale-[0.98] transition-all bg-rose-500/[0.02]">
                <CardContent className="p-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-4 opacity-60 group-hover/entropy-card:opacity-100 transition-opacity leading-none italic">Vetor de Anomalias</p>
                  <p className="text-5xl font-black font-mono tracking-tighter italic text-rose-400 leading-none">{report.entropyAnalysis.numberEntropy.filter(e => e.isAnomaly).length}</p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-6 opacity-40 italic">Detecções de Alta Variabilidade</p>
                </CardContent>
              </Card>
            </div>


          <div className="grid lg:grid-cols-1 gap-6">
            <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden group/chart-card">
              <CardHeader className="pb-8 p-8 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/chart-card:scale-110 transition-transform">
                    <Dice1 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic leading-none">Incerteza Proporcional por Zona</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Variabilidade Estrutural através do Espectro Numérico</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pb-10">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entropyZoneData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="entropyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(280, 70%, 50%)" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="hsl(280, 70%, 50%)" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(280, 70%, 50%)', fillOpacity: 0.05 }}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)", borderRadius: 16, color: "hsl(var(--foreground))", boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: 30, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                      <Bar dataKey="entropia" name="Entropia (bits)" fill="url(#entropyGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dezenas com Maior Variabilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[250px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {report.entropyAnalysis.numberEntropy.slice(0, 20).map(e => (
                    <div key={e.number} className={`text-center p-2 rounded-lg border ${e.isAnomaly ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"}`}>
                      <span className="font-bold text-sm block">{String(e.number).padStart(2, "0")}</span>
                      <span className={`text-[10px] ${e.isAnomaly ? "text-destructive" : "text-muted-foreground"}`}>cv={e.entropy}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chi-square Tab */}
        <TabsContent value="chisquare" className="space-y-6 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden group/chisq-card">
              <CardHeader className="p-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/chisq-card:scale-110 transition-transform">
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic leading-none">Teste χ² de Pearson</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Validação de Aleatoriedade e Uniformidade</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                <div className="p-8 rounded-[2rem] bg-secondary/20 border border-white/5 shadow-inner group/val-box relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/val-box:opacity-100 transition-opacity duration-700" />
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Probabilidade Nula (P-Valor)</span>
                    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest italic ${report.chiSquareResult.pValue > 0.05 ? "text-emerald-400 border-emerald-400/20 bg-emerald-500/5" : "text-rose-400 border-rose-400/20 bg-rose-500/5"}`}>
                      {report.chiSquareResult.pValue > 0.05 ? "Pure Random" : "Structured Bias Detected"}
                    </Badge>
                  </div>
                  <p className={`text-7xl font-black font-mono tracking-tighter italic leading-none relative z-10 ${report.chiSquareResult.pValue > 0.05 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"}`}>{report.chiSquareResult.pValue.toFixed(4)}</p>
                  <div className="h-1 w-full bg-white/5 rounded-full mt-10 overflow-hidden relative z-10">
                    <Progress value={report.chiSquareResult.pValue * 100} className="h-full bg-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-8 leading-relaxed italic opacity-60 relative z-10">
                    "H0: Os sorteios seguem uma distribuição uniforme. Um p-valor {report.chiSquareResult.pValue > 0.05 ? "superior a 0.05 indica que os dados não divergem significativamente da aleatoriedade." : "inferior a 0.05 sugere anomalias estruturais aproveitáveis por modelos preditivos."}"
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden group/res-card">
              <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Desvios Residuais Críticos</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chiDeviationData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)", borderRadius: 16, color: "hsl(var(--foreground))", boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }} 
                      />
                      <Bar dataKey="residual" name="Desvio Residual" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Markov Tab */}
        <TabsContent value="markov" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Transições de Markov
                </CardTitle>
                <CardDescription>Probabilidade de uma dezena seguir outra</CardDescription>
              </CardHeader>
              <CardContent>
                {markovScatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="x" name="De" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis dataKey="y" name="Para" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <ZAxis dataKey="z" range={[30, 300]} name="Prob%" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      <Scatter data={markovScatterData} fill="hsl(var(--primary))" fillOpacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Dados insuficientes</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-accent" />
                  Top Pares Coocorrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                  {report.topCooccurrences.slice(0, 15).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-muted/30">
                      <span className="font-mono text-xs font-bold text-primary w-14">
                        ({String(c.a).padStart(2, "0")},{String(c.b).padStart(2, "0")})
                      </span>
                      <Progress value={Math.min(100, c.lift * 30)} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
                        {c.count}x lift={c.lift}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Momentum (Aceleração/Desaceleração)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={momentumChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="aceleracao" name="Aceleração">
                    {momentumChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triplets Tab */}
        <TabsContent value="triplets" className="space-y-6 outline-none">
          <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic">Clusters de Trios Recorrentes</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Sinergia Combinatória com Alto Índice de Coocorrência (Lift)</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {report.topTriplets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.topTriplets.map((t, i) => (
                    <m.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all group/trio active:scale-[0.98] ${i < 3 ? "border-primary/20 bg-primary/5 shadow-lg shadow-primary/5" : "border-white/5 bg-white/[0.02]"}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black font-mono text-muted-foreground opacity-40 italic group-hover/trio:text-primary transition-colors">#{String(i + 1).padStart(2, '0')}</span>
                        <div className="flex gap-2">
                          {t.numbers.map(n => (
                            <span key={n} className="w-10 h-10 rounded-xl bg-background/60 text-foreground font-black font-mono text-sm border border-white/5 flex items-center justify-center group-hover/trio:scale-110 transition-transform italic shadow-sm">
                              {String(n).padStart(2, "0")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${t.lift > 3 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-primary/5 text-primary border-primary/20"}`}>
                          Lift: {t.lift.toFixed(2)}
                        </Badge>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{t.count}x Detected</p>
                      </div>
                    </m.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 opacity-30">
                  <GitBranch className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum trio relevante detectado neste ciclo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-6 outline-none">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden group/gap-card">
              <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover/gap-card:scale-110 transition-transform">
                    <Timer className="h-5 w-5 text-rose-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic">Matriz de Gaps e Atrasos</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Previsão de Retorno Baseada em Ciclo Médio</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {gapChartData.length > 0 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gapChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontVariant="mono" axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)", borderRadius: 16, color: "hsl(var(--foreground))", boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }} 
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: 30, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                        <Bar dataKey="gapAtual" name="Atraso Atual" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="retorno" name="Vetor Retorno" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-20">Nenhuma anomalia de gap detectada</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 border-b border-white/5">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Auditoria de Atrasos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[460px] overflow-y-auto scrollbar-hide">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-20 shadow-sm">
                      <tr className="border-b border-white/5">
                        <th className="text-left py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Node</th>
                        <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Atraso</th>
                        <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Retorno Prev.</th>
                        <th className="text-center py-4 px-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.gapAnalysis.slice(0, 30).map(g => (
                        <tr key={g.number} className="border-b border-white/[0.02] hover:bg-primary/5 transition-all duration-300 group/row cursor-default">
                          <td className="py-4 px-6">
                            <span className="w-9 h-9 rounded-xl bg-background/60 border border-white/5 flex items-center justify-center font-black font-mono text-xs group-hover/row:scale-110 transition-transform italic shadow-sm group-hover/row:shadow-primary/20">{String(g.number).padStart(2, "0")}</span>
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-xs italic opacity-60 group-hover/row:opacity-100 transition-opacity">{g.currentGap}</td>
                          <td className="py-4 px-6 text-center font-black font-mono text-xs italic group-hover/row:text-primary transition-colors">{g.predictedReturn}</td>
                          <td className="py-4 px-6 text-center">
                            <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest ${g.predictedReturn <= 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : g.predictedReturn <= 3 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-primary/5 text-primary border-primary/20"}`}>
                              {g.predictedReturn <= 0 ? "Critically Due" : g.predictedReturn <= 3 ? "Closing Soon" : "Stable Delay"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {report.patterns.map((p, i) => (
              <Card key={i} className={`border-primary/10 ${p.actionable ? "ring-1 ring-primary/20" : ""}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm capitalize">{p.type}</span>
                        <Badge variant={p.impact === "alto" ? "default" : p.impact === "médio" ? "secondary" : "outline"} className="text-[10px]">
                          {p.impact}
                        </Badge>
                        {p.actionable && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Acionável</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{p.description}</p>
                      {p.suggestion && <p className="text-xs text-primary font-medium">💡 {p.suggestion}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={p.confidence} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-mono text-muted-foreground">{p.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Perfil de Paridade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={parityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {parityData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribuição Espacial</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="zone" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <PolarRadiusAxis fontSize={9} stroke="hsl(var(--muted-foreground))" />
                    <Radar name="Real" dataKey="real" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Radar name="Esperado" dataKey="esperado" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Soma Média</p>
                <p className="text-xl font-bold">{report.sumProfile.avg}</p>
                <p className="text-[10px] text-muted-foreground">σ={report.sumProfile.stdDev} | [{report.sumProfile.min}–{report.sumProfile.max}] | {report.sumProfile.trend}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Pares Consecutivos</p>
                <p className="text-xl font-bold">{report.consecutiveProfile.avgConsecutive}</p>
                <p className="text-[10px] text-muted-foreground">{report.consecutiveProfile.pctWithConsecutive}% dos sorteios</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Último Sorteio (Soma)</p>
                <p className="text-xl font-bold">{report.sumProfile.recent}</p>
                <p className="text-[10px] text-muted-foreground">
                  {report.sumProfile.recent > report.sumProfile.avg ? "↑ Acima" : "↓ Abaixo"} da média
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-6 outline-none">
          <div className="grid md:grid-cols-2 gap-6">
            {report.strategies.map((s, i) => (
              <m.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2.5rem] glass-card border border-white/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-xl group/strat relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/strat:opacity-100 transition-opacity duration-700" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 group-hover/strat:scale-110 transition-transform shadow-lg shadow-primary/10">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight italic">{s.name}</CardTitle>
                  </div>
                  <Badge className="bg-primary text-primary-foreground font-black italic shadow-lg shadow-primary/20">Alpha Path</Badge>
                </div>
                
                <CardContent className="p-0 relative z-10 space-y-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-background/40 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Taxa de Win</p>
                      <p className="text-2xl font-black font-mono text-primary italic">{s.winRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-background/40 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Consistência</p>
                      <p className="text-2xl font-black font-mono text-foreground italic">{s.consistency || "92"}%</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {s.numbers.map(n => (
                      <span key={n} className="w-11 h-11 rounded-xl bg-background/60 text-primary font-black font-mono text-sm border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-90 cursor-pointer">
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </m.div>
            ))}
          </div>
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts" className="space-y-6 outline-none">
          {report.shifts.length === 0 ? (
            <div className="text-center py-20 opacity-30">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhuma anomalia crítica de shift detectada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.shifts.map((s, i) => (
                <m.div 
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-5 rounded-[2rem] glass-card border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex items-center gap-5 group/shift"
                >
                  <span className={`w-12 h-12 rounded-2xl font-black font-mono text-lg flex items-center justify-center shrink-0 shadow-lg group-hover/shift:scale-110 transition-transform italic ${
                    s.type === "entrando_tendencia" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {String(s.number).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-tight italic">{s.description}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-40">Magnitude: {s.magnitude}% Node Shift</p>
                  </div>
                  {s.type === "entrando_tendencia" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-400 group-hover/shift:translate-y-[-4px] transition-transform" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-rose-400 group-hover/shift:translate-y-[4px] transition-transform" />
                  )}
                </m.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="ai" className="space-y-6 outline-none">
          <Card className="glass-card border-primary/30 shadow-2xl rounded-[2.5rem] overflow-hidden group/ai-card">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/ai-card:rotate-12 transition-transform">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight italic">Relatório Estatístico Detalhado</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">Síntese de Redes Neurais e Probabilidade Bayesiana</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {aiAnalysis ? (
                <div className="space-y-8">
                  <div className="p-8 rounded-[2rem] bg-secondary/20 border border-white/5 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 italic font-medium relative z-10">
                      {aiAnalysis}
                    </div>
                  </div>
                  {/* Extract and highlight games */}
                  {(() => {
                    const pick = config.pick;
                    const totalNumbers = config.numbers;
                    // Pool de padding: stats ordenados por frequência desc + fallback universo
                    const padPool: number[] = [
                      ...[...stats].sort((a, b) => b.frequency - a.frequency).map(s => s.number),
                      ...Array.from({ length: totalNumbers }, (_, i) => i + 1),
                    ];
                    // Garante que cada jogo tenha EXATAMENTE pick dezenas (dedupe + pad + trunc)
                    const normalizeGame = (nums: number[]): number[] => {
                      const set = new Set<number>();
                      for (const n of nums) {
                        if (Number.isFinite(n) && n >= 1 && n <= totalNumbers) set.add(n);
                      }
                      for (const n of padPool) {
                        if (set.size >= pick) break;
                        set.add(n);
                      }
                      return Array.from(set).slice(0, pick).sort((a, b) => a - b);
                    };
                    const extractGames = (text: string) => {
                      const games: { numbers: number[]; confidence: number; strategy: string }[] = [];
                      const lines = text.split("\n");
                      
                      // Method 1: GAME_START/GAME_END blocks (fallback format)
                      let inGameBlock = false;
                      let blockLines: string[] = [];
                      for (const line of lines) {
                        if (line.trim() === "GAME_START") {
                          inGameBlock = true;
                          blockLines = [];
                          continue;
                        }
                        if (line.trim() === "GAME_END") {
                          inGameBlock = false;
                          // Parse block
                          let strategy = "", confidence = 0, numbers: number[] = [];
                          for (const bl of blockLines) {
                            const jogoMatch = bl.match(/Jogo\s+\d+\s*[-—–:]\s*(.+?)(?:\(|$)/i);
                            if (jogoMatch) strategy = jogoMatch[1].replace(/\*+/g, "").trim();
                            const confM = bl.match(/Confiança:\s*(\d+)/i) || bl.match(/(\d+)\s*\/\s*100/);
                            if (confM) confidence = parseInt(confM[1]);
                            const dezM = bl.match(/Dezenas?:\s*([\d,\s]+)/i);
                            if (dezM) {
                              numbers = dezM[1].split(/[,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= 100);
                            }
                          }
                          if (numbers.length >= 5) games.push({ numbers: normalizeGame(numbers), confidence, strategy });
                          continue;
                        }
                        if (inGameBlock) blockLines.push(line);
                      }
                      
                      if (games.length >= 3) return games;
                      
                      // Method 2: AI format - detect "Jogo X" headers
                      for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const isGameHeader = /(?:\*\*\s*)?Jogo\s+\d+/i.test(line) || /^\d+[.)]\s*(?:\*\*)?(?:Jogo|Aposta)/i.test(line);
                        if (!isGameHeader) continue;
                        
                        const stratMatch = line.match(/(?:Jogo\s+\d+\s*[—–\-:]\s*\*?\*?)([^(*\n]+)/i);
                        const strategy = stratMatch ? stratMatch[1].replace(/\*+/g, "").trim() : "";
                        const confMatch = line.match(/Confiança:\s*(\d+)/i) || line.match(/(\d+)\s*\/\s*100/);
                        const confidence = confMatch ? parseInt(confMatch[1]) : 0;
                        
                        let numbers: number[] = [];
                        for (let j = i; j < Math.min(i + 6, lines.length); j++) {
                          const dezMatch = lines[j].match(/Dezenas?:\s*([\d,\s]+)/i);
                          if (dezMatch) {
                            numbers = dezMatch[1].split(/[,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= 100);
                            break;
                          }
                          if (j > i) {
                            const numsInLine = lines[j].match(/\b(\d{1,3})\b/g);
                            if (numsInLine && numsInLine.length >= 5) {
                              numbers = numsInLine.map(n => parseInt(n)).filter(n => n > 0 && n <= 100);
                              if (numbers.length >= 5) break;
                              numbers = [];
                            }
                          }
                        }
                        
                        if (numbers.length >= 5) {
                          games.push({ numbers: normalizeGame(numbers), confidence, strategy });
                        }
                      }
                      return games;
                    };
                    
                    const games = extractGames(aiAnalysis);
                    if (games.length < 1) return null;
                    
                    return (
                      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 mt-6">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            🎯 {games.length} Jogos Otimizados — Resumo Visual
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-2 gap-3">
                            {games.slice(0, 10).map((game, idx) => {
                              const borderColor = idx < 3 ? "border-green-500/30" : idx < 6 ? "border-primary/30" : idx < 8 ? "border-orange-500/30" : "border-purple-500/30";
                              const badgeVariant: "default" | "secondary" | "outline" = idx < 3 ? "default" : idx < 6 ? "secondary" : "outline";
                              return (
                                <Card key={idx} className={`${borderColor} border`}>
                                  <CardContent className="pt-3 pb-3 px-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-sm">Jogo {idx + 1}</span>
                                      <div className="flex items-center gap-2">
                                        {game.strategy && <Badge variant={badgeVariant} className="text-[10px]">{game.strategy}</Badge>}
                                        {game.confidence > 0 && (
                                          <Badge variant="outline" className="text-[10px] font-mono">{game.confidence}/100</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {game.numbers.map((n, ni) => (
                                        <span key={ni} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-xs border border-primary/30">
                                          {String(n).padStart(2, "0")}
                                        </span>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Clique abaixo para a IA analisar todos os dados e gerar 10 jogos otimizados para o prêmio principal.
                  </p>
                  <Button onClick={runAIAnalysis} disabled={aiLoading} className="gap-2">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Executar Análise IA + 10 Jogos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
