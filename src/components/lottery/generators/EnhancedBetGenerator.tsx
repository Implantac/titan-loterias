import { useState } from "react";
import { NumberStats } from "@/engine/stats/statistics";
import { LotteryConfig } from "@/data/lotteries";
import { STRATEGIES, Strategy, generateByStrategy } from "@/engine/strategies";
import { GenerationFilters, DEFAULT_FILTERS, generateWithFilters } from "@/engine/generation-filters";
import { GeneratorFiltersPanel } from "@/components/lottery/generators/GeneratorFiltersPanel";
import { HistoricalValidationBadge } from "@/components/lottery/HistoricalValidationBadge";
import { GameAnalysisBlock } from "@/components/lottery/analysis/GameAnalysisBlock";
import { AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, Flame, Snowflake, Shuffle, Hash, Sigma, Ratio, Grid3X3, Clock, BarChart3, TrendingUp, Repeat, Layers, Brain, Zap, Binary, Microscope, Globe, Activity, Cpu, Network, Database, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { BetCard } from "@/components/lottery/BetCard";
import { evaluateBetQuality } from "@/engine/stats/bet-quality";

interface Props {
  stats: NumberStats[];
  config: LotteryConfig;
  onSaveBet?: (numbers: number[], strategy?: string, score?: number, grade?: string) => void;
}

const ICON_MAP: Record<string, any> = {
  smart: Sparkles, hot: Flame, cold: Snowflake, balanced: Shuffle,
  trend: TrendingUp, fibonacci: Sigma, primes: Hash, golden: Ratio,
  sectors: Grid3X3, lowDelay: Clock, pattern: BarChart3, cycle: Repeat,
  ml: Brain, hybrid: Layers, titan_pro: Zap,
  bayesian: Microscope, markov_model: Activity, quantum: Cpu,
  lstm: Network, xgboost: Database, randomForest: Binary,
  repetition: RefreshCw, coreRepetition: RefreshCw, coreSectors: Grid3X3,
  markov: Activity, poisson: Sigma, cluster: LayoutGrid, expert: Globe,
  frequencyTrend: TrendingUp, multiFactor: Layers, temporalPattern: Clock,
  bayesianScore: Microscope, transitionScore: Activity, multiDimensionalPattern: Database
};


const CATEGORY_LABELS = { basic: "Básicas", math: "Matemáticas", ai: "Inteligência Artificial" };

export function EnhancedBetGenerator({ stats, config, onSaveBet }: Props) {
  const { draws, hotNumbers, coldNumbers } = useLotteryContext();
  const [strategy, setStrategy] = useState<Strategy>("smart");
  const [bets, setBets] = useState<any[]>([]);
  const [filters, setFilters] = useState<GenerationFilters>({ ...DEFAULT_FILTERS });

  const hasActiveFilters = filters.fixedNumbers.length > 0 || filters.excludedNumbers.length > 0 ||
    filters.sumMin !== null || filters.sumMax !== null ||
    filters.minEven !== null || filters.maxEven !== null ||
    filters.maxConsecutive !== null || filters.mustIncludeHot > 0 || filters.mustIncludeCold > 0;

  const generate = (count: number) => {
    const newBets: any[] = [];
    const seen = new Set<string>();
    const maxAttempts = count * 50;
    let attempts = 0;

    while (newBets.length < count && attempts < maxAttempts) {
      attempts++;
      let numbers: number[] | null;
      if (hasActiveFilters) {
        numbers = generateWithFilters(() => generateByStrategy(strategy, stats, config), filters, stats, config, 50);
      } else {
        numbers = generateByStrategy(strategy, stats, config);
      }

      if (!numbers) continue;
      const key = [...numbers].sort((a, b) => a - b).join(",");
      if (!seen.has(key)) {
        seen.add(key);
        const quality = evaluateBetQuality(numbers, stats, config, draws);
        newBets.push({ numbers, quality });
      }
    }

    setBets(newBets);
    if (newBets.length < count && hasActiveFilters) {
      toast.warning(`Filtros restritivos: ${newBets.length}/${count} gerados.`);
    }
  };

  const grouped = (["basic", "math", "ai"] as const).map(cat => ({
    label: CATEGORY_LABELS[cat],
    items: STRATEGIES.filter(s => s.category === cat),
  }));

  return (
    <div className="rounded-xl glass-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-neon-amber/10 border border-neon-amber/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-neon-amber" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Gerador Avançado</h3>
      </div>

      <GeneratorFiltersPanel config={config} draws={draws} stats={stats} filters={filters} onFiltersChange={setFilters} />

      <div className="space-y-3">
        {grouped.map(group => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map(s => {
                const Icon = ICON_MAP[s.id];
                return (
                  <Button
                    key={s.id}
                    variant={strategy === s.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStrategy(s.id)}
                    className={`h-8 text-xs gap-1.5 ${strategy === s.id ? "bg-neon-amber/20 text-neon-amber border-neon-amber/50 hover:bg-neon-amber/30" : ""}`}
                  >
                    <Icon className="w-3 h-3" />
                    {s.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[1, 3, 5].map(n => (
          <Button key={n} variant="outline" size="sm" onClick={() => generate(n)} className="flex-1 text-xs">
            <RefreshCw className="w-3 h-3 mr-1.5" />
            {n} jogo{n > 1 ? "s" : ""}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1">
        {bets.map((bet, i) => (
          <div key={i} className="space-y-2">
            <BetCard
              rank={i + 1}
              numbers={bet.numbers}
              score={bet.quality.overall}
              grade={bet.quality.grade}
              strategyLabel={STRATEGIES.find(s => s.id === strategy)?.label || strategy}
              hotNumbers={hotNumbers}
              coldNumbers={coldNumbers}
              onSave={onSaveBet ? () => onSaveBet(bet.numbers, strategy, bet.quality.overall, bet.quality.grade) : undefined}
            />
            <div className="px-1">
              <HistoricalValidationBadge bet={bet.numbers} draws={draws} config={config} />
              <GameAnalysisBlock numbers={bet.numbers} stats={stats} config={config} draws={draws} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
