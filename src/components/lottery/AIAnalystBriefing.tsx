import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  BarChart3,
  Cpu,
  Fingerprint,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BriefingProps {
  game?: number[];
  score?: number;
  confidence?: number;
  strategy?: string;
  reasons: string[];
  lotteryName?: string;
  onClose?: () => void;
}

export const AIAnalystBriefing = ({ game, score, confidence, strategy, reasons, lotteryName, onClose }: BriefingProps) => {
  const finalScore = score ?? confidence ?? 85;
  const displayStrategy = strategy ?? "Análise Multicritério";
  
  return (
    <m.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full mx-auto overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl"
    >
      {/* Header */}
      <div className="relative p-6 pb-4">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain className="w-16 h-16 text-primary" />
        </div>
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-mono text-[9px] uppercase tracking-widest px-2">
              Análise Estatística
            </Badge>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-foreground leading-none">
            Análise de <span className="gradient-brand-text">Inteligência</span> Titan
          </h2>
          {lotteryName && (
            <p className="text-[10px] text-muted-foreground font-medium max-w-md">
              Processamento de convergência estatística para a {lotteryName}.
            </p>
          )}
        </div>
      </div>

      <div className="p-6 pt-2 space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Confiança</span>
              <Cpu className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black italic tabular-nums text-primary leading-none">{finalScore}%</p>
              <Progress value={finalScore} className="h-1 bg-primary/20" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estratégia</span>
              <Target className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-sm font-black italic text-foreground leading-tight truncate">{displayStrategy}</p>
            <div className="flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[8px] font-bold text-emerald-400 uppercase">Verificado</span>
            </div>
          </div>
        </div>

        {/* Reasons List */}
        <div className="space-y-3">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Insights de Probabilidade
          </h3>
          
          <div className="grid gap-2">
            {reasons.slice(0, 3).map((reason, idx) => (
              <m.div 
                key={idx}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-white/5 group hover:border-primary/40 transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-background border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <Fingerprint className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-[11px] font-bold text-foreground/90 leading-tight">{reason}</p>
                <ChevronRight className="w-3.5 h-3.5 text-primary ml-auto opacity-40" />
              </m.div>
            ))}
          </div>
        </div>

        {/* Insight Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 relative overflow-hidden group">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-primary">Core Insight</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic line-clamp-2">
                Análises baseadas em dados históricos, estatística, probabilidade e inteligência artificial. Sem garantia de ganhos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
};
