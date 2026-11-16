/**
 * ClosingStrategyMatrixPanel — quando o usuário roda "Comparar", exibe uma matriz
 * com custo × cobertura × ROI estimado lado a lado para escolher a melhor.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import type { ClosingResult, ClosingStrategy } from "@/engine/closing";
import { simulateRoi } from "@/engine/closing/analysis/roiSimulator";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";

const STRATEGY_LABELS: Record<ClosingStrategy, string> = {
  greedy: "Guloso",
  hill_climbing: "Hill Climbing",
  simulated_annealing: "Sim. Annealing",
  genetic: "Genético",
  covering_design: "Covering Design",
  beam_search: "Beam Search",
  backtracking: "Backtracking",
  branch_and_bound: "Branch & Bound",
  monte_carlo: "Monte Carlo",
  hybrid: "Híbrido",
};

interface Props {
  results: ClosingResult[];
  windowSize?: number;
  onPick?: (r: ClosingResult) => void;
}

export function ClosingStrategyMatrixPanel({ results, windowSize = 20, onPick }: Props) {
  const { drawsWithPrizes, config } = useLotteryContext();

  const rows = useMemo(() => {
    const win = drawsWithPrizes.slice(0, windowSize);
    return results.flatMap(r => {
      const sim = simulateRoi({
        lotteryId: config.id,
        ticketPrice: r.request.lottery.ticketPrice,
        games: r.games,
        recentDraws: win,
        window: windowSize,
      });
      if (!sim) return [];
      return [{
        result: r,
        roi: sim.roiPercent,
        prize: sim.totalPrize,
        winRate: sim.hitRatePercent,
      }];
    }).sort((a, b) => b.roi - a.roi);
  }, [results, drawsWithPrizes, windowSize, config.id]);



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <GitCompare className="h-5 w-5 text-primary" />
          Matriz de Estratégias — Retrospectiva de Custos e Rateios
          <Badge variant="outline" className="ml-auto text-[10px]">
            Até {windowSize} concursos com rateio
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 && <p className="text-sm text-muted-foreground mb-4">
          Comparação indisponível: exige jogos simples e rateio completo (Mega-Sena, Lotofácil ou Quina), sem acerto hipotético em faixa originalmente sem ganhadores.
        </p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 px-2">Estratégia</th>
                <th className="text-right py-2 px-2">Jogos</th>
                <th className="text-right py-2 px-2">Custo</th>
                <th className="text-right py-2 px-2">Cobertura</th>
                <th className="text-right py-2 px-2">Menor acerto</th>
                <th className="text-right py-2 px-2">Prêmios (rateio)</th>
                <th className="text-right py-2 px-2">Win rate</th>
                <th className="text-right py-2 px-2">ROI</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const r = row.result;
                const positive = row.roi >= 0;

                return (
                  <tr key={r.strategy} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">
                      {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                    </td>
                    <td className="text-right py-2 px-2 font-mono">{r.gameCount}</td>
                    <td className="text-right py-2 px-2 font-mono">{formatCurrency(r.cost)}</td>
                    <td className="text-right py-2 px-2 font-mono">{r.validation.coveragePercent.toFixed(1)}%</td>
                    <td className={cn(
                      "text-right py-2 px-2 font-mono",
                      r.validation.meetsGuarantee ? "text-emerald-400" : "text-amber-500",
                    )}>
                      {r.validation.guaranteedHits}
                    </td>
                    <td className="text-right py-2 px-2 font-mono">{formatCurrency(row.prize)}</td>
                    <td className="text-right py-2 px-2 font-mono">{row.winRate.toFixed(0)}%</td>
                    <td className={cn(
                      "text-right py-2 px-2 font-mono font-semibold",
                      positive ? "text-emerald-400" : "text-red-400",
                    )}>
                      {positive
                        ? <TrendingUp className="inline h-3 w-3 mr-0.5" />
                        : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                      {positive ? "+" : ""}{row.roi.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 px-2">
                      {onPick && (
                        <Button size="sm" variant="ghost" onClick={() => onPick(r)}>Ver</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Ordenado pelo retorno retrospectivo, sem indicar estratégia superior: quantidades de jogos e orçamentos podem diferir. Jogos escolhidos depois dos resultados sofrem viés de seleção. Uma aposta hipotética pode alterar o rateio: não são prêmios contrafactuais exatos. Preço por bilhete é o informado, não o histórico.
        </p>
      </CardContent>
    </Card>
  );
}
