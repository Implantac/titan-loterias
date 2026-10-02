import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { PLAN_LIMITS } from "@/features/auth/constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SavedBet {
  id: string;
  lottery_id: string;
  numbers: number[];
  strategy: string | null;
  score: number | null;
  grade: string | null;
  label: string | null;
  created_at: string;
}

export function useSavedBets(lotteryId: string) {
  const queryClient = useQueryClient();
  const { currentPlan } = usePlanAccess();
  const limit = PLAN_LIMITS[currentPlan].savedBetsPerLottery;

  const { data: savedBets = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["saved-bets", lotteryId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_bets")
        .select("*")
        .eq("user_id", user.id)
        .eq("lottery_id", lotteryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as SavedBet[]) || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (bet: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (savedBets.length >= limit) {
        throw new Error(`Limite de ${limit} jogos atingido.`);
      }

      const { error } = await supabase.from("saved_bets").insert({
        user_id: user.id,
        lottery_id: lotteryId,
        numbers: bet.numbers,
        strategy: bet.strategy || null,
        score: bet.score || null,
        grade: bet.grade || null,
        label: bet.label || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aposta salva!");
      queryClient.invalidateQueries({ queryKey: ["saved-bets", lotteryId] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao salvar aposta");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_bets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aposta removida");
      queryClient.invalidateQueries({ queryKey: ["saved-bets", lotteryId] });
    },
    onError: () => toast.error("Erro ao remover aposta")
  });

  const saveBet = useCallback(async (bet: any): Promise<boolean> => {
    try {
      await saveMutation.mutateAsync(bet);
      return true;
    } catch {
      return false;
    }
  }, [saveMutation]);

  const deleteBet = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

  const remaining = Math.max(0, limit - savedBets.length);
  const isAtLimit = remaining === 0 && limit !== Infinity;

  return { savedBets, loading, error, saveBet, deleteBet, refetch, limit, remaining, isAtLimit };
}
