import { useMemo, useState } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PlanGate } from "@/components/PlanGate";
import { useSavedBets } from "@/hooks/useSavedBets";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Target, Trophy, BarChart3, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import { ROIFilters, ROIFilterState } from "@/components/ROIFilters";
import { PrizeHistoryPanel } from "@/components/lottery/analysis/PrizeHistoryPanel";
import { DrawResultWithPrizes } from "@/hooks/useLotteryDraws";
import { LOTTERY_BET_COST } from "@/engine/betting-budget";
import { parseDrawDate } from "@/lib/draw-date";

// Custo oficial da aposta simples (fonte única em betting-budget)
const BET_COST = LOTTERY_BET_COST;

/**
 * Encontra o próximo sorteio REAL após a data de criação da aposta
 */
function findNextDraw(betDate: Date, sortedDraws: DrawResultWithPrizes[]): DrawResultWithPrizes | null {
  // sortedDraws está em ordem DESC (mais recente primeiro)
  let closest: DrawResultWithPrizes | null = null;
  for (const draw of sortedDraws) {
    const drawDate = parseDrawDate(draw.date);
    if (!drawDate) continue;
    if (drawDate >= betDate) {
      closest = draw; // continua procurando um mais próximo
    } else {
      break;
    }
  }
  return closest;
}

/**
 * Calcula o prêmio REAL usando prize_tiers do banco de dados
 */
function getRealPrize(hits: number, draw: DrawResultWithPrizes): number {
  if (!draw.prizeTiers?.premiacoes) return 0;
  // Match exato por fronteira de dígito para evitar colisão de substring
  // (ex.: hits=5 casando "15 acertos"). `faixa` é índice ordinal — NÃO comparar com hits.
  const re = new RegExp(`(^|[^\\d])${hits}\\s+(acerto|ponto)s?\\b`, "i");
  for (const tier of draw.prizeTiers.premiacoes) {
    if (re.test(tier.descricao || "")) return tier.valorPremio || 0;
  }
  return 0;
}

