import { useState, useEffect, useCallback } from "react";
import { DrawResult } from "@/data/lotteries";
import { fetchLatestDraw, LatestDrawResult } from "@/services/api/lottery";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Wifi, WifiOff, Clock, CheckCircle2, Trophy, Users, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency, formatNumber, formatTime } from "@/utils/formatters";

interface Props {
  lotteryId: string;
  onNewDraw: (draw: DrawResult) => void;
  latestConcurso: number;
  syncDraws?: (isSilent?: boolean) => Promise<{ success: boolean; result?: any; error?: string }>;
}

export function AutoUpdater({ lotteryId, onNewDraw, latestConcurso, syncDraws }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [latestFromApi, setLatestFromApi] = useState<LatestDrawResult | null>(null);

  const checkForUpdates = useCallback(async () => {
    setLoading(true);
    try {
      // First check with the database sync if available
      if (syncDraws) {
        const syncResult = await syncDraws(true);
        if (syncResult.success) {
          setLastCheck(new Date());
          setIsOnline(true);
          
          // result.results is the array returned by sync-lottery-draws Edge Function
          const results = syncResult.result?.results || [];
          const lotteryResult = results.find((r: any) => r.lottery === lotteryId);
          
          if (lotteryResult && lotteryResult.inserted > 0) {
             console.log(`[AutoUpdater] ${lotteryResult.inserted} new draws inserted for ${lotteryId}`);
          }
        } else {
          setIsOnline(false);
        }
      }

      // Always fetch latest for the UI display regardless of sync success
      const result = await fetchLatestDraw(lotteryId);
      setLastCheck(new Date());

      if (result) {
        setLatestFromApi(result);
        if (result.concurso > latestConcurso) {
          onNewDraw(result);
          toast.success(`Novo resultado! Concurso #${result.concurso}`);
        } else if (!syncDraws) {
          toast.info("Nenhum resultado novo disponível");
        }
        setIsOnline(true);
      } else if (!syncDraws) {
        setIsOnline(false);
        toast.error("Não foi possível conectar à API da Caixa");
      }
    } catch (e) {
      console.error("Check for updates error:", e);
      setIsOnline(false);
      if (!syncDraws) toast.error("Erro ao buscar resultados");
    } finally {
      setLoading(false);
    }
  }, [lotteryId, latestConcurso, onNewDraw, syncDraws]);

  // Auto-fetch on mount and when lottery changes
  useEffect(() => {
    setLatestFromApi(null);
    checkForUpdates();
  }, [lotteryId]);

  // Auto-check every 5 minutes if enabled
  useEffect(() => {
    if (!autoEnabled) return;
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoEnabled, checkForUpdates]);

  const prizeTiers = latestFromApi?.prizeTiers;

  return (
    <div className="rounded-2xl glass-card p-6 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform duration-500 ${isOnline ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"}`}>
            {isOnline ? <Wifi className="w-6 h-6 text-primary animate-pulse" /> : <WifiOff className="w-6 h-6 text-destructive" />}
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest italic flex items-center gap-2">
              Sincronizador de Resultados
            </h3>
            {lastCheck && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1 font-bold uppercase tracking-widest opacity-60">
                <Clock className="w-3 h-3" />
                Checked: {formatTime(lastCheck)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setAutoEnabled(!autoEnabled)}
            className={`flex-1 sm:flex-initial text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${
              autoEnabled
                ? "border-primary/40 text-primary bg-primary/10 shadow-lg shadow-primary/10"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            Auto-Sync: {autoEnabled ? "ENABLED" : "OFF"}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => checkForUpdates()}
            disabled={loading}
            className="flex-1 sm:flex-initial h-10 px-6 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "SEARCHING..." : "SYNC NOW"}
          </Button>
        </div>
      </div>


      {/* Latest result from API with full prize data */}
      <AnimatePresence>
        {latestFromApi && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 rounded-2xl bg-secondary/20 border border-border/40 overflow-hidden shadow-inner group/result"
          >
            {/* Header */}
            <div className="p-5 border-b border-border/40 bg-background/40 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 mb-4 relative z-10">

                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover/result:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <span className="text-base text-foreground font-black uppercase tracking-tight italic">
                  Concurso #{latestFromApi.concurso}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 ml-auto">{latestFromApi.date}</span>
                {prizeTiers?.acumulou && (
                  <span className="text-[9px] px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 font-black uppercase tracking-widest shadow-lg shadow-accent/10 animate-pulse">
                    ACUMULOU
                  </span>
                )}

              </div>
              {/* Numbers */}
              <div className="flex flex-wrap gap-1.5">
                {latestFromApi.numbers.map(n => (
                  <span key={n} className="lottery-ball text-xs w-8 h-8">
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>

            {/* Prize tiers table */}
            {prizeTiers?.premiacoes && prizeTiers.premiacoes.length > 0 && (
              <div className="p-3">
                {/* Financial summary */}
                {(prizeTiers.valorArrecadado > 0 || prizeTiers.valorAcumulado > 0) && (
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground mb-3">
                    {prizeTiers.valorArrecadado > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Arrecadado: <strong className="text-foreground">{formatCurrency(prizeTiers.valorArrecadado)}</strong>
                      </span>
                    )}
                    {prizeTiers.acumulou && prizeTiers.valorAcumulado > 0 && (
                      <span className="flex items-center gap-1 text-accent">
                        <TrendingUp className="w-3 h-3" />
                        Acumulado: <strong>{formatCurrency(prizeTiers.valorAcumulado)}</strong>
                      </span>
                    )}
                    {prizeTiers.valorEstimado > 0 && (
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Próximo: <strong className="text-foreground">{formatCurrency(prizeTiers.valorEstimado)}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Prize table */}
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Faixa</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium">
                          <Users className="w-3 h-3 inline mr-1" />
                          Ganhadores
                        </th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">
                          <Trophy className="w-3 h-3 inline mr-1" />
                          Prêmio
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {prizeTiers.premiacoes.map((tier, i) => (
                        <tr key={i} className={`border-t border-border/30 ${i === 0 ? "bg-primary/5" : ""}`}>
                          <td className="px-3 py-2 text-foreground font-medium">
                            {tier.descricao}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-bold ${
                              tier.ganhadores > 0 ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {formatNumber(tier.ganhadores)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className={`${
                              tier.ganhadores > 0 ? "text-primary font-bold" : "text-muted-foreground"
                            }`}>
                              {formatCurrency(tier.valorPremio)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
