import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Sparkles, Trophy, TrendingUp } from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { getLotteryProfile } from "@/ai/knowledge/lotteryProfiles";
import { getPrizeTiers } from "@/services/api/lottery";
import { countHits } from "@/engine/validation/backtestRunner";

interface QuickBacktestDialogProps {
  numbers: number[];
  lotteryId?: string;
  trigger?: React.ReactNode;
}

const RANGE_OPTIONS = ["50", "100", "200", "500"];

export function QuickBacktestDialog({ numbers, lotteryId, trigger }: QuickBacktestDialogProps) {
  const { selectedLottery, draws } = useLotteryContext();
  const targetLottery = lotteryId || selectedLottery;
  const profile = getLotteryProfile(targetLottery);
  const supported = ["megasena", "lotofacil", "quina"].includes(targetLottery);
  const ready = supported && targetLottery === selectedLottery && numbers.length === profile.pick &&
    new Set(numbers).size === numbers.length &&
    numbers.every(n => Number.isInteger(n) && n >= 1 && n <= profile.universe);
  const [lookback, setLookback] = useState("100");
  const [open, setOpen] = useState(false);

  const report = useMemo(() => {
    if (!open || !ready || draws.length === 0) return null;
    const n = Math.min(parseInt(lookback), draws.length);
    const window = draws.slice(0, n);
    const prizeTiers = getPrizeTiers(targetLottery);
    const distribution: Record<number, number> = {};
    let totalHits = 0;
    let maxHits = 0;
    let bestConcurso = 0;
    let prizeCount = 0;
    const premiumThreshold = Math.max(1, profile.pick - 2);
    const timeline: { concurso: number; hits: number; prize?: string }[] = [];

    for (const d of window) {
      const hits = countHits(numbers, d.numbers);
      totalHits += hits;
      distribution[hits] = (distribution[hits] ?? 0) + 1;
      if (hits > maxHits) { maxHits = hits; bestConcurso = d.concurso; }
      const tier = prizeTiers.find((t) => t.hits === hits);
      if (tier) prizeCount++;
      timeline.push({ concurso: d.concurso, hits, prize: tier?.label });
    }

    const evaluated = window.length;
    const avgHits = evaluated ? totalHits / evaluated : 0;
    const premiumRate = evaluated
      ? window.filter((d) => countHits(numbers, d.numbers) >= premiumThreshold).length / evaluated
      : 0;

    return { evaluated, avgHits, maxHits, bestConcurso, distribution, premiumRate, prizeCount, timeline };
  }, [open, ready, lookback, draws, numbers, profile.pick, targetLottery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <History className="w-3.5 h-3.5" />
            Retro-teste
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Retro-teste 1-Clique
          </DialogTitle>
          <DialogDescription>
            Compare as dezenas com o histórico carregado da mesma modalidade. Isso não comprova prêmio recebido nem prevê sorteios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Últimos sorteios:</span>
          <Select value={lookback} onValueChange={setLookback}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((v) => <SelectItem key={v} value={v}>Últimos {v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {numbers.map((n) => (
            <span key={n} className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-mono tabular-nums font-semibold">
              {String(n).padStart(2, "0")}
            </span>
          ))}
        </div>

        {ready && draws.length === 0 && <div role="status" className="text-xs text-muted-foreground">Sem concursos carregados desta modalidade.</div>}
        {!ready && <div role="alert" className="rounded-md border border-amber-500/30 p-3 text-xs text-muted-foreground">
          {!supported ? "Conferência rápida não disponível para esta modalidade: regras específicas ainda não modeladas." :
            targetLottery !== selectedLottery ? "Selecione a modalidade da aposta antes do retro-teste; o histórico exibido pertence à modalidade ativa." :
            "Este retro-teste aceita apenas apostas simples válidas para a modalidade."}
        </div>}

        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricTile label="Sorteios" value={report.evaluated} />
              <MetricTile label="Acertos médios" value={report.avgHits.toFixed(2)} />
              <MetricTile label="Melhor" value={`${report.maxHits}${report.bestConcurso ? ` · #${report.bestConcurso}` : ""}`} />
              <MetricTile label="Faixas possíveis" value={report.prizeCount} highlight={report.prizeCount > 0} />
            </div>


            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Distribuição de acertos</h4>
              <div className="space-y-1">
                {Object.entries(report.distribution)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([hits, count]) => {
                    const pct = (count / report.evaluated) * 100;
                    const isPrize = getPrizeTiers(targetLottery).some((t) => t.hits === Number(hits));
                    return (
                      <div key={hits} className="flex items-center gap-2 text-xs">
                        <span className="w-16 font-mono tabular-nums">{hits} acertos</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${isPrize ? "bg-primary" : "bg-muted-foreground/40"}`} style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                        <span className="w-16 text-right text-muted-foreground font-mono tabular-nums">
                          {count} · {pct.toFixed(1)}%
                        </span>
                        {isPrize && <Trophy className="w-3 h-3 text-primary" />}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p>
                Frequência de acertos (≥ {Math.max(1, profile.pick - 2)} acertos): <span className="font-mono tabular-nums text-foreground">{(report.premiumRate * 100).toFixed(1)}%</span>.
                {" "}Apenas coincidências históricas; prêmios exigem comprovante oficial e regras da modalidade. Resultados passados não predizem futuros.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricTile({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/40 bg-primary/[0.05]" : "border-border/60 bg-card"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-mono tabular-nums font-semibold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
