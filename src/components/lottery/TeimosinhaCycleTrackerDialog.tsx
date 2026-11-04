import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Repeat,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Landmark,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { useLotteryContext } from "@/contexts/LotteryContext";
import {
  getCaixaTeimosinhaOptions,
  calculateTeimosinhaCycleCost,
  auditTeimosinhaCycle,
} from "@/utils/teimosinhaTracker";
import { CaixaPrizeRedemptionDialog } from "./CaixaPrizeRedemptionDialog";

interface TeimosinhaCycleTrackerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: number[][];
}

export function TeimosinhaCycleTrackerDialog({
  open,
  onOpenChange,
  games,
}: TeimosinhaCycleTrackerDialogProps) {
  const { config, draws } = useLotteryContext();
  const allowedCycles = useMemo(() => getCaixaTeimosinhaOptions(config.id), [config.id]);
  const [selectedCycle, setSelectedCycle] = useState<number>(() => allowedCycles[1] || allowedCycles[0] || 4);
  const [redemptionOpen, setRedemptionOpen] = useState(false);

  const costInfo = useMemo(() => {
    return calculateTeimosinhaCycleCost(config.id, games.length, selectedCycle);
  }, [config.id, games.length, selectedCycle]);

  const report = useMemo(() => {
    if (games.length === 0 || draws.length === 0) return null;
    return auditTeimosinhaCycle(games, draws, selectedCycle, config.id);
  }, [games, draws, selectedCycle, config.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Rastreador de Ciclos de Teimosinha
                <Badge variant="outline" className="text-[10px] font-mono uppercase text-amber-400 border-amber-500/30">
                  {config.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Audite e projete a repetição das mesmas apostas por múltiplos concursos consecutivos oficiais da Caixa
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Seletor de Ciclo Oficial Caixa */}
          <div className="p-3 rounded-xl bg-card border border-border/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Concursos Consecutivos (Regras Caixa):
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {games.length} {games.length === 1 ? "aposta" : "apostas"} no ciclo
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allowedCycles.map((cycle) => (
                <Button
                  key={cycle}
                  size="sm"
                  variant={selectedCycle === cycle ? "default" : "outline"}
                  onClick={() => setSelectedCycle(cycle)}
                  className="h-8 text-xs font-mono font-bold"
                >
                  {cycle} Concursos
                </Button>
              ))}
            </div>

            {/* Resumo de Custo */}
            <div className="pt-2 border-t border-border/30 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Custo por Sorteio:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(costInfo.costPerDraw)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Ciclo Completo:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(costInfo.totalCycleCost)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Aposta Simples:</span>
                <span className="font-mono text-muted-foreground">
                  {formatCurrency(costInfo.costPerSingleBet)}
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Desempenho do Ciclo */}
          {report && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-card border border-border/30">
                <span className="text-[10px] text-muted-foreground block">Investimento:</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {formatCurrency(report.totalCycleCost)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/30">
                <span className="text-[10px] text-muted-foreground block">Prêmios Líquidos:</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatCurrency(report.totalPrizeNet)}
                </span>
              </div>

              <div className={`p-2.5 rounded-lg border ${report.netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border/30"}`}>
                <span className="text-[10px] text-muted-foreground block">Saldo Líquido:</span>
                <span className={`text-xs font-mono font-bold ${report.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {report.netProfit >= 0 ? "+" : ""}{formatCurrency(report.netProfit)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/30">
                <span className="text-[10px] text-muted-foreground block">Ponto de Equilíbrio:</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {report.isBreakEvenAchieved ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1.5 font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> PAGO!
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                      Em aberto
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Evolução do Ciclo Concurso a Concurso */}
          {report && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> Auditoria Concurso a Concurso:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ROI Acumulado: <strong className={report.overallRoiPercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {report.overallRoiPercent >= 0 ? "+" : ""}{formatNumber(report.overallRoiPercent)}%
                  </strong>
                </span>
              </div>

              <div className="rounded-xl border border-border/30 overflow-hidden text-xs">
                <div className="grid grid-cols-6 p-2 bg-muted/30 font-mono text-[10px] text-muted-foreground border-b border-border/30">
                  <span>Concurso</span>
                  <span>Custo Acum.</span>
                  <span>Melhor</span>
                  <span>Prêmio</span>
                  <span>Saldo</span>
                  <span className="text-right">Break-Even</span>
                </div>

                <div className="divide-y divide-border/20 max-h-48 overflow-y-auto">
                  {report.drawResults.map((r) => (
                    <div
                      key={r.concurso}
                      className={`grid grid-cols-6 p-2 font-mono text-[11px] items-center transition-colors ${
                        r.isBreakEven ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "hover:bg-muted/20"
                      }`}
                    >
                      <span className="font-bold text-foreground">#{r.concurso}</span>
                      <span className="text-muted-foreground">{formatCurrency(r.cumulativeCost)}</span>
                      <span className="text-foreground">{r.bestHitsThisDraw} pts</span>
                      <span className={r.prizeNetThisDraw > 0 ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                        {formatCurrency(r.prizeNetThisDraw)}
                      </span>
                      <span className={r.netProfit >= 0 ? "text-emerald-400 font-bold" : "text-rose-400"}>
                        {r.netProfit >= 0 ? "+" : ""}{formatCurrency(r.netProfit)}
                      </span>
                      <div className="text-right">
                        {r.isBreakEven ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] h-4 px-1">
                            Lucro
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">---</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Banner de Ponto de Equilíbrio */}
          {report?.isBreakEvenAchieved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-emerald-400">Ponto de Equilíbrio Atingido!</h4>
                  <p className="text-[11px] text-muted-foreground">
                    O ciclo pagou todo o custo de investimento no Concurso #{report.firstBreakEvenDraw}.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setRedemptionOpen(true)}
                className="h-8 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Landmark className="w-3.5 h-3.5" /> Guia Resgate Caixa
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-border/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            size="sm"
            onClick={() => setRedemptionOpen(true)}
            className="gap-1.5 font-bold"
          >
            <DollarSign className="w-4 h-4" /> Calcular IRRF & Resgate
          </Button>
        </div>

        <CaixaPrizeRedemptionDialog
          open={redemptionOpen}
          onOpenChange={setRedemptionOpen}
          initialPrize={report?.totalPrizeGross || 50000}
          lotteryName={config.name}
        />
      </DialogContent>
    </Dialog>
  );
}
