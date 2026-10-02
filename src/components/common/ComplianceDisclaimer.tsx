import { AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  compact?: boolean;
}

export function ComplianceDisclaimer({ compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span>Dados históricos — sem garantia de premiação.</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 px-6 py-5 rounded-2xl glass-card border-amber-500/20 shadow-premium"
    >
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <ShieldCheck className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] italic text-amber-500 drop-shadow-sm">
          Aviso de Transparência Profissional
        </p>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed italic font-medium">
          O Titan utiliza rigor estatístico baseado em evidências históricas reais. 
          <strong className="text-foreground font-black"> Não há garantia de premiação.</strong> Este sistema é uma ferramenta de suporte à decisão de elite. Jogue com responsabilidade.
        </p>
      </div>
    </motion.div>
  );
}
