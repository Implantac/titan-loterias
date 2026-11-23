import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AlertTriggers = {
  hot: boolean;
  cold: boolean;
  delay: boolean;
  accumulated: boolean;
  cycle: boolean;
};

export type AlertConfig = {
  id?: string;
  lottery_id: string;
  enabled: boolean;
  triggers: AlertTriggers;
  last_concurso?: number;
};

export const AVAILABLE_LOTTERIES: Array<{ id: string; name: string }> = [
  { id: "megasena", name: "Mega-Sena" },
  { id: "lotofacil", name: "Lotofácil" },
  { id: "quina", name: "Quina" },
  { id: "duplasena", name: "Dupla Sena" },
  { id: "timemania", name: "Timemania" },
  { id: "diadesorte", name: "Dia de Sorte" },
];

export const DEFAULT_TRIGGERS: AlertTriggers = {
  hot: true,
  cold: true,
  delay: true,
  accumulated: true,
  cycle: true,
};

export function useAlertsConfig() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_alert_configs")
        .select("id, lottery_id, enabled, triggers, last_concurso");
      if (error) throw error;
      setConfigs(
        (data || []).map((r: any) => ({
          id: r.id,
          lottery_id: r.lottery_id,
          enabled: r.enabled,
          triggers: { ...DEFAULT_TRIGGERS, ...(r.triggers || {}) },
          last_concurso: r.last_concurso ?? 0,
        })),
      );
    } catch (e) {
      console.warn("[alerts] load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = useCallback(
    async (lotteryId: string, patch: Partial<AlertConfig>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        toast.error("Faça login para configurar alertas.");
        return;
      }

      const existing = configs.find((c) => c.lottery_id === lotteryId);
      const merged: AlertConfig = {
        lottery_id: lotteryId,
        enabled: patch.enabled ?? existing?.enabled ?? true,
        triggers: { ...(existing?.triggers ?? DEFAULT_TRIGGERS), ...(patch.triggers ?? {}) },
      };

      const { error } = await supabase
        .from("user_alert_configs")
        .upsert(
          {
            user_id: userId,
            lottery_id: merged.lottery_id,
            enabled: merged.enabled,
            triggers: merged.triggers,
          } as any,
          { onConflict: "user_id,lottery_id" },
        );
      if (error) {
        toast.error("Falha ao salvar preferência.");
        return;
      }
      await load();
    },
    [configs, load],
  );

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("alerts-scan", { body: {} });
      if (error) throw error;
      const alerts = (data as any)?.alerts ?? 0;
      if (alerts > 0) toast.success(`${alerts} alerta(s) enviados.`);
      else toast.info("Nada novo por enquanto — vamos avisar quando surgir.");
    } catch (e) {
      toast.error("Não foi possível executar a varredura.");
      console.warn(e);
    } finally {
      setScanning(false);
    }
  }, []);

  return { configs, loading, scanning, upsert, runScan, reload: load };
}
