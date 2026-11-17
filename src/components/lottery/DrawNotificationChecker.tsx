import { useState, useEffect, useCallback, useRef } from "react";
import { playMatchAlert } from "@/lib/alert-sounds";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { LOTTERIES } from "@/data/lotteries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, BellOff, Trophy, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface MatchResult {
  betId: string;
  betNumbers: number[];
  matchedNumbers: number[];
  matchCount: number;
  concurso: number;
  strategy: string | null;
}

export function DrawNotificationChecker() {
  const { draws, config, selectedLottery } = useLotteryContext();
  const { savedBets } = useSavedBets(selectedLottery);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { permission, supported, requestPermission, sendNotification } = useNotificationPermission();
  const notifiedConcursos = useRef<Set<string>>(new Set());
  // Refs keep the check idempotent: never re-trigger state updates for the same input.
  const lastCheckedKeyRef = useRef<string>("");

  const latestConcurso = draws.length ? draws[0].concurso : 0;
  const betsSignature = savedBets.map((b) => b.id).join(",");

  const checkMatches = useCallback(() => {
    if (!draws.length || !savedBets.length) {
      setMatches((prev) => (prev.length ? [] : prev));
      return;
    }

    const latestDraw = draws[0];
    const checkKey = `${selectedLottery}-${latestDraw.concurso}-${betsSignature}`;
    if (lastCheckedKeyRef.current === checkKey) return;
    lastCheckedKeyRef.current = checkKey;


    // Use a Set for faster lookups
    const drawSet = new Set(latestDraw.numbers);
    const minMatchRequired = Math.max(2, Math.floor(config.pick * 0.3));

    const results: MatchResult[] = savedBets
      .map(bet => {
        const matched = bet.numbers.filter(n => drawSet.has(n));
        return {
          betId: bet.id,
          betNumbers: bet.numbers,
          matchedNumbers: matched,
          matchCount: matched.length,
          concurso: latestDraw.concurso,
          strategy: bet.strategy,
        };
      })
      .filter(r => r.matchCount >= minMatchRequired)
      .sort((a, b) => b.matchCount - a.matchCount);

    setMatches(results);
    setDismissed(false);

    // Send browser push notification
    const notifKey = `${selectedLottery}-${latestDraw.concurso}`;
    if (results.length > 0 && !notifiedConcursos.current.has(notifKey)) {
      notifiedConcursos.current.add(notifKey);
      const best = results[0];
      const isWinner = best.matchCount >= config.pick;
      const lotteryName = LOTTERIES.find(l => l.id === selectedLottery)?.name || selectedLottery;

      // Play tier-based alert sound
      playMatchAlert(best.matchCount, config.pick);

      sendNotification(
        isWinner
          ? `🎉 Parabéns! Jogo premiado na ${lotteryName}!`
          : `🔔 ${lotteryName} — ${results.length} aposta(s) com acertos!`,
        {
          body: isWinner
            ? `Você acertou ${best.matchCount}/${config.pick} no concurso #${latestDraw.concurso}!`
            : `Melhor resultado: ${best.matchCount}/${config.pick} acertos no concurso #${latestDraw.concurso}`,
          tag: notifKey,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png"
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestConcurso, betsSignature, config.pick, selectedLottery]);

  useEffect(() => {
    checkMatches();
  }, [checkMatches]);

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      toast.success("Notificações ativadas! Você será avisado quando houver acertos.");
    } else if (result === "denied") {
      toast.error("Notificações bloqueadas. Ative nas configurações do navegador.");
    }
  };

  // Notification permission banner
  if (supported && permission !== "granted" && !dismissed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border border-primary/30 bg-primary/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="py-4 px-5">
            <CardTitle className="flex items-center gap-3 text-sm relative">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 group-hover:rotate-12 transition-transform duration-500">
                <Bell className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <span className="font-bold tracking-tight text-foreground/90 leading-tight">Mantenha-se informado! Ative notificações para avisos quando houver atualização. Confirme acertos no resultado oficial da Caixa.</span>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="default" onClick={handleEnableNotifications} className="h-9 px-5 rounded-xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  <BellRing className="h-3.5 w-3.5 mr-1.5" />
                  Ativar
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-white/5" onClick={() => setDismissed(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

      </motion.div>
    );
  }

  if (!matches.length || dismissed) return null;

  const bestMatch = matches[0];
  const isWinner = bestMatch.matchCount >= config.pick;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className={`border-2 ${isWinner ? "border-accent bg-accent/10 shadow-accent/20" : "border-primary/40 bg-primary/10 shadow-primary/20"} backdrop-blur-2xl rounded-2xl shadow-2xl relative overflow-hidden group`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${isWinner ? "from-accent/20" : "from-primary/20"} via-transparent to-transparent pointer-events-none`} />
          <CardHeader className="py-4 px-5">
            <CardTitle className="flex items-center gap-3 text-sm relative">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isWinner ? "bg-accent/30 border-accent/40" : "bg-primary/30 border-primary/40"} shadow-inner group-hover:rotate-6 transition-transform duration-500`}>
                {isWinner ? (
                  <Trophy className="h-6 w-6 text-accent animate-bounce" />
                ) : (
                  <BellRing className="h-6 w-6 text-primary animate-pulse" />
                )}
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isWinner ? "text-accent" : "text-primary"} opacity-80 mb-0.5`}>
                  {isWinner ? "Elite Result Detected" : "Acertos Identificados"}
                </span>
                <span className="font-black text-base tracking-tight text-foreground italic">
                  {isWinner ? "PARABÉNS! JOGO PREMIADO!" : `CONCURSO #${bestMatch.concurso} • ${matches.length} JOGOS`}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {supported && permission === "granted" && (
                  <Badge variant="outline" className={`hidden sm:flex text-[10px] font-bold uppercase tracking-widest ${isWinner ? "text-accent border-accent/40" : "text-primary border-primary/40"}`}>
                    <Bell className="h-2.5 w-2.5 mr-1.5" />
                    Push Active
                  </Badge>
                )}
                <Button size="icon" variant="ghost" className={`h-9 w-9 rounded-xl ${isWinner ? "hover:bg-accent/20" : "hover:bg-primary/20"} transition-all`} onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className={`h-9 w-9 rounded-xl ${isWinner ? "hover:bg-accent/20" : "hover:bg-primary/20"} transition-all`} onClick={() => setDismissed(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>


          {expanded && (
            <CardContent className="pt-0 px-4 pb-3 space-y-2">
              {matches.slice(0, 5).map((m) => (
                <div key={m.betId} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2 border border-border/20">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.matchCount}/{config.pick}
                  </Badge>
                  <div className="flex gap-1 flex-wrap">
                    {m.betNumbers.map(n => (
                      <span
                        key={n}
                        className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${
                          m.matchedNumbers.includes(n)
                            ? "bg-primary/20 text-primary font-bold"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                  {m.strategy && (
                    <span className="text-muted-foreground ml-auto shrink-0">{m.strategy}</span>
                  )}
                </div>
              ))}
              {matches.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{matches.length - 5} apostas com acertos
                </p>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
