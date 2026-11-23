/**
 * Post-Draw Audit Panel
 * -----------------------------------------------------------------------------
 * Compares every saved bet against the most recent official draw and surfaces
 * "lessons learned": hits, misses, extras, and simple aggregated insight
 * (which drawn numbers were skipped most, average hits, best bet).
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import type { SavedBet } from "@/hooks/useSavedBets";
import { ShapExplanationCard } from "./ShapExplanationCard";

interface Props {
  bets: SavedBet[];
  draws: DrawResult[];
  config?: LotteryConfig;
}

export function PostDrawAuditPanel({ bets, draws, config }: Props) {
  const last = draws[0];

  const analysis = useMemo(() => {
    if (!last || bets.length === 0) return null;
    const drawSet = new Set(last.numbers);

    const perBet = bets.map((b) => {
      const hits = b.numbers.filter((n) => drawSet.has(n));
      const misses = last.numbers.filter((n) => !b.numbers.includes(n));
      const extras = b.numbers.filter((n) => !drawSet.has(n));
      return { bet: b, hits, misses, extras };
    });

    // Which drawn numbers were skipped by the most bets?
    const skipCount = new Map<number, number>();
    for (const n of last.numbers) skipCount.set(n, 0);
    for (const row of perBet) {
      for (const n of row.misses) skipCount.set(n, (skipCount.get(n) || 0) + 1);
    }
    const topSkipped = [...skipCount.entries()]
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const avgHits = perBet.reduce((s, r) => s + r.hits.length, 0) / perBet.length;
    const best = perBet.reduce((b, r) => (r.hits.length > b.hits.length ? r : b), perBet[0]);

    return { perBet, topSkipped, avgHits, best };
  }, [bets, last]);

  if (!last) return null;
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Comparação retrospectiva do último sorteio
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Salve pelo menos um jogo para ver a auditoria contra o concurso {last.concurso}.
        </CardContent>
      </Card>
    );
  }

  const { perBet, topSkipped, avgHits, best } = analysis;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Comparação retrospectiva do último sorteio
          <Badge variant="outline" className="ml-auto font-mono text-xs">
            Concurso {last.concurso}
          </Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {last.numbers.slice().sort((a, b) => a - b).map((n) => (
            <span
              key={n}
              className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/15 text-primary border border-primary/30 font-mono text-xs font-semibold"
            >
              {n.toString().padStart(2, "0")}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5">
        <p className="text-xs text-muted-foreground">Comparação numérica de jogos salvos, inclusive com sorteios anteriores ao salvamento. Não comprova aposta registrada, acerto em bilhete oficial ou prêmio recebido.</p>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI icon={Target} label="Média de coincidências" value={avgHits.toFixed(2)} />
          <KPI icon={Trophy} label="Maior coincidência" value={`${best.hits.length} dezenas`} />
          <KPI icon={TrendingUp} label="Jogos analisados" value={perBet.length.toString()} />
        </div>

        {config && best?.bet?.numbers?.length > 0 && (
          <ShapExplanationCard
            numbers={best.bet.numbers}
            config={config}
            draws={draws}
            title={`Comparação histórica (${best.hits.length} dezenas)`}
          />
        )}

        {/* Top skipped drawn numbers */}
        {topSkipped.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-card/40 p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Dezenas sorteadas que você mais deixou de fora
            </div>
            <div className="flex flex-wrap gap-2">
              {topSkipped.map(([n, count]) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs"
                >
                  <span className="font-mono font-semibold">{n.toString().padStart(2, "0")}</span>
                  <span className="text-muted-foreground">× {count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Per-bet table */}
        <ScrollArea className="max-h-[320px] pr-2">
          <div className="space-y-2">
            {perBet
              .slice()
              .sort((a, b) => b.hits.length - a.hits.length)
              .map(({ bet, hits, extras }) => (
                <div
                  key={bet.id}
                  className="rounded-lg border border-border/50 bg-card/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <span className="truncate max-w-[180px]">
                      {bet.label || bet.strategy || "Jogo salvo"}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-xs px-2 py-0.5 rounded-full border font-mono",
                        hits.length >= 11
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : hits.length >= 9
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-border/40 text-muted-foreground",
                      )}
                    >
                      {hits.length} coincidências
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {bet.numbers.slice().sort((a, b) => a - b).map((n) => {
                      const hit = hits.includes(n);
                      return (
                        <span
                          key={n}
                          className={cn(
                            "inline-flex items-center justify-center h-6 min-w-[24px] px-1 rounded font-mono text-[11px] border",
                            hit
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "bg-muted/40 border-border/40 text-muted-foreground",
                          )}
                        >
                          {n.toString().padStart(2, "0")}
                        </span>
                      );
                    })}
                  </div>
                  {extras.length > 0 && hits.length < bet.numbers.length && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {extras.length} dezena{extras.length > 1 ? "s" : ""} fora do sorteio
                    </div>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>

        {best?.bet && (
          <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">Decisão Titan:</span>
              <span className="text-[11px] text-muted-foreground italic">
                {best.hits.length >= 11 ? "Preset validado. Manter estratégia." : "Ajuste de presenças sugerido."}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px] gap-2"
              onClick={() => {
                // Navega para o gerador com a base do melhor jogo para refinamento
                const base = best.bet.numbers.join(",");
                window.location.href = `/gerador?base=${base}&refine=true`;
              }}
            >
              <Target className="w-3.5 h-3.5" /> Refinar Estratégia
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function KPI({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-lg font-semibold font-mono tabular-nums">{value}</div>
    </div>
  );
}

export default PostDrawAuditPanel;
