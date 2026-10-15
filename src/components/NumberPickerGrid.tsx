import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { NumberStats } from "@/engine/stats/statistics";
import { LotteryConfig } from "@/data/lotteries";
import { Grid3X3, RotateCcw, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSmartBet } from "@/engine/stats/statistics";
import { toast } from "sonner";

interface Props {
  config: LotteryConfig;
  stats: NumberStats[];
  onSaveBet?: (numbers: number[]) => void;
}

export function NumberPickerGrid({ config, stats, onSaveBet }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((n: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else {
        if (next.size >= config.pick) {
          toast.error(`Máximo de ${config.pick} números`);
          return prev;
        }
        next.add(n);
      }
      return next;
    });
  }, [config.pick]);

  const clear = () => setSelected(new Set());

  const autoFill = () => {
    const bet = generateSmartBet(stats, config.pick);
    setSelected(new Set(bet));
  };

  const handleSave = () => {
    if (selected.size !== config.pick) {
      toast.error(`Selecione exatamente ${config.pick} números`);
      return;
    }
    const numbers = [...selected].sort((a, b) => a - b);
    onSaveBet?.(numbers);
  };

  const copyBet = () => {
    if (selected.size === 0) return;
    const numbers = [...selected].sort((a, b) => a - b);
    navigator.clipboard.writeText(numbers.join(" - "));
    toast.success("Números copiados!");
  };

  // Calculate grid columns based on total numbers
  const cols = config.numbers <= 31 ? 8 : config.numbers <= 50 ? 10 : config.numbers <= 80 ? 10 : 10;

  return (
    <div className="rounded-2xl glass-card p-6 space-y-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-transparent pointer-events-none" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-6 transition-transform duration-500">
            <Grid3X3 className="w-6 h-6 text-neon-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest italic flex items-center gap-2">
              Seletor de Cobertura
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest opacity-60">
              {selected.size} de {config.pick} Ativos • Grid Dinâmica
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={clear} className="h-9 px-4 rounded-xl border-border/40 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground font-black uppercase tracking-widest text-[9px] transition-all">
            <RotateCcw className="w-3 h-3 mr-1.5" /> Limpar
          </Button>
          <Button size="sm" variant="outline" onClick={autoFill} className="h-9 px-4 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[9px] transition-all">
            <Sparkles className="w-3 h-3 mr-1.5" /> Auto-Fill
          </Button>
        </div>
      </div>


      {/* Progress bar */}
      <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden border border-border/40 relative">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-neon-cyan rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]"
          animate={{ width: `${(selected.size / config.pick) * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </div>


      {/* Grid */}
      <div
        className="grid gap-2 relative z-10"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: config.numbers }, (_, i) => i + 1).map(n => {
          const stat = stats.find(s => s.number === n);
          const isSelected = selected.has(n);
          const isHot = stat?.status === "hot";
          const isCold = stat?.status === "cold";

          return (
            <motion.button
              key={n}
              whileTap={{ scale: 0.9 }}
              whileHover={{ y: -1 }}
              onClick={() => toggle(n)}
              className={`
                relative aspect-square rounded-xl text-xs font-black font-mono
                flex items-center justify-center transition-all duration-300
                border-2 shadow-sm shadow-black/20
                ${isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/30 scale-110 z-10 italic"
                  : isHot
                    ? "bg-neon-red/10 text-neon-red border-neon-red/40 hover:bg-neon-red/20 hover:border-neon-red/60 hover:shadow-neon-red/20"
                    : isCold
                      ? "bg-neon-blue/10 text-neon-blue border-neon-blue/40 hover:bg-neon-blue/20 hover:border-neon-blue/60 hover:shadow-neon-blue/20"
                      : "bg-secondary/20 text-foreground/70 border-border/40 hover:bg-secondary/40 hover:text-foreground hover:border-border/60"
                }
              `}
            >
              {String(n).padStart(2, "0")}
              {isHot && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon-red border-2 border-background animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.5)]" />
              )}
              {isCold && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon-blue border-2 border-background animate-pulse shadow-[0_0_8px_rgba(0,180,255,0.5)]" />
              )}
            </motion.button>
          );
        })}
      </div>


      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest opacity-60">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon-red shadow-[0_0_8px_rgba(255,0,0,0.5)]" /> HOT
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,180,255,0.5)]" /> COLD
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" /> ACTIVE
        </span>
      </div>


      {/* Actions */}
      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
          <Button size="sm" variant="outline" onClick={copyBet} className="h-10 px-6 rounded-xl border-border/40 bg-secondary/20 hover:bg-secondary/40 text-foreground font-black uppercase tracking-widest text-[10px] transition-all flex-1 italic truncate">
            {Array.from(selected).sort((a,b)=>a-b).join(" - ")}
          </Button>
          {onSaveBet && selected.size === config.pick && (
            <Button size="sm" onClick={handleSave} className="h-10 px-8 rounded-xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Save className="w-4 h-4 mr-2" /> Salvar Matriz
            </Button>
          )}
        </div>
      )}

    </div>
  );
}
