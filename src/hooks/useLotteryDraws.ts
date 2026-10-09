import { DrawResult } from "@/data/lotteries";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { LotteryService, DrawResultWithPrizes, DrawPrizeData, PrizeTierInfo } from "@/services/lottery/lottery.service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataProvider, DataOrigin } from "@/engine/data-provider/DataProvider";


export type { PrizeTierInfo, DrawPrizeData, DrawResultWithPrizes };

/**
 * Quantos concursos carregar por loteria.
 *
 * Era 2000, mas a Quina tem 7.135 concursos e a Federal 6.087: a UI oferecia a
 * opção "Histórico Total" enquanto analisava só 28% da base. O payload é pequeno
 * (concurso + data + array de dezenas) e `fetchDraws` já pagina de 1000 em 1000.
 */
export const HISTORY_LIMIT = 8000;

export function useLotteryDraws(lotteryId: string, origin: DataOrigin = "official") {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["lottery-draws", lotteryId, origin],
    queryFn: async () => {
      const result = await DataProvider.fetchDraws(lotteryId, HISTORY_LIMIT);
      
      // If official, we use the full service logic for prizes
      if (origin === "official") {
        return LotteryService.fetchDraws(lotteryId, HISTORY_LIMIT);
      }
      
      return {
        draws: result.draws,
        drawsWithPrizes: [],
        totalCount: result.draws.length
      };
    },

    staleTime: 5 * 60 * 1000, 
    gcTime: 30 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: (isSilent: boolean = false) => {
      if (origin !== "official") {
        throw new Error(`Sincronização não disponível para origem: ${origin}`);
      }
      // Sincroniza apenas a loteria ativa e de forma incremental (sem full_sync),
      // evitando varrer o histórico completo das 8 loterias e estourar o timeout.
      return LotteryService.syncLottery(lotteryId, false);
    },

    onMutate: () => {
      setSyncing(true);
      setSyncError(null);
    },
    onSuccess: (data, isSilent) => {
      setLastSyncAt(new Date());
      const result = data?.results?.[0];
      if (result && result.inserted > 0) {
        if (!isSilent) toast.success(`${result.inserted} novos concursos importados`);
      } else if (!isSilent && !syncMutation.isPending) {
        toast.info("Dados já atualizados");
      }
      queryClient.invalidateQueries({ queryKey: ["lottery-draws", lotteryId] });
    },
    onError: (e: any, isSilent) => {
      const errorMessage = e instanceof Error ? e.message : "Erro na sincronização";
      setSyncError(errorMessage);
      if (!isSilent) toast.error(errorMessage);
    },
    onSettled: () => setSyncing(false),
  });

  // Keep a stable reference to the mutation so `syncDraws` never changes identity
  // (an unstable identity re-triggers auto-sync effects on every render → loop).
  const mutateRef = useRef(syncMutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = syncMutation.mutateAsync;
  }, [syncMutation.mutateAsync]);

  const syncDraws = useCallback(async (isSilent = false) => {
    try {
      const result = await mutateRef.current(isSilent);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro" };
    }
  }, []);

  const syncAllLotteries = useCallback(async () => {
    setSyncing(true);
    try {
      await LotteryService.syncLottery(undefined, false);
      queryClient.invalidateQueries({ queryKey: ["lottery-draws"] });
      toast.success("Sincronização iniciada");
    } catch (e) {
      toast.error("Erro ao sincronizar tudo");
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

  const addDraw = useCallback((draw: DrawResult) => {
    queryClient.setQueryData(["lottery-draws", lotteryId], (old: any) => {
      if (!old) return old;
      if (old.draws.some((d: any) => d.concurso === draw.concurso)) return old;
      return {
        ...old,
        draws: [draw, ...old.draws].sort((a, b) => b.concurso - a.concurso),
      };
    });
  }, [queryClient, lotteryId]);

  const draws = useMemo(() => data?.draws ?? [], [data?.draws]);
  const drawsWithPrizes = useMemo(() => data?.drawsWithPrizes ?? [], [data?.drawsWithPrizes]);

  return {
    draws,
    drawsWithPrizes,
    loading,
    syncing,
    lastSyncAt,
    syncError,
    count: data?.totalCount || 0,
    syncDraws,
    syncAllLotteries,
    addDraw,
    refetch,
  };
}