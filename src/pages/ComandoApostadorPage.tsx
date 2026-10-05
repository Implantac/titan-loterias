/**
 * ComandoApostadorPage — Painel de Comando do Apostador Profissional
 * -----------------------------------------------------------------------------
 * Consolida em uma única tela os sinais críticos para tomada de decisão:
 *   1. Termômetro do Ciclo 1-25 (pressão de retorno)
 *   2. Perfil Vencedor e Similaridade
 *   3. Comparador Rápido (aposta manual × perfil × consenso)
 *   4. Performance do Motor (histórico de presets)
 *   5. Sugestão de Fechamento Automático (base × orçamento)
 */
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Command, Trophy, Wallet, Target, TrendingUp, Info as InfoIcon, Loader2, ShieldCheck, AlertCircle, Search } from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { CycleThermometer } from "@/components/lottery/analysis/CycleThermometer";
import { DataHealthPanel } from "@/components/lottery/analysis/DataHealthPanel";
import { CockpitShortcuts } from "@/components/lottery/CockpitShortcuts";
import { PlanStatusBadge } from "@/components/lottery/PlanStatusBadge";
import { RecentActivityCard } from "@/components/lottery/RecentActivityCard";
import { WinnerProfilePanel } from "@/components/lottery/analysis/WinnerProfilePanel";
import { QuickCompareBet } from "@/components/lottery/QuickCompareBet";
import { EnginePerformancePanel } from "@/components/dashboards/EnginePerformancePanel";
import { VereditoApostador } from "@/components/lab/VereditoApostador";
import { DecisionAuditDialog } from "@/components/lab/DecisionAuditDialog";
import { pickBestMatrix } from "@/engine/closing/autoMatrix";
import { toast } from "sonner";
import { QuantitativeDecisionPipeline } from "@/engine/decision/QuantitativeDecisionPipeline";
import { QuantitativeDecisionResult } from "@/engine/contracts/quant";
import { generateGames } from "@/ai/generators/universalGameGenerator";



