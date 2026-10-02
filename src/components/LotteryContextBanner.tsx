import { useLotteryContext } from "@/contexts/LotteryContext";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export function LotteryContextBanner() {
  const { config, draws, loading } = useLotteryContext();

  return (
    <motion.div
      key={config.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl glass-card border-primary/20 bg-primary/5 relative overflow-hidden group/banner"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover/banner:opacity-100 transition-opacity duration-700" />
      
      <div className="w-12 h-12 rounded-xl bg-background/50 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner group-hover/banner:rotate-6 transition-transform duration-500 relative z-10 ring-1 ring-primary/10">
        <span className="text-2xl drop-shadow-sm">{config.icon}</span>
      </div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-3">
          <p className="text-sm font-black text-foreground uppercase tracking-wider italic leading-none">{config.name}</p>
          <div className="h-4 w-px bg-border/40" />
          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] border-primary/30 text-primary bg-primary/5 px-2 py-0.5 rounded-lg shadow-sm shadow-primary/5">
            {config.pick} / {config.numbers} Alpha
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`} />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-80">
              {loading ? "Sincronizando Core..." : draws.length > 0 ? "Dados sincronizados" : "Aguardando Data"}
            </p>
          </div>
          <span className="w-1 h-1 rounded-full bg-border" />
          <p className="text-[10px] font-mono font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
            {draws.length.toLocaleString()} Tensors Indexed
          </p>
        </div>
      </div>
    </motion.div>
  );
}
