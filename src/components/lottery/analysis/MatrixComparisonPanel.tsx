import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  WHEELING_MATRICES,
  WheelingMatrixId,
  validateMatrix,
} from "@/ai/engines/wheelingMatrices";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK, CHART_COLORS } from "@/lib/chart-theme";
import { BarChart3, Shield, Coins, Hash, Layers, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lotteryId: string;
  betPrice: number;
}

const MATRIX_LIST = Object.entries(WHEELING_MATRICES).map(([id, m]) => ({
  id: id as WheelingMatrixId,
  ...m,
}));

export function MatrixComparisonPanel({ lotteryId, betPrice }: Props) {
  const matrices = MATRIX_LIST.filter((m) => m.lottery === lotteryId);

  const comparisons = useMemo(() => {
    return matrices.map((m) => {
      const v = validateMatrix(m.id);
      const cost = m.games.length * betPrice;
      const costPerCoverage = v.coveragePercent > 0 ? cost / v.coveragePercent : 0;
      const efficiency = v.coveragePercent / m.games.length;
      return { ...m, validation: v, cost, costPerCoverage, efficiency };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }, [matrices, betPrice]);

  if (comparisons.length < 1) return null;

  const bestEfficiency = Math.max(...comparisons.map((c) => c.efficiency));
  const lowestCost = Math.min(...comparisons.map((c) => c.cost));

  const barData = comparisons.map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    eficiência: parseFloat(c.efficiency.toFixed(2)),
    custo: c.cost,
    cobertura: Math.round(c.validation.coveragePercent),
  }));

  const radarData = comparisons.length > 1
    ? (() => {
        const maxCost = Math.max(...comparisons.map(c => c.cost));
        const maxEff = Math.max(...comparisons.map(c => c.efficiency));
        const maxCov = Math.max(...comparisons.map(c => c.validation.coveragePercent));
        return [
          { metric: "Eficiência", ...Object.fromEntries(comparisons.map(c => [c.name, maxEff > 0 ? (c.efficiency / maxEff) * 100 : 0])) },
          { metric: "Cobertura", ...Object.fromEntries(comparisons.map(c => [c.name, maxCov > 0 ? (c.validation.coveragePercent / maxCov) * 100 : 0])) },
          { metric: "Economia", ...Object.fromEntries(comparisons.map(c => [c.name, maxCost > 0 ? ((maxCost - c.cost) / maxCost) * 100 : 0])) },
          { metric: "Garantia", ...Object.fromEntries(comparisons.map(c => [c.name, c.guarantee * 20])) },
          { metric: "Base", ...Object.fromEntries(comparisons.map(c => [c.name, Math.min(c.baseSize * 5, 100)])) },
        ];
      })()
    : null;

  const FILL_COLORS = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.purple, CHART_COLORS.cyan, CHART_COLORS.red];

  return (
    <Card className="bg-card/80 backdrop-blur border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <BarChart3 className="w-5 h-5 text-primary" />
          Comparativo de Matrizes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Charts */}
        <div className={`grid gap-4 ${radarData ? "md:grid-cols-2" : "grid-cols-1"}`}>
          {/* Efficiency + Coverage Bar Chart */}
          <div className="rounded-xl bg-muted/5 border border-border p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground">Eficiência & Cobertura</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <XAxis dataKey="name" tick={{ ...CHART_AXIS_TICK, fontSize: 8 }} />
                  <YAxis tick={CHART_AXIS_TICK} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="eficiência" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} name="Eficiência" />
                  <Bar dataKey="cobertura" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} name="Cobertura %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Bar Chart */}
          {comparisons.length > 1 ? (
            <div className="rounded-xl bg-muted/5 border border-border p-4 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Custo por Matriz (R$)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <XAxis dataKey="name" tick={{ ...CHART_AXIS_TICK, fontSize: 8 }} />
                    <YAxis tick={CHART_AXIS_TICK} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Custo"]} />
                    <Bar dataKey="custo" radius={[3, 3, 0, 0]} name="Custo">
                      {barData.map((_, i) => (
                        <Cell key={i} fill={FILL_COLORS[i % FILL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/5 border border-border p-4 flex flex-col items-center justify-center gap-2">
              <Coins className="w-8 h-8 text-primary/40" />
              <span className="text-xs text-muted-foreground text-center">Custo total: <strong className="text-foreground">R$ {comparisons[0]?.cost.toFixed(2)}</strong></span>
              <span className="text-xs text-muted-foreground text-center">R$/Cobertura: <strong className="text-foreground">R$ {comparisons[0]?.costPerCoverage.toFixed(2)}</strong></span>
            </div>
          )}
        </div>

        {/* Radar Chart for multi-matrix */}
        {radarData && comparisons.length > 1 && (
          <div className="rounded-xl bg-muted/5 border border-border p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground">Radar Comparativo</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(215, 12%, 20%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ ...CHART_AXIS_TICK, fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} domain={[0, 100]} />
                  {comparisons.map((c, i) => (
                    <Radar
                      key={c.id}
                      name={c.name}
                      dataKey={c.name}
                      stroke={FILL_COLORS[i % FILL_COLORS.length]}
                      fill={FILL_COLORS[i % FILL_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Matriz</TableHead>
                <TableHead className="text-xs text-center">
                  <div className="flex items-center justify-center gap-1"><Hash className="w-3 h-3" />Base</div>
                </TableHead>
                <TableHead className="text-xs text-center">
                  <div className="flex items-center justify-center gap-1"><Layers className="w-3 h-3" />Jogos</div>
                </TableHead>
                <TableHead className="text-xs text-center">
                  <div className="flex items-center justify-center gap-1"><Shield className="w-3 h-3" />Garantia</div>
                </TableHead>
                <TableHead className="text-xs text-center">
                  <div className="flex items-center justify-center gap-1"><Coins className="w-3 h-3" />Custo</div>
                </TableHead>
                <TableHead className="text-xs text-center">Cobertura & Status</TableHead>
                <TableHead className="text-xs text-center">
                  <div className="flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />Eficiência</div>
                </TableHead>
                <TableHead className="text-xs text-center">R$/Cob.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground">{c.name}</span>
                      {c.efficiency === bestEfficiency && (
                        <Badge variant="default" className="text-[9px] px-1 py-0">Melhor</Badge>
                      )}
                      {c.cost === lowestCost && comparisons.length > 1 && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">Econômica</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono text-foreground">{c.baseSize}</TableCell>
                  <TableCell className="text-center text-xs font-mono text-foreground">{c.games.length}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] font-mono text-primary">{c.guarantee}+</Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono text-accent-foreground">R$ {c.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-mono text-foreground">{Math.round(c.validation.coveragePercent)}%</span>
                      <Progress value={c.validation.coveragePercent} className="h-1 w-16" />
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] font-mono px-1 py-0 uppercase font-semibold",
                          c.validation.exhaustive
                            ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                            : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                        )}
                        title={
                          c.validation.exhaustive
                            ? `100% Exaustivo: todos os ${c.validation.totalDraws} cenários combinatórios foram testados.`
                            : `Amostral: ${c.validation.totalDraws} cenários simulados via amostragem estocástica.`
                        }
                      >
                        {c.validation.exhaustive ? "Exaustivo" : "Amostral"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-mono font-bold text-primary">{c.efficiency.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono text-muted-foreground">R$ {c.costPerCoverage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {comparisons.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/10 border border-border text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Eficiência</strong> = Cobertura% ÷ Nº de jogos (maior = melhor custo-benefício)</p>
            <p><strong className="text-foreground">R$/Cob.</strong> = Custo por ponto de cobertura (menor = mais econômico)</p>
            <p className="text-[11px] pt-1">
              <span className="text-emerald-400 font-semibold">Exaustivo</span> = 100% dos cenários possíveis comprovados matematicamente.{" "}
              <span className="text-amber-400 font-semibold">Amostral</span> = validação com até 5.000 cenários simulados (estimativa estatística).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}