export default function ComandoApostadorPage() {
  const { selectedLottery, config: lotteryConfig, draws, stats } = useLotteryContext();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<number>(50);
  const [baseSize, setBaseSize] = useState<number>(lotteryConfig?.pick ? lotteryConfig.pick + 3 : 18);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [decision, setDecision] = useState<QuantitativeDecisionResult | null>(null);

  // Auto-run analysis when data is available.
  // Deferred + de-duplicated: the pipeline is CPU heavy, so it runs at most once
  // per (loteria, tamanho do histórico) and only after the UI has painted.
  const lastRunRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedLottery || !lotteryConfig || !draws || draws.length < 30 || !stats?.length) return;

    const signature = `${selectedLottery}:${draws.length}:${stats.length}`;
    if (lastRunRef.current === signature) return;
    lastRunRef.current = signature;

    let cancelled = false;

    async function runPipeline() {
      if (!selectedLottery || !lotteryConfig || !stats) return;

      
      setIsAnalyzing(true);
      try {
        // Generate sample games to feed the pipeline
        const sampleGames = generateGames({
          lotteryId: selectedLottery,
          count: 5,
          riskProfile: "balanced",
          filters: {
            avoidSequences: true,
            balanceParity: true,
            balanceHighLow: true,
            prioritizeHot: true,
            prioritizeCold: false,
            frameCenter: true,
            limitRepetition: true,
          },
          stats,
          draws,
        });

        const result = await QuantitativeDecisionPipeline.execute({
          lotteryId: selectedLottery,
          config: lotteryConfig,
          draws,
          stats,
          budget,
          riskProfile: "balanced",
          strategyId: "universal-pro",
          strategyLabel: "TITAN Universal Pro",
          generatedGames: sampleGames.map(g => g.numbers),
          historicalPerformance: 1.05 // Baseline improvement
        });

        if (!cancelled) setDecision(result);
      } catch (error) {
        console.error("Erro no Pipeline Quantitativo:", error);
        toast.error("Erro ao processar análise avançada.");
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    }

    // Yield to the browser so the page paints before the heavy computation.
    const timer = window.setTimeout(runPipeline, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLottery, draws.length, stats?.length]);

  // Consenso simples: as N dezenas mais quentes (freq / delay baixo).
  const consensus = useMemo(() => {
    if (!stats || stats.length === 0) return [];
    const sorted = [...stats].sort((a: any, b: any) => (b.frequency ?? 0) - (a.frequency ?? 0));
    return sorted.slice(0, Math.max(8, (lotteryConfig?.pick ?? 15) + 3)).map((s: any) => s.number);
  }, [stats, lotteryConfig?.pick]);

  const matrixSuggestion = useMemo(() => {
    if (!selectedLottery) return null;
    return pickBestMatrix({
      lotteryId: selectedLottery,
      availableBaseSize: baseSize,
      budget,
    });
  }, [selectedLottery, baseSize, budget]);


  if (!lotteryConfig) return null;

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Command className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            Painel de Comando
            <PlanStatusBadge />
          </h1>
          <p className="text-xs text-muted-foreground">
            Todos os sinais críticos consolidados para você decidir em segundos, {lotteryConfig.name}.
          </p>
        </div>
      </div>

      <CockpitShortcuts />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><DataHealthPanel draws={draws} lottery={lotteryConfig} /></div>
        <RecentActivityCard lotteryId={selectedLottery} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">
          <CycleThermometer draws={draws} totalNumbers={lotteryConfig.numbers} />
          <WinnerProfilePanel
            draws={draws}
            lotteryId={selectedLottery}
            totalNumbers={lotteryConfig.numbers}
            pick={lotteryConfig.pick}
          />
        </div>
        <div className="relative">
          {isAnalyzing ? (
            <Card className="h-full flex flex-col items-center justify-center p-8 space-y-4 border-primary/20 bg-primary/5 animate-pulse">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold uppercase italic tracking-tighter">Processando Pipeline</p>
                <p className="text-[10px] text-muted-foreground">Executando 10k Monte Carlo & Stress Test...</p>
              </div>
            </Card>
          ) : decision ? (
            <div className="space-y-4">
              <VereditoApostador 
                lift={decision.evidence.lift} 
                zScore={decision.evidence.zScore} 
                pValue={decision.evidence.pValue} 
                grade={decision.evidence.grade}
                lotteryName={lotteryConfig.name}
              />

              
              <Card className="glass-card border-primary/20 overflow-hidden">
                <div className="bg-primary/10 px-3 py-2 border-b border-primary/20 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase italic tracking-widest text-primary">Indicadores de Confiança</span>
                  <ShieldCheck className="w-3 h-3 text-primary" />
                </div>
                <CardContent className="p-3 space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Data Quality</span>
                    <span className={`text-xs font-mono font-bold ${decision.dataQuality.score > 90 ? 'text-green-500' : 'text-amber-500'}`}>
                      {decision.dataQuality.score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full transition-all" style={{ width: `${decision.dataQuality.score}%` }} />
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Robustez (Stress)</span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {decision.robustness.score.toFixed(0)}/100
                    </span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${decision.robustness.score}%` }} />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] uppercase font-black bg-primary/5">
                      Edge: {decision.benchmark.lift > 0 ? '+' : ''}{decision.benchmark.lift.toFixed(2)}%
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button 
                          className="text-[9px] text-primary hover:underline flex items-center gap-1 font-bold"
                        >
                          <Search className="w-2.5 h-2.5" /> AUDITAR DECISÃO
                        </button>
                      </DialogTrigger>
                      <DecisionAuditDialog decision={decision} lotteryName={lotteryConfig.name} />
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center p-8 space-y-4 border-dashed border-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">Aguardando dados suficientes para veredito quantitativo.</p>
            </Card>
          )}
        </div>
      </div>


      <div className="grid lg:grid-cols-2 gap-4">
        <QuickCompareBet
          draws={draws}
          lotteryId={selectedLottery}
          pick={lotteryConfig.pick}
          totalNumbers={lotteryConfig.numbers}
          consensusNumbers={consensus}
        />

        <Card className="glass-card border-primary/20 shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black uppercase italic tracking-tighter">
              <Wallet className="h-4 w-4 text-primary" />
              Fechamento Automático
              <Badge variant="outline" className="ml-auto text-[10px] font-black tracking-widest bg-primary/5 text-primary">por orçamento</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Orçamento (R$)</Label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                  min={0}
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Dezenas na base</Label>
                <Input
                  type="number"
                  value={baseSize}
                  onChange={(e) => setBaseSize(Math.max(lotteryConfig.pick, Number(e.target.value) || lotteryConfig.pick))}
                  min={lotteryConfig.pick}
                  max={lotteryConfig.numbers}
                  className="font-mono"
                />
              </div>
            </div>

            {matrixSuggestion?.best ? (
              <div className="space-y-2">
                <div className="rounded-2xl border border-primary/40 bg-primary/[0.05] p-4 shadow-inner relative overflow-hidden group/item">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-primary group-hover/item:rotate-12 transition-transform" />
                    <span className="text-sm font-black uppercase italic tracking-tight">{matrixSuggestion.best.name}</span>
                    <Badge variant="outline" className="ml-auto text-[10px] font-black font-mono tracking-widest bg-background/50 border-primary/20">
                      R$ {matrixSuggestion.best.cost.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-4 leading-relaxed opacity-80">
                    {matrixSuggestion.best.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <InfoRow label="Base" value={`${matrixSuggestion.best.baseSize} dez.`} />
                    <InfoRow label="Jogos" value={String(matrixSuggestion.best.gameCount)} />
                    <InfoRow label="Garantia" value={`${matrixSuggestion.best.guarantee} pts`} />
                  </div>
                  <Button
                    size="sm"
                    variant="premium"
                    className="w-full mt-4 gap-2 font-black uppercase tracking-widest h-11 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    onClick={() => {
                      navigate("/fechamento-universal", { state: { fromComando: true } });
                      toast.success(`Sugestão: ${matrixSuggestion.best!.name}. Ajuste sua base no Fechamento Universal.`);
                    }}
                  >
                    <Target className="w-4 h-4" /> Abrir no Fechamento Universal
                  </Button>
                </div>
                {matrixSuggestion.reason && (
                  <p className="text-[11px] text-amber-500 italic">{matrixSuggestion.reason}</p>
                )}
                {matrixSuggestion.alternatives.length > 0 && (
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Alternativas</p>
                    {matrixSuggestion.alternatives.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium">{a.name}</span>
                        <div className="flex items-center gap-2 text-muted-foreground font-mono">
                          <span>{a.gameCount} jogos</span>
                          <span>·</span>
                          <span>R$ {a.cost.toFixed(2)}</span>
                          <span>·</span>
                          <span>{a.guarantee} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {matrixSuggestion?.reason ?? "Ajuste os parâmetros para receber uma sugestão."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <EnginePerformancePanel lotteryId={selectedLottery} />

      <Card className="border-primary/20 bg-primary/[0.02] glass-card shadow-premium">
        <CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Dica: rode o Caça-Jackpot no Gerador Estratégico com o Modo Acumulou ativado para popular a
            base de <strong>Performance do Motor</strong>. Após cada novo sorteio oficial, o Titan avalia
            automaticamente os lotes pendentes e refina a leitura dos presets que mais performam.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-card/60 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
