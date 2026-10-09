import { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect, useRef } from "react";
import { LOTTERIES, DrawResult } from "@/data/lotteries";
import { computeFrequencyStats, computeSumDistribution, NumberStats } from "@/engine/stats/statistics";
import { FarolStats, CycleStats } from "@/engine/stats/farol-engine";
import { useLotteryDraws, DrawResultWithPrizes } from "@/hooks/useLotteryDraws";
import { useLotteryStats } from "@/hooks/lottery/useLotteryStats";
import { DataProvider, DataOrigin } from "@/engine/data-provider/DataProvider";
import { OfficialProvider, LocalCacheProvider, ImportProvider } from "@/engine/data-provider/Providers";


import { TimeRange } from "@/hooks/lottery/useLotteryStats";

interface LotteryContextType {
  selectedLottery: string;
  setSelectedLottery: (id: string) => void;
  config: (typeof LOTTERIES)[0];
  draws: DrawResult[];
  drawsWithPrizes: DrawResultWithPrizes[];
  loading: boolean;
  syncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  count: number;
  dataOrigin: DataOrigin;
  setDataOrigin: (origin: DataOrigin) => void;
  syncDraws: (isSilent?: boolean) => Promise<{ success: boolean; result?: any; error?: string }>;
  syncAllLotteries: () => void;
  addDraw: (draw: DrawResult) => void;
  stats: NumberStats[];
  sumData: ReturnType<typeof computeSumDistribution>;
  hotNumbers: number[];
  coldNumbers: number[];
  farol: FarolStats[];
  cycle: CycleStats | null;
  viewMode: "simple" | "advanced";
  setViewMode: (mode: "simple" | "advanced") => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  customInterval: { start: Date; end: Date } | undefined;
  setCustomInterval: (interval: { start: Date; end: Date } | undefined) => void;

}

const LotteryContext = createContext<LotteryContextType | null>(null);

export function LotteryProvider({ children }: { children: ReactNode }) {
  const [selectedLottery, setSelectedLottery] = useState("lotofacil");
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customInterval, setCustomInterval] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [dataOrigin, setDataOriginState] = useState<DataOrigin>("official");

  // Initialize DataProvider
  useEffect(() => {
    DataProvider.register(OfficialProvider);
    DataProvider.register(LocalCacheProvider);
    DataProvider.register(ImportProvider);
    // MockProvider é intencionalmente NÃO registrado em produção: ele gera
    // concursos sintéticos e um usuário nunca deve analisar dado inventado.
  }, []);

  const setDataOrigin = useCallback((origin: DataOrigin) => {
    DataProvider.setActiveOrigin(origin);
    setDataOriginState(origin);
  }, []);

  const config = useMemo(() => LOTTERIES.find(l => l.id === selectedLottery) || LOTTERIES[0], [selectedLottery]);
  const { draws, drawsWithPrizes, loading, syncing, lastSyncAt, syncError, count, syncDraws, syncAllLotteries, addDraw } = useLotteryDraws(selectedLottery, dataOrigin);


  // Auto-sync: roda uma vez por loteria (com cooldown) e depois a cada 5 min.
  // Nunca depende de identidades instáveis para não entrar em loop de render.
  const lastSyncRef = useRef<Record<string, number>>({});
  const SYNC_COOLDOWN_MS = 30_000;

  useEffect(() => {
    if (loading) return;

    const runSync = () => {
      const now = Date.now();
      const last = lastSyncRef.current[selectedLottery] ?? 0;
      if (now - last < SYNC_COOLDOWN_MS) return;
      lastSyncRef.current[selectedLottery] = now;
      void syncDraws(true);
    };

    runSync();
    const intervalId = setInterval(runSync, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [selectedLottery, loading, syncDraws]);

  const { stats, sumData, hotNumbers, coldNumbers, farol, cycle } = useLotteryStats(draws, config, timeRange, customInterval);

  const handleSetSelectedLottery = useCallback((id: string) => setSelectedLottery(id), []);

  const value = useMemo<LotteryContextType>(() => ({
    selectedLottery,
    setSelectedLottery: handleSetSelectedLottery,
    config,
    draws,
    drawsWithPrizes,
    loading,
    syncing,
    lastSyncAt,
    syncError,
    count,
    syncDraws,
    dataOrigin,
    setDataOrigin,
    syncAllLotteries,
    addDraw,
    stats,
    sumData,
    hotNumbers,
    coldNumbers,
    farol,
    cycle,
    viewMode,
    setViewMode,
    timeRange,
    setTimeRange,
    customInterval,
    setCustomInterval,
  }), [
    selectedLottery, handleSetSelectedLottery, config, draws, drawsWithPrizes, loading, syncing,
    lastSyncAt, syncError, count, syncDraws, dataOrigin, setDataOrigin, syncAllLotteries, addDraw,
    stats, sumData, hotNumbers, coldNumbers, farol, cycle, viewMode, timeRange, customInterval,
  ]);

  return (
    <LotteryContext.Provider value={value}>
      {children}
    </LotteryContext.Provider>
  );
}


export function useLotteryContext() {
  const ctx = useContext(LotteryContext);
  if (!ctx) throw new Error("useLotteryContext must be within LotteryProvider");
  return ctx;
}

export function useLotteryContextSafe() {
  return useContext(LotteryContext);
}
