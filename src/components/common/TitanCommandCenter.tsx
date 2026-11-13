import { useMemo } from "react";
import { motion } from "framer-motion";
import { Terminal, Activity, Zap, ShieldCheck, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLotteryContextSafe } from "@/contexts/LotteryContext";
import { calculatePredictiveEntropy } from "@/engine/ai/predictive-entropy";

export const TitanCommandCenter = () => {
  const ctx = useLotteryContextSafe();
  const draws = ctx?.draws ?? [];
  const stats = ctx?.stats ?? [];

  const entropyData = useMemo(() => {
    return calculatePredictiveEntropy(stats, draws);
  }, [stats, draws]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-primary/25 p-6 sm:p-8 bg-card/60 backdrop-blur-xl relative overflow-hidden group"
    >
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural-web" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-web)" />
        </svg>
      </div>

      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none">
        <Cpu className="w-24 h-24 text-primary" />
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5 tracking-tight">
            <Terminal className="w-5 h-5 text-primary" />
            Central <span className="text-primary">Quantitativa</span> Titan
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indicadores históricos ilustrativos; consulte os dados e a atualização na área autenticada
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-[11px]">
            PAINEL: DEMONSTRATIVO
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[11px]">
            FONTE: CONSULTE RESULTADOS
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[11px]">
            INTEGRIDADE: NÃO VERIFICADA AQUI
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" /> Tendência de Frequência
            </span>
            <span className="text-xs font-mono text-emerald-400">ESTÁVEL</span>
          </div>
          <div className="h-24 flex items-end gap-1.5 pt-2">
            {[45, 70, 50, 85, 60, 78, 55, 90, 80, 65, 75, 60].map((h, i) => (
              <div 
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 bg-primary/40 hover:bg-primary/70 rounded-t-sm transition-all"
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" /> Cobertura Matemática
            </span>
            <span className="text-xs font-mono text-primary font-bold">DEPENDE DA MATRIZ</span>
          </div>
          <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 h-24 flex flex-col justify-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              A verificação pode ser exaustiva ou amostral. Consulte as condições e o relatório de cada matriz gerada.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Sobre este painel
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">INFORMATIVO</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este painel não apresenta telemetria ou auditoria em tempo real. Resultados passados não predizem sorteios futuros.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