const ROIDashboardPage = () => {
  const { config, drawsWithPrizes, selectedLottery } = useLotteryContext();
  const { savedBets } = useSavedBets(selectedLottery);
  const [filters, setFilters] = useState<ROIFilterState>({ period: "all", strategy: "all", minHits: "0" });

  const strategies = useMemo(() => {
    const set = new Set(savedBets.map(b => b.strategy).filter(Boolean) as string[]);
    return Array.from(set);
  }, [savedBets]);

  const filteredBets = useMemo(() => {
    let bets = savedBets;
    if (filters.period !== "all") {
      const days = parseInt(filters.period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      bets = bets.filter(b => new Date(b.created_at) >= cutoff);
    }
    if (filters.strategy !== "all") {
      bets = bets.filter(b => b.strategy === filters.strategy);
    }
    return bets;
  }, [savedBets, filters]);

  const analysis = useMemo(() => {
    if (!filteredBets.length || !drawsWithPrizes.length) return null;

    const cost = BET_COST[selectedLottery] || 5.00;
    const minHits = parseInt(filters.minHits) || 0;
    let totalInvested = 0;
    let totalReturn = 0;
    const betResults: { date: string; invested: number; returned: number; hits: number; concurso: number; realPrize: boolean }[] = [];
    const hitDistribution: Record<number, number> = {};

    for (const bet of filteredBets) {
      const betDate = new Date(bet.created_at);
      totalInvested += cost;

      // Encontra o PRÓXIMO sorteio real após a aposta
      const nextDraw = findNextDraw(betDate, drawsWithPrizes);
      if (!nextDraw) continue;

      const drawSet = new Set(nextDraw.numbers);
      const hits = bet.numbers.filter(n => drawSet.has(n)).length;
      const prize = getRealPrize(hits, nextDraw);
      const hasRealPrize = !!nextDraw.prizeTiers?.premiacoes?.length;

      if (hits < minHits) continue;

      hitDistribution[hits] = (hitDistribution[hits] || 0) + 1;
      totalReturn += prize;
      betResults.push({
        date: betDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        invested: cost, returned: prize, hits, concurso: nextDraw.concurso, realPrize: hasRealPrize,
      });
    }

    if (!betResults.length) return null;

    const roi = totalInvested > 0 ? ((totalReturn - totalInvested) / totalInvested) * 100 : 0;
    const hitChartData = Object.entries(hitDistribution)
      .map(([hits, count]) => ({ hits: `${hits} acertos`, count }))
      .sort((a, b) => parseInt(a.hits) - parseInt(b.hits));

    let cumInvested = 0, cumReturn = 0;
    const roiTimeline = betResults.map((r) => {
      cumInvested += r.invested; cumReturn += r.returned;
      return { date: r.date, roi: Number(((cumReturn - cumInvested) / cumInvested * 100).toFixed(1)), invested: cumInvested, returned: cumReturn };
    });

    return {
      totalInvested, totalReturn, roi, roiPositive: roi > 0, totalBets: betResults.length,
      hitChartData, roiTimeline, betResults,
      bestResult: betResults.reduce((best, r) => r.returned > best.returned ? r : best, betResults[0]),
    };
  }, [filteredBets, drawsWithPrizes, selectedLottery, filters.minHits]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard de ROI" description="Retorno sobre investimento baseado em dados REAIS de sorteios" icon={TrendingUp} />
      <LotteryContextBanner />

      {!savedBets.length ? (
        <EmptyState description="Salve apostas no Gerador para acompanhar seu ROI e premiações." />
      ) : (
        <PlanGate feature="roi_dashboard" fallbackMessage="Dashboard de ROI e análise de premiações">
        <Tabs defaultValue="roi" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roi">ROI</TabsTrigger>
            <TabsTrigger value="premiacoes">Premiações Reais</TabsTrigger>
          </TabsList>

          <TabsContent value="roi" className="space-y-4">
            <ROIFilters filters={filters} onChange={setFilters} strategies={strategies} maxHits={config.pick} />

            {!analysis ? (
              <EmptyState description="Nenhum resultado encontrado com os filtros atuais." />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" />Total Investido</div>
                      <p className="text-xl font-bold font-mono text-foreground">R$ {analysis.totalInvested.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{analysis.totalBets} apostas</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Trophy className="h-3.5 w-3.5" />Total Retorno</div>
                      <p className={`text-xl font-bold font-mono ${analysis.totalReturn > 0 ? "text-primary" : "text-muted-foreground"}`}>R$ {analysis.totalReturn.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className={`border-border/60 backdrop-blur ${analysis.roiPositive ? "bg-primary/5" : "bg-destructive/5"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        {analysis.roiPositive ? <TrendingUp className="h-3.5 w-3.5 text-primary" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}ROI
                      </div>
                      <p className={`text-xl font-bold font-mono ${analysis.roiPositive ? "text-primary" : "text-destructive"}`}>{analysis.roi > 0 ? "+" : ""}{analysis.roi.toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="h-3.5 w-3.5" />Melhor</div>
                      <p className="text-xl font-bold font-mono text-accent">{analysis.bestResult.hits} acertos</p>
                      <p className="text-[10px] text-muted-foreground">{analysis.bestResult.returned > 0 ? `R$ ${analysis.bestResult.returned.toFixed(2)}` : "sem premiação"}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Evolução do ROI</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={analysis.roiTimeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "ROI"]} />
                          <Line type="monotone" dataKey="roi" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-accent" />Distribuição de Acertos</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analysis.hitChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="hits" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                          <Bar dataKey="count" name="Apostas" radius={[4, 4, 0, 0]}>
                            {analysis.hitChartData.map((_, i) => (
                              <Cell key={i} fill={i >= analysis.hitChartData.length - 2 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Histórico (dados reais)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 text-muted-foreground">
                            <th className="text-left py-2 px-2">Data</th>
                            <th className="text-center py-2 px-2">Concurso</th>
                            <th className="text-center py-2 px-2">Acertos</th>
                            <th className="text-right py-2 px-2">Investido</th>
                            <th className="text-right py-2 px-2">Retorno</th>
                            <th className="text-right py-2 px-2">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.betResults.slice(0, 20).map((r, i) => (
                            <tr key={i} className="border-b border-border/20">
                              <td className="py-2 px-2 text-muted-foreground text-xs">{r.date}</td>
                              <td className="py-2 px-2 text-center text-xs font-mono text-muted-foreground">#{r.concurso}</td>
                              <td className="py-2 px-2 text-center">
                                <Badge variant={r.hits >= config.pick - 1 ? "default" : "secondary"} className="text-[10px]">{r.hits}/{config.pick}</Badge>
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-destructive">-R$ {r.invested.toFixed(2)}</td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-primary">{r.returned > 0 ? `+R$ ${r.returned.toFixed(2)}` : "-"}</td>
                              <td className="py-2 px-2 text-right">
                                {r.returned > r.invested ? <span className="text-xs text-primary font-semibold">Lucro</span>
                                  : r.returned > 0 ? <span className="text-xs text-accent font-semibold">Parcial</span>
                                  : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="premiacoes">
            <PrizeHistoryPanel />
          </TabsContent>
        </Tabs>
        </PlanGate>
      )}
    </div>
  );
};

export default ROIDashboardPage;
