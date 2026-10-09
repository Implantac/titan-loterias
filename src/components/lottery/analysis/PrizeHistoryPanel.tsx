import { useMemo } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, TrendingUp } from "lucide-react";
import { getPrizeTiers } from "@/services/api/lottery";;
import { DrawResultWithPrizes } from "@/hooks/useLotteryDraws";
import { parseDrawDate } from "@/lib/draw-date";

function findNextDraw(betDate: Date, sortedDraws: DrawResultWithPrizes[]): DrawResultWithPrizes | null {
  let closest: DrawResultWithPrizes | null = null;
  for (const draw of sortedDraws) {
    const drawDate = parseDrawDate(draw.date);
    if (!drawDate) continue;
    if (drawDate >= betDate) {
      closest = draw;
    } else {
      break;
    }
  }
  return closest;
}

export function PrizeHistoryPanel() {
  const { selectedLottery, config, drawsWithPrizes } = useLotteryContext();
  const { savedBets } = useSavedBets(selectedLottery);
  const prizeTiers = getPrizeTiers(selectedLottery);

  const results = useMemo(() => {
    if (!savedBets.length || !drawsWithPrizes.length) return [];

    return savedBets.map((bet) => {
      const betDate = new Date(bet.created_at);
      const nextDraw = findNextDraw(betDate, drawsWithPrizes);

      if (!nextDraw) {
        return { bet, bestMatch: { concurso: 0, hits: 0, date: "", matchedNumbers: [] as number[] }, tier: undefined, isPrizeWinner: false };
      }

      const drawSet = new Set(nextDraw.numbers);
      const matched = bet.numbers.filter(n => drawSet.has(n));
      const bestMatch = { concurso: nextDraw.concurso, hits: matched.length, date: nextDraw.date, matchedNumbers: matched };
      const tier = prizeTiers.find(t => t.hits === matched.length);

      return { bet, bestMatch, tier, isPrizeWinner: !!tier };
    }).sort((a, b) => b.bestMatch.hits - a.bestMatch.hits);
  }, [savedBets, drawsWithPrizes, prizeTiers]);

  const winners = results.filter(r => r.isPrizeWinner);
  const bestResult = results[0];

  if (!results.length) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Salve apostas no Gerador para ver o histórico de premiações.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 text-accent mx-auto mb-1" />
            <p className="text-xl font-bold font-mono text-foreground">{winners.length}</p>
            <p className="text-[10px] text-muted-foreground">Premiações</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold font-mono text-foreground">{bestResult?.bestMatch.hits || 0}</p>
            <p className="text-[10px] text-muted-foreground">Máx. acertos</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold font-mono text-foreground">{results.length}</p>
            <p className="text-[10px] text-muted-foreground">Apostas verificadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            Histórico de Premiações Reais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.slice(0, 30).map((r, i) => (
              <div key={r.bet.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${r.isPrizeWinner ? "border-primary/30 bg-primary/5" : "border-border/30 bg-muted/30"}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground w-6">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {r.bet.numbers.slice(0, 8).map(n => (
                        <span
                          key={n}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                            r.bestMatch.matchedNumbers.includes(n)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {String(n).padStart(2, "0")}
                        </span>
                      ))}
                      {r.bet.numbers.length > 8 && (
                        <span className="text-[10px] text-muted-foreground self-center">+{r.bet.numbers.length - 8}</span>
                      )}
                    </div>
                    {r.bet.strategy && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.bet.strategy}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <Badge variant={r.isPrizeWinner ? "default" : "secondary"} className="text-[10px]">
                    {r.bestMatch.hits}/{config.pick}
                  </Badge>
                  {r.tier && (
                    <p className="text-[10px] text-primary mt-0.5">{r.tier.estimatedPrize}</p>
                  )}
                  {r.bestMatch.concurso > 0 && (
                    <p className="text-[9px] text-muted-foreground">C.{r.bestMatch.concurso}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
