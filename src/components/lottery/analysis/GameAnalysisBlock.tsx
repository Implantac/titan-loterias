import { NumberStats } from "@/engine/stats/statistics";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, ChevronDown, ChevronUp, Flame, Snowflake, RefreshCw, Hash, Target } from "lucide-react";
import { useState } from "react";

interface Props {
  numbers: number[];
  stats: NumberStats[];
  config: LotteryConfig;
  draws: DrawResult[];
  defaultOpen?: boolean;
}

function computeGameAnalysis(numbers: number[], stats: NumberStats[], config: LotteryConfig, draws: DrawResult[]) {
  const gameStats = numbers.map(n => stats.find(s => s.number === n)).filter(Boolean) as NumberStats[];
  
  // Frequency average
  const avgFreq = gameStats.length > 0
    ? Math.round(gameStats.reduce((s, st) => s + st.percentage, 0) / gameStats.length * 10) / 10
    : 0;

  // Delay classification
  const avgDelay = gameStats.length > 0
    ? Math.round(gameStats.reduce((s, st) => s + st.lastSeen, 0) / gameStats.length * 10) / 10
    : 0;
  const delayLabel = avgDelay <= 3 ? "Baixo" : avgDelay <= 8 ? "Moderado" : "Alto";
  const delayColor = avgDelay <= 3 ? "text-green-500" : avgDelay <= 8 ? "text-amber-500" : "text-red-500";

  // Parity
  const even = numbers.filter(n => n % 2 === 0).length;
  const odd = numbers.length - even;

  // Sum
  const sum = numbers.reduce((s, n) => s + n, 0);

  // Repetitions from last draw
  const lastDraw = draws.length > 0 ? new Set(draws[0].numbers) : new Set<number>();
  const repeated = numbers.filter(n => lastDraw.has(n)).length;

  // Hot/cold breakdown
  const hot = gameStats.filter(s => s.status === "hot").length;
  const cold = gameStats.filter(s => s.status === "cold").length;
  const normal = gameStats.filter(s => s.status === "normal").length;

  // Strategy classification
  let strategy: string;
  if (hot >= numbers.length * 0.6) strategy = "Conservadora (base histórica forte)";
  else if (cold >= numbers.length * 0.4) strategy = "Agressiva (exploração de padrões raros)";
  else strategy = "Equilibrada (mix de tendências)";

  // Sum range check
  const idealMin = Math.round(config.pick * (1 + config.numbers) / 2 * 0.7);
  const idealMax = Math.round(config.pick * (1 + config.numbers) / 2 * 1.3);
  const sumInRange = sum >= idealMin && sum <= idealMax;

  // Consecutive pairs
  const sorted = [...numbers].sort((a, b) => a - b);
  let consecutives = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) consecutives++;
  }

  // Range distribution
  const rangeSize = Math.ceil(config.numbers / 4);
  const ranges = [0, 0, 0, 0];
  numbers.forEach(n => {
    const idx = Math.min(3, Math.floor((n - 1) / rangeSize));
    ranges[idx]++;
  });

  return {
    avgFreq, avgDelay, delayLabel, delayColor,
    even, odd, sum, repeated, hot, cold, normal,
    strategy, sumInRange, consecutives, ranges,
    idealMin, idealMax
  };
}

export function GameAnalysisBlock({ numbers, stats, config, draws, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const analysis = computeGameAnalysis(numbers, stats, config, draws);

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/50 hover:text-primary transition-all py-1.5 px-3 rounded-lg hover:bg-primary/5"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Explorar Diagnóstico IA</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 rounded-xl bg-background/60 border border-border/40 space-y-4 shadow-inner">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 opacity-60">
                <Target className="w-3.5 h-3.5 text-primary" /> Análise da Matriz (dados históricos)
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Frequency */}
                <MetricCard
                  label="Frequência média"
                  value={`${analysis.avgFreq}%`}
                  icon={<Target className="w-3 h-3" />}
                  color={analysis.avgFreq >= 50 ? "text-green-500" : "text-amber-500"}
                />

                {/* Delay */}
                <MetricCard
                  label="Atraso médio"
                  value={analysis.delayLabel}
                  icon={<Hash className="w-3 h-3" />}
                  color={analysis.delayColor}
                />

                {/* Repetitions */}
                <MetricCard
                  label="Repetição últ. concurso"
                  value={`${analysis.repeated} números`}
                  icon={<RefreshCw className="w-3 h-3" />}
                  color={analysis.repeated > 0 ? "text-blue-500" : "text-muted-foreground"}
                />

                {/* Parity */}
                <MetricCard
                  label="Par / Ímpar"
                  value={`${analysis.even} / ${analysis.odd}`}
                  icon={<BarChart3 className="w-3 h-3" />}
                  color="text-foreground"
                />

                {/* Sum */}
                <MetricCard
                  label="Soma total"
                  value={`${analysis.sum}`}
                  icon={<Hash className="w-3 h-3" />}
                  color={analysis.sumInRange ? "text-green-500" : "text-amber-500"}
                  subtitle={analysis.sumInRange ? "Faixa ideal" : `Ideal: ${analysis.idealMin}-${analysis.idealMax}`}
                />

                {/* Hot/Cold */}
                <MetricCard
                  label="Quentes / Frias"
                  value={`${analysis.hot} / ${analysis.cold}`}
                  icon={<Flame className="w-3 h-3" />}
                  color="text-foreground"
                />
              </div>

              {/* Strategy classification */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground">Classificação:</span>
                <span className="text-[10px] font-semibold text-primary">{analysis.strategy}</span>
              </div>

              {/* Range distribution */}
              <div className="flex items-center gap-1 pt-1">
                <span className="text-[10px] text-muted-foreground mr-1">Faixas:</span>
                {analysis.ranges.map((count, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    <div
                      className="h-3 rounded-sm bg-primary/60"
                      style={{ width: `${Math.max(8, count * 8)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>

              {analysis.consecutives > 0 && (
                <p className="text-[10px] text-amber-500">
                  ⚠ {analysis.consecutives} par{analysis.consecutives > 1 ? "es" : ""} consecutivo{analysis.consecutives > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ label, value, icon, color, subtitle }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/20 border border-white/5 group/metric hover:border-primary/20 transition-all">
      <div className={`mt-0.5 p-1.5 rounded-md bg-background/50 border border-white/5 group-hover/metric:scale-110 transition-transform ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-tight opacity-60">{label}</p>
        <p className={`text-xs font-black font-mono truncate mt-0.5 ${color}`}>{value}</p>
        {subtitle && <p className="text-[7px] font-bold uppercase text-muted-foreground/40 mt-0.5 leading-none">{subtitle}</p>}
      </div>
    </div>
  );
}
