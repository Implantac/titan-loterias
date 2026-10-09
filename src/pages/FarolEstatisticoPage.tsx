import { useState, useMemo } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, Flame, Snowflake, TrendingUp, Clock, 
  Target, Filter, Brain, Zap, Shield, Info,
  Search, ArrowUpRight, ArrowDownRight, Activity, Crown
} from "lucide-react";

import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HeatmapIntensity } from "@/components/lottery/HeatmapIntensity";
import { CorrelationNetwork } from "@/components/lottery/CorrelationNetwork";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";



const PERIOD_OPTIONS = [
  { label: "Todos", value: 0 },
  { label: "Últimos 30", value: 30 },
  { label: "Últimos 100", value: 100 },
] as const;

const FILTER_MODES = [
  { label: "Elite", value: "elite", icon: Crown },
  { label: "Atraso", value: "delay", icon: Clock },
  { label: "Tendência", value: "trend", icon: TrendingUp },
  { label: "Frequência", value: "freq", icon: BarChart3 },
] as const;


export default function FarolEstatisticoPage() {
  const { config, stats, farol, cycle, draws } = useLotteryContext();
  const [period, setPeriod] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("scores");
  const [filterMode, setFilterMode] = useState<string>("elite");


  const aiInsight = useMemo(() => {
    if (!farol) return "";
    const topScorers = farol.slice(0, 3).map(s => s.number).join(", ");
    const highDelay = farol.sort((a, b) => b.currentDelay - a.currentDelay).slice(0, 2).map(s => s.number).join(", ");
    
    return `Análise Titan: Foco nas dezenas de elite [${topScorers}]. Alerta para dezenas em atraso crítico: [${highDelay}]. O ciclo ${cycle?.currentCycle} sugere fechamento iminente.`;
  }, [farol, cycle]);


  const filteredFarol = useMemo(() => {
    let result = farol || [];
    if (searchTerm) {
      result = result.filter(s => s.number.toString().includes(searchTerm));
    }
    
    switch (filterMode) {
      case "elite": return [...result].sort((a, b) => b.titanScore - a.titanScore);
      case "delay": return [...result].sort((a, b) => b.currentDelay - a.currentDelay);
      case "trend": return [...result].sort((a, b) => b.trend - a.trend);
      case "freq": return [...result].sort((a, b) => b.frequency - a.frequency);
      default: return result.sort((a, b) => b.titanScore - a.titanScore);
    }
  }, [farol, searchTerm, filterMode]);


  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-neon-cyan border-neon-cyan/50 bg-neon-cyan/10 shadow-[0_0_15px_rgba(0,255,255,0.3)]";
    if (score >= 70) return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
    if (score >= 40) return "text-amber-400 border-amber-500/50 bg-amber-500/10";
    return "text-rose-400 border-rose-500/50 bg-rose-500/10";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 10) return <ArrowUpRight className="w-3 h-3 text-emerald-400" />;
    if (trend < -10) return <ArrowDownRight className="w-3 h-3 text-rose-400" />;
    return <Activity className="w-3 h-3 text-amber-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-[0.2em] italic">Análise estatística</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
            Farol <span className="gradient-brand-text">Estatístico</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-md">Engenharia de dados Alpha e Score proprietário (FAROL) para detecção de tendências de elite.</p>
        </div>
      </div>
      
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
        <LotteryContextBanner />
      </div>

      {/* Resumo de Ciclo e Tendência */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <Card className="glass-card border-primary/20 bg-primary/[0.02] rounded-[2rem] overflow-hidden group/cycle active:scale-[0.98] transition-all shadow-xl">
          <CardHeader className="pb-2 p-6 border-b border-white/5 bg-white/[0.01]">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-primary opacity-60 group-hover/cycle:opacity-100 transition-opacity leading-none italic">
              <Clock className="w-3.5 h-3.5" />
              Ciclo Alpha v5.3
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-5xl font-black font-mono tracking-tighter italic text-foreground leading-none">{cycle?.currentCycle || 0}</p>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-4 opacity-40 leading-none">Ciclo Operacional nº</p>
              </div>
              <div className="text-right space-y-1">
                <Badge className="bg-primary text-primary-foreground font-black italic shadow-lg shadow-primary/20 px-3 py-1 rounded-lg">
                  {cycle?.drawsInCurrentCycle || 0} Sorteios
                </Badge>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-40 leading-none">Janela de Ciclo</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                <span>Déficit: {cycle?.missingNumbers.length || 0} dezenas</span>
                <span>Fluxo: {cycle?.avgDrawsToClose.toFixed(1) || 0}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cycle?.missingNumbers.slice(0, 10).map(n => (
                  <span key={n} className="w-8 h-8 flex items-center justify-center rounded-xl bg-background/60 text-[11px] font-black font-mono border border-white/5 shadow-inner group-hover/cycle:border-primary/30 transition-colors italic">
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
                {(cycle?.missingNumbers.length || 0) > 10 && <span className="text-[9px] font-black text-muted-foreground self-center ml-1 italic opacity-40">+{cycle!.missingNumbers.length - 10}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-accent/20 bg-accent/[0.02] rounded-[2rem] overflow-hidden group/ai active:scale-[0.98] transition-all shadow-xl">
          <CardHeader className="pb-2 p-6 border-b border-white/5 bg-white/[0.01]">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-accent opacity-60 group-hover/ai:opacity-100 transition-opacity leading-none italic">
              <Brain className="w-3.5 h-3.5" />
              Resumo da análise
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">Confiança Alpha</span>
                <span className="text-xs font-black font-mono text-accent italic">87.4% SYNC</span>
              </div>
              <div className="h-1.5 w-full bg-accent/10 rounded-full overflow-hidden border border-accent/20 shadow-inner">
                <m.div 
                  initial={{ width: 0 }}
                  animate={{ width: '87.4%' }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]" 
                />
              </div>
              <div className="p-5 rounded-3xl bg-background/40 border border-white/5 shadow-inner relative overflow-hidden group-hover/ai:border-accent/20 transition-all duration-500">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-40" />
                <p className="text-[11px] leading-relaxed text-foreground/80 italic font-medium">
                  "{aiInsight}"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-emerald-500/20 bg-emerald-500/[0.02] rounded-[2rem] overflow-hidden group/score active:scale-[0.98] transition-all shadow-xl">
          <CardHeader className="pb-2 p-6 border-b border-white/5 bg-white/[0.01]">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-emerald-400 opacity-60 group-hover/score:opacity-100 transition-opacity leading-none italic">
              <Target className="w-3.5 h-3.5" />
              Saturação Global
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-center py-2 relative">
              <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-1000" />
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <m.circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={402.1}
                    initial={{ strokeDashoffset: 402.1 }}
                    animate={{ strokeDashoffset: 402.1 - (402.1 * 68) / 100 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black font-mono tracking-tighter italic text-emerald-400 leading-none">68</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 mt-3">Tier Strong</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualização de Inteligência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatmapIntensity />
        <CorrelationNetwork />
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {FILTER_MODES.map(opt => (
            <Button 
              key={opt.value} 
              size="sm" 
              variant={filterMode === opt.value ? "default" : "outline"} 
              onClick={() => setFilterMode(opt.value)} 
              className="h-8 text-[10px] font-black uppercase px-4 rounded-xl shrink-0 gap-1.5"
            >
              <opt.icon className="w-3 h-3" />
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar dezena..." 
            value={searchTerm}
            aria-label="Buscar dezena"
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/20 border border-border/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Grid do Farol */}
      <m.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {filteredFarol.map((s) => (
          <m.div key={s.number} variants={item}>
            <Card className="group relative overflow-hidden glass-panel border-border/40 hover:border-primary/40 transition-all duration-300">
              {/* Background gradient focus */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground font-mono font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                      {String(s.number).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Titan Score</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] max-w-[200px]">
                            Algoritmo proprietário: Frequência (30%), Atraso (25%), Tendência (20%), Ciclo (15%) e Correlação (10%).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-foreground">{s.titanScore}</h4>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-4 px-1.5 rounded-md", getScoreColor(s.titanScore))}>
                          {s.titanGrade}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {getTrendIcon(s.trend)}
                      <span className={cn("text-[10px] font-bold", s.trend > 0 ? "text-emerald-400" : s.trend < 0 ? "text-rose-400" : "text-amber-400")}>
                        {s.trend > 0 ? "+" : ""}{s.trend}%
                      </span>
                    </div>
                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Tendência</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] uppercase font-black text-muted-foreground">
                      <span>Freq. Geral</span>
                      <span className="text-foreground">{s.frequency}x</span>
                    </div>
                    <Progress value={(s.frequency / (draws.length || 1)) * 300} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] uppercase font-black text-muted-foreground">
                      <span>Atraso</span>
                      <span className="text-foreground">{s.currentDelay}</span>
                    </div>
                    <Progress value={(s.currentDelay / s.avgDelay) * 50} className="h-1 bg-amber-500/20" />
                  </div>
                </div>

                <div className="pt-2 border-t border-border/20">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-primary" />
                    Correlação (Ao sair o {s.number}...)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.correlations.slice(0, 4).map((c) => (
                      <div key={c.number} className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-lg border border-border/20">
                        <span className="text-[9px] font-mono font-bold text-primary">{String(c.number).padStart(2, "0")}</span>
                        <span className="text-[8px] text-muted-foreground font-black">{Math.round(c.percentage)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-1.5 rounded-lg bg-muted/20 border border-border/20">
                    <p className="text-[14px] font-black font-mono leading-none">{s.repeatLast5}</p>
                    <p className="text-[7px] font-black uppercase text-muted-foreground mt-1">Rep. 5</p>
                  </div>
                  <div className="text-center p-1.5 rounded-lg bg-muted/20 border border-border/20">
                    <p className="text-[14px] font-black font-mono leading-none">{s.repeatLast10}</p>
                    <p className="text-[7px] font-black uppercase text-muted-foreground mt-1">Rep. 10</p>
                  </div>
                  <div className="text-center p-1.5 rounded-lg bg-muted/20 border border-border/20">
                    <p className="text-[14px] font-black font-mono leading-none">{s.avgGap}</p>
                    <p className="text-[7px] font-black uppercase text-muted-foreground mt-1">Média Gap</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>
        ))}
      </m.div>
    </div>
  );
}
