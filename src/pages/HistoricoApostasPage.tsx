import { useMemo, useState } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrizeTiers } from "@/services/api/lottery";;
import { ClipboardCheck, Trophy, TrendingUp, BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Minus, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseDrawDate } from "@/lib/draw-date";

interface BetComparison {
  bet: ReturnType<typeof useSavedBets>["savedBets"][0];
  drawResults: {
    concurso: number;
    date: string;
    hits: number;
    matchedNumbers: number[];
    isPrize: boolean;
    tierLabel?: string;
    tierPrize?: string;
  }[];
  bestHits: number;
  avgHits: number;
  totalPrizes: number;
  trend: "up" | "down" | "stable";
}

const HistoricoApostasPage = () => {
  const { selectedLottery, config, draws } = useLotteryContext();
  const { savedBets, loading } = useSavedBets(selectedLottery);
  const prizeTiers = getPrizeTiers(selectedLottery);
  const [filter, setFilter] = useState<"all" | "winners" | "recent">("all");
  const [expandedBet, setExpandedBet] = useState<string | null>(null);

  const comparisons = useMemo<BetComparison[]>(() => {
    if (!savedBets.length || !draws.length) return [];

    return savedBets.map((bet) => {
      const betDate = new Date(bet.created_at);
      const futureDraws = draws.filter((d) => {
        const drawDate = parseDrawDate(d.date);
        return !drawDate || drawDate >= betDate;
      });

      const drawResults = futureDraws.map((draw) => {
        const drawSet = new Set(draw.numbers);
        const matched = bet.numbers.filter((n) => drawSet.has(n));
        const tier = prizeTiers.find((t) => t.hits === matched.length);
        return {
          concurso: draw.concurso,
          date: draw.date || "",
          hits: matched.length,
          matchedNumbers: matched,
          isPrize: !!tier,
          tierLabel: tier?.label,
          tierPrize: tier?.estimatedPrize,
        };
      });

      const bestHits = drawResults.reduce((max, r) => Math.max(max, r.hits), 0);
      const avgHits = drawResults.length > 0
        ? drawResults.reduce((sum, r) => sum + r.hits, 0) / drawResults.length
        : 0;
      const totalPrizes = drawResults.filter((r) => r.isPrize).length;

      // Trend: compare last 5 vs previous 5
      const sorted = [...drawResults].sort((a, b) => b.concurso - a.concurso);
      const recent5 = sorted.slice(0, 5);
      const prev5 = sorted.slice(5, 10);
      const recentAvg = recent5.length ? recent5.reduce((s, r) => s + r.hits, 0) / recent5.length : 0;
      const prevAvg = prev5.length ? prev5.reduce((s, r) => s + r.hits, 0) / prev5.length : 0;
      const trend: "up" | "down" | "stable" = recentAvg > prevAvg + 0.3 ? "up" : recentAvg < prevAvg - 0.3 ? "down" : "stable";

      return {
        bet,
        drawResults: sorted.slice(0, 20), // show last 20 draws
        bestHits,
        avgHits,
        totalPrizes,
        trend,
      };
    });
  }, [savedBets, draws, prizeTiers]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "winners":
        return comparisons.filter((c) => c.totalPrizes > 0);
      case "recent":
        return [...comparisons].sort(
          (a, b) => new Date(b.bet.created_at).getTime() - new Date(a.bet.created_at).getTime()
        ).slice(0, 20);
      default:
        return comparisons;
    }
  }, [comparisons, filter]);

  const globalStats = useMemo(() => {
    const total = comparisons.length;
    const withPrizes = comparisons.filter((c) => c.totalPrizes > 0).length;
    const bestOverall = comparisons.reduce((max, c) => Math.max(max, c.bestHits), 0);
    const totalPrizesAll = comparisons.reduce((s, c) => s + c.totalPrizes, 0);
    return { total, withPrizes, bestOverall, totalPrizesAll };
  }, [comparisons]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Apostas"
        description="Comparação automática das suas apostas contra sorteios realizados"
        icon={ClipboardCheck}
      />
      <LotteryContextBanner />

      {loading ? (
        <EmptyState description="Carregando apostas..." />
      ) : savedBets.length === 0 ? (
        <EmptyState description="Nenhuma aposta salva. Gere e salve apostas no Gerador para ver a comparação automática." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <ClipboardCheck className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold font-mono text-foreground">{globalStats.total}</p>
                <p className="text-[10px] text-muted-foreground">Apostas Analisadas</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Trophy className="h-5 w-5 text-accent mx-auto mb-1" />
                <p className="text-xl font-bold font-mono text-foreground">{globalStats.totalPrizesAll}</p>
                <p className="text-[10px] text-muted-foreground">Premiações Totais</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold font-mono text-foreground">{globalStats.bestOverall}</p>
                <p className="text-[10px] text-muted-foreground">Máx. Acertos</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold font-mono text-foreground">
                  {globalStats.total > 0 ? ((globalStats.withPrizes / globalStats.total) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">Taxa de Acerto</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Todas ({comparisons.length})</TabsTrigger>
              <TabsTrigger value="winners">Com Prêmio ({comparisons.filter(c => c.totalPrizes > 0).length})</TabsTrigger>
              <TabsTrigger value="recent">Recentes</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((comp, idx) => (
                    <motion.div
                      key={comp.bet.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <Card
                        className={`border-border/60 bg-card/80 backdrop-blur cursor-pointer transition-all hover:border-primary/30 ${
                          comp.totalPrizes > 0 ? "ring-1 ring-primary/20" : ""
                        }`}
                        onClick={() => setExpandedBet(expandedBet === comp.bet.id ? null : comp.bet.id)}
                      >
                        <CardContent className="p-4">
                          {/* Bet header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center gap-1">
                                {comp.trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                                {comp.trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-400" />}
                                {comp.trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-1">
                                  {comp.bet.numbers.map((n) => (
                                    <span
                                      key={n}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold bg-secondary text-foreground border border-border/50"
                                    >
                                      {String(n).padStart(2, "0")}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  {comp.bet.strategy && (
                                    <Badge variant="outline" className="text-[9px]">
                                      {comp.bet.strategy}
                                    </Badge>
                                  )}
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(comp.bet.created_at).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3 space-y-1">
                              <Badge variant={comp.totalPrizes > 0 ? "default" : "secondary"} className="text-[10px]">
                                {comp.totalPrizes} prêmio{comp.totalPrizes !== 1 ? "s" : ""}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground">
                                Máx: <span className="font-bold text-foreground">{comp.bestHits}/{config.pick}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Média: <span className="font-mono">{comp.avgHits.toFixed(1)}</span>
                              </p>
                            </div>
                          </div>

                          {/* Expanded: draw-by-draw comparison */}
                          <AnimatePresence>
                            {expandedBet === comp.bet.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/30 pt-3 mt-1">
                                  <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                                    Últimos {comp.drawResults.length} sorteios comparados
                                  </p>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-[10px] h-8 px-2">Concurso</TableHead>
                                          <TableHead className="text-[10px] h-8 px-2">Data</TableHead>
                                          <TableHead className="text-[10px] h-8 px-2">Acertos</TableHead>
                                          <TableHead className="text-[10px] h-8 px-2">Números</TableHead>
                                          <TableHead className="text-[10px] h-8 px-2">Prêmio</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {comp.drawResults.map((dr) => (
                                          <TableRow
                                            key={dr.concurso}
                                            className={dr.isPrize ? "bg-primary/5" : ""}
                                          >
                                            <TableCell className="text-[10px] py-1.5 px-2 font-mono">
                                              {dr.concurso}
                                            </TableCell>
                                            <TableCell className="text-[10px] py-1.5 px-2 text-muted-foreground">
                                              {dr.date ? new Date(dr.date).toLocaleDateString("pt-BR") : "—"}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2">
                                              <Badge
                                                variant={dr.isPrize ? "default" : "secondary"}
                                                className="text-[10px]"
                                              >
                                                {dr.hits}/{config.pick}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2">
                                              <div className="flex flex-wrap gap-0.5">
                                                {dr.matchedNumbers.slice(0, 10).map((n) => (
                                                  <span
                                                    key={n}
                                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold bg-primary text-primary-foreground"
                                                  >
                                                    {String(n).padStart(2, "0")}
                                                  </span>
                                                ))}
                                                {dr.matchedNumbers.length > 10 && (
                                                  <span className="text-[8px] text-muted-foreground self-center">
                                                    +{dr.matchedNumbers.length - 10}
                                                  </span>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-[10px] py-1.5 px-2">
                                              {dr.isPrize ? (
                                                <span className="text-primary font-semibold">{dr.tierLabel}</span>
                                              ) : (
                                                <span className="text-muted-foreground">—</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <EmptyState description="Nenhuma aposta encontrada com este filtro." />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default HistoricoApostasPage;
