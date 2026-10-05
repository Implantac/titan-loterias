import { useState, useMemo, lazy, Suspense } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { StatsCard } from "@/components/common/StatsCard";
import { computeFrequencyStats, computeSumDistribution } from "@/engine/stats/statistics";
import { m } from "framer-motion";
import { PieChart, Flame, Snowflake, TrendingUp, BarChart3, Clock, Target, Sigma, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Lazy imports for heavy components
const FrequencyChart = lazy(() => import("@/components/lottery/charts/FrequencyChart").then(m => ({ default: m.FrequencyChart })));
const HeatmapGrid = lazy(() => import("@/components/lottery/analysis/HeatmapGrid").then(m => ({ default: m.HeatmapGrid })));
const SumChart = lazy(() => import("@/components/lottery/charts/SumChart").then(m => ({ default: m.SumChart })));
const ParityChart = lazy(() => import("@/components/lottery/charts/ParityChart").then(m => ({ default: m.ParityChart })));
const ConsecutiveChart = lazy(() => import("@/components/lottery/charts/ConsecutiveChart").then(m => ({ default: m.ConsecutiveChart })));
const RangeDistribution = lazy(() => import("@/components/lottery/charts/RangeDistribution").then(m => ({ default: m.RangeDistribution })));
const DelayChart = lazy(() => import("@/components/lottery/charts/DelayChart").then(m => ({ default: m.DelayChart })));

const PERIOD_OPTIONS = [
  { label: "Últimos 10", value: 10 },
  { label: "Últimos 50", value: 50 },
  { label: "Últimos 100", value: 100 },
  { label: "Últimos 500", value: 500 },
  { label: "Todos", value: 0 },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CycleThermometer = lazy(() => import("@/components/lottery/analysis/CycleThermometer").then(m => ({ default: m.CycleThermometer })));
const CoOccurrencePanel = lazy(() => import("@/components/lottery/analysis/CoOccurrencePanel").then(m => ({ default: m.CoOccurrencePanel })));
const WinnerProfilePanel = lazy(() => import("@/components/lottery/analysis/WinnerProfilePanel").then(m => ({ default: m.WinnerProfilePanel })));
const LotofacilProfilePanel = lazy(() => import("@/components/lottery/analysis/LotofacilProfilePanel").then(m => ({ default: m.LotofacilProfilePanel })));

const EstatisticasPage = () => {
  const { config, draws, syncing, syncDraws, syncAllLotteries, selectedLottery } = useLotteryContext();
  const [period, setPeriod] = useState(100);

  const filteredDraws = useMemo(() => {
    if (period === 0) return draws;
    return draws.slice(0, period);
  }, [draws, period]);

  const stats = useMemo(() => computeFrequencyStats(filteredDraws, config.numbers), [filteredDraws, config.numbers]);
  const sumData = useMemo(() => computeSumDistribution(filteredDraws), [filteredDraws]);

  const derivedStats = useMemo(() => {
    const hotCount = stats.filter(s => s.status === "hot").length;
    const coldCount = stats.filter(s => s.status === "cold").length;
    const avgDelay = stats.length > 0 ? Math.round(stats.reduce((a, s) => a + s.lastSeen, 0) / stats.length) : 0;
    const maxDelay = stats.length > 0 ? Math.max(...stats.map(s => s.lastSeen)) : 0;
    const mostFrequent = stats.length > 0 ? stats.reduce((a, s) => s.frequency > a.frequency ? s : a, stats[0]) : null;
    const avgSum = sumData.length > 0 ? Math.round(sumData.reduce((a, s) => a + s.sum, 0) / sumData.length) : 0;
    return { hotCount, coldCount, avgDelay, maxDelay, mostFrequent, avgSum };
  }, [stats, sumData]);

  const { hotCount, coldCount, avgDelay, maxDelay, mostFrequent, avgSum } = derivedStats;

  if (draws.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Estatísticas Avançadas" description="Análise estatística" icon={PieChart} />
        <LotteryContextBanner />
        <EmptyState onImport={syncDraws} onImportAll={syncAllLotteries} lotteryName={config.name} syncing={syncing} />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Engineering Hub v6.0</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            MÓDULO DE <span className="gradient-brand-text">ANÁLISE HISTÓRICA</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-lg leading-relaxed">
            Análise profunda de frequência, atraso, repetição, distribuição, pares e ímpares, somas, moldura e centro.
          </p>
        </div>

        
        <div className="flex items-center gap-1.5 p-1 bg-secondary/40 border border-border/40 rounded-2xl shadow-lg h-auto overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 px-3 border-r border-white/5 mr-1">
            <Filter className="w-3.5 h-3.5 text-primary opacity-60" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic">Janela</span>
          </div>
          {PERIOD_OPTIONS.map(opt => (
            <Button 
              key={opt.value} 
              size="sm" 
              variant={period === opt.value ? "default" : "ghost"} 
              onClick={() => setPeriod(opt.value)} 
              className={cn(
                "h-9 text-[10px] font-black uppercase px-4 rounded-xl transition-all italic tracking-[0.1em]",
                period === opt.value ? "shadow-lg shadow-primary/20" : "opacity-60 hover:opacity-100"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
        <LotteryContextBanner />
      </div>

      <m.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <m.div variants={item}><StatsCard title="Números Quentes" value={hotCount} icon={Flame} /></m.div>
        <m.div variants={item}><StatsCard title="Números Frios" value={coldCount} icon={Snowflake} /></m.div>
        <m.div variants={item}><StatsCard title="Atraso Médio" value={avgDelay} icon={Clock} /></m.div>
        <m.div variants={item}><StatsCard title="Maior Atraso" value={maxDelay} icon={TrendingUp} /></m.div>
      </m.div>

      {selectedLottery === "lotofacil" && (
        <Suspense fallback={<Skeleton className="h-[280px] w-full" />}>
          <CycleThermometer draws={draws} totalNumbers={config.numbers} window={12} />
          <div className="mt-6"><LotofacilProfilePanel draws={draws} /></div>
        </Suspense>
      )}

      <Suspense fallback={<Skeleton className="h-[320px] w-full" />}>
        <CoOccurrencePanel draws={draws} totalNumbers={config.numbers} window={100} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
        <WinnerProfilePanel draws={draws} lotteryId={selectedLottery} totalNumbers={config.numbers} pick={config.pick} />
      </Suspense>

      <m.div variants={container} initial="hidden" animate="show" className="grid lg:grid-cols-2 gap-6">

        <m.div variants={item}>
          <Suspense fallback={<Skeleton className="h-[350px] w-full" />}><FrequencyChart stats={stats} /></Suspense>
        </m.div>
        <m.div variants={item}>
          <Suspense fallback={<Skeleton className="h-[350px] w-full" />}><HeatmapGrid stats={stats} totalNumbers={config.numbers} /></Suspense>
        </m.div>
        <m.div variants={item}>
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}><SumChart data={sumData} /></Suspense>
        </m.div>
        <m.div variants={item}>
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}><ParityChart draws={filteredDraws} /></Suspense>
        </m.div>
        <m.div variants={item}>
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}><ConsecutiveChart draws={filteredDraws} /></Suspense>
        </m.div>
        <m.div variants={item}>
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}><DelayChart stats={stats} /></Suspense>
        </m.div>
      </m.div>
    </div>
  );
};

export default EstatisticasPage;