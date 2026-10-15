import React from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { motion } from "framer-motion";
import { 
  Flame, 
  Snowflake, 
  TrendingUp, 
  TrendingDown, 
  CircleDot,
  Activity,
  Zap
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export function HeatmapInteligente() {
  const { farol, config } = useLotteryContext();

  if (!farol || farol.length === 0) return null;

  const getHeatColor = (s: any) => {
    // Combine Titan Score and Trend
    if (s.titanScore >= 90) return "bg-primary shadow-[0_0_20px_rgba(var(--primary),0.6)] border-primary";
    if (s.titanScore >= 70) return "bg-primary/60 border-primary/40 text-white";
    if (s.titanScore >= 40) return "bg-amber-500/40 border-amber-500/30 text-amber-100";
    return "bg-slate-800/40 border-white/5 text-slate-400 opacity-60";
  };

  const getTrendIndicator = (s: any) => {
    if (s.trend > 15) return <TrendingUp className="w-2.5 h-2.5 text-primary absolute top-1 right-1" />;
    if (s.trend < -15) return <TrendingDown className="w-2.5 h-2.5 text-destructive absolute top-1 right-1" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 italic">
          <Activity className="w-4 h-4 text-primary" />
          Mapa Térmico de Cobertura
        </h3>
        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-primary" /> Elite</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-primary/60" /> Forte</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-amber-500/40" /> Médio</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-slate-800/40" /> Fraco</div>
        </div>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-13 gap-2">
          {farol.map((s, idx) => (
            <Tooltip key={s.number}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center cursor-help transition-all hover:scale-110 hover:z-10 ${getHeatColor(s)}`}
                >
                  <span className="text-sm font-black font-mono">{String(s.number).padStart(2, '0')}</span>
                  <span className="text-[7px] font-bold opacity-60 mt-0.5">{s.titanScore}%</span>
                  {getTrendIndicator(s)}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent className="glass-panel border-primary/20 p-4 space-y-3 w-64">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-xl font-black font-mono">
                      {s.number}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase">Titan Score</p>
                      <p className="text-lg font-black text-primary font-mono">{s.titanScore}%</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{s.titanGrade}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[9px] uppercase font-bold tracking-widest">
                  <div className="space-y-1">
                    <p className="text-muted-foreground opacity-60">Frequência</p>
                    <p>{s.historicalFreq} vezes</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground opacity-60">Atraso</p>
                    <p className={s.currentDelay > 5 ? "text-primary" : ""}>{s.currentDelay} concursos</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground opacity-60">Últimos 10</p>
                    <p>{s.recentFreq10} saídas</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground opacity-60">Tendência</p>
                    <p className={s.trend > 0 ? "text-primary" : "text-destructive"}>{s.trend > 0 ? "+" : ""}{s.trend.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-2">Correlações Fortes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.correlations.slice(0, 3).map(c => (
                      <Badge key={c.number} variant="secondary" className="text-[8px] font-mono py-0">
                        {c.number} ({c.percentage.toFixed(0)}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
