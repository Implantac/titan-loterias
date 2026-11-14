/**
 * ClosingAdaptivePipelinePanel — orquestra o Pipeline Adaptativo:
 * comparação multi-estratégia → seleção estatística ponderada →
 * remoção de jogos dominados (com validação matemática) → reordenação por ranking.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Wand2, Loader2, CheckCircle2, TrendingUp, Zap, Filter, Trophy, Sparkles } from "lucide-react";
import type { ClosingRequest, ClosingResult, ClosingStrategy } from "@/engine/closing";
import {
  runAdaptivePipeline,
  runAdaptivePipelineBestOfN,
  autoTuneAdaptivePipeline,
  type AdaptivePipelineReport,
  type AutoTuneResult,
} from "@/engine/closing/adaptive/AdaptiveClosingPipeline";
import { ClosingAdaptivePresets, type AdaptivePreset } from "./ClosingAdaptivePresets";
import { useLotteryDraws } from "@/hooks/useLotteryDraws";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";

interface Props {
  request: ClosingRequest | null;
  disabled?: boolean;
  onApply: (result: ClosingResult) => void;
}

const STRATEGY_LABEL: Record<ClosingStrategy, string> = {
  greedy: "Guloso",
  hill_climbing: "Hill Climbing",
  simulated_annealing: "SA",
  genetic: "Genético",
  covering_design: "Covering",
  beam_search: "Beam",
  backtracking: "Backtracking",
  branch_and_bound: "B&B",
  monte_carlo: "Monte Carlo",
  hybrid: "Híbrido",
};

export function ClosingAdaptivePipelinePanel({ request, disabled, onApply }: Props) {
  const { draws } = useLotteryDraws(request?.lottery.id ?? "");
  const [statWeight, setStatWeight] = useState(35);
  const [reduce, setReduce] = useState(true);
  const [refine, setRefine] = useState(false);
  const [runs, setRuns] = useState(1);
  const [running, setRunning] = useState(false);
  const [tuning, setTuning] = useState(false);
  const [report, setReport] = useState<AdaptivePipelineReport | null>(null);
  const [tuneSweep, setTuneSweep] = useState<AutoTuneResult["sweep"] | null>(null);
  const [tuneDelta, setTuneDelta] = useState<AutoTuneResult["delta"] | null>(null);
  const [refinedSweep, setRefinedSweep] = useState<AutoTuneResult["refinedSweep"] | null>(null);
  const [bestOfNRuns, setBestOfNRuns] = useState<Array<{ adaptive: number; games: number; cost: number }> | null>(null);

  const runPipeline = async () => {
    if (!request) { toast.error("Configure a base primeiro."); return; }
    if (!request.baseNumbers?.length || request.baseNumbers.length < request.lottery.pick) {
      toast.error(`Selecione ao menos ${request.lottery.pick} dezenas na base.`);
      return;
    }
    setRunning(true);
    setReport(null);
    setBestOfNRuns(null);
    await new Promise(r => setTimeout(r, 30));
    try {
      const recent = draws.slice(0, 80).map(d => d.numbers);
      const input = {
        request,
        recentDraws: recent,
        statWeight: statWeight / 100,
        reduceDominated: reduce,
      };
      if (runs > 1) {
        const { best, allRuns } = runAdaptivePipelineBestOfN(input, runs);
        setReport(best);
        setBestOfNRuns(allRuns);
        toast.success(
          `Best-of-${runs} · ${STRATEGY_LABEL[best.chosen.strategy]} · ${best.chosen.gameCount} jogos`,
        );
      } else {
        const rep = runAdaptivePipeline(input);
        setReport(rep);
        toast.success(
          `Pipeline concluído · ${STRATEGY_LABEL[rep.chosen.strategy]} · ${rep.chosen.gameCount} jogos`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no pipeline adaptativo.");
    } finally {
      setRunning(false);
    }
  };

  const runAutoTune = async () => {
    if (!request) { toast.error("Configure a base primeiro."); return; }
    if (!request.baseNumbers?.length || request.baseNumbers.length < request.lottery.pick) {
      toast.error(`Selecione ao menos ${request.lottery.pick} dezenas na base.`);
      return;
    }
    setTuning(true);
    setReport(null);
    setTuneSweep(null);
    setTuneDelta(null);
    setRefinedSweep(null);
    await new Promise(r => setTimeout(r, 30));
    try {
      const recent = draws.slice(0, 80).map(d => d.numbers);
      const tuned = autoTuneAdaptivePipeline(
        { request, recentDraws: recent, reduceDominated: reduce },
        { refine },
      );
      setReport(tuned.best);
      setTuneSweep(tuned.sweep);
      setTuneDelta(tuned.delta);
      setRefinedSweep(tuned.refinedSweep ?? null);
      setStatWeight(Math.round(tuned.bestWeight * 100));
      toast.success(
        `Auto-Tune${refine ? " + refino" : ""}: peso ótimo ${Math.round(tuned.bestWeight * 100)}% · ${tuned.best.chosen.gameCount} jogos`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no auto-tune.");
    } finally {
      setTuning(false);
    }
  };

  const apply = () => {
    if (!report) return;
    onApply(report.chosen);
    toast.success("Resultado adaptativo aplicado ao fechamento.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyPreset = (p: AdaptivePreset) => {
    setStatWeight(p.statWeight);
    setReduce(p.reduce);
    setRefine(p.refine);
    setRuns(p.runs);
    toast.success(`Preset "${p.name}" carregado. Execute o pipeline para aplicar.`);
  };

  const autoLoadDefault = (p: AdaptivePreset) => {
    setStatWeight(p.statWeight);
    setReduce(p.reduce);
    setRefine(p.refine);
    setRuns(p.runs);
    toast.info(`Preset padrão "${p.name}" carregado.`, { duration: 2500 });
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Pipeline Adaptativo (Modo Híbrido)
          <Badge variant="secondary" className="ml-auto">
            Matemática + Estatística
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Executa 5 estratégias, escolhe pela nota composta (cobertura combinatória + nota estatística),
          tenta remover jogos redundantes e revalida a cobertura e reordena do mais forte ao mais fraco.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-muted-foreground">Peso estatístico</Label>
              <span className="font-mono font-semibold">{statWeight}%</span>
            </div>
            <Slider
              value={[statWeight]}
              onValueChange={([v]) => setStatWeight(v)}
              min={0} max={70} step={5}
              disabled={running}
            />
            <p className="text-[10px] text-muted-foreground">
              0% = puramente matemático · 70% = prioriza dezenas quentes/atrasadas
            </p>

            <div className="flex items-center justify-between text-xs pt-2">
              <Label className="text-muted-foreground">Best-of-N (execuções)</Label>
              <span className="font-mono font-semibold">{runs}×</span>
            </div>
            <Slider
              value={[runs]}
              onValueChange={([v]) => setRuns(v)}
              min={1} max={7} step={1}
              disabled={running || tuning}
            />
            <p className="text-[10px] text-muted-foreground">
              Repete o pipeline N vezes e mantém o melhor (útil para Genético/SA).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Reduzir jogos dominados</Label>
                <p className="text-[11px] text-muted-foreground">
                  Tenta remover redundâncias; a cobertura é revalidada após a redução.
                </p>
              </div>
              <Switch checked={reduce} onCheckedChange={setReduce} disabled={running || tuning} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Refinamento fino (Auto-Tune)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Passada extra ±10% em passos de 2% ao redor do vencedor.
                </p>
              </div>
              <Switch checked={refine} onCheckedChange={setRefine} disabled={running || tuning} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runPipeline}
            disabled={running || tuning || disabled || !request}
            className="min-w-[200px]"
          >
            {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…</>
                     : <><Zap className="mr-2 h-4 w-4" /> Executar Pipeline</>}
          </Button>
          <Button
            variant="outline"
            onClick={runAutoTune}
            disabled={running || tuning || disabled || !request}
          >
            {tuning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ajustando…</>
                    : <><Sparkles className="mr-2 h-4 w-4" /> Auto-Tune</>}
          </Button>
          {report && (
            <Button variant="secondary" onClick={apply}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aplicar ao fechamento
            </Button>
          )}
        </div>

        {(running || tuning) && <Progress value={undefined} className="h-1.5" />}

        {request && (
          <ClosingAdaptivePresets
            lotteryId={request.lottery.id}
            current={{ statWeight, reduce, refine, runs }}
            meta={report ? { games: report.chosen.gameCount, cost: report.chosen.cost, adaptive: report.strategies[0]?.adaptive } : undefined}
            onApply={applyPreset}
            onAutoLoadDefault={autoLoadDefault}
            disabled={running || tuning}
          />
        )}

        {bestOfNRuns && bestOfNRuns.length > 1 && (
          <div className="rounded-lg border bg-background/60 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Best-of-{bestOfNRuns.length} · resultados por execução
            </div>
            <div className="flex flex-wrap gap-2">
              {bestOfNRuns.map((r, i) => {
                const isBest = r.adaptive === Math.max(...bestOfNRuns.map(x => x.adaptive));
                return (
                  <div
                    key={i}
                    className={`min-w-[72px] rounded-md border p-2 text-center ${
                      isBest ? "border-emerald-500/40 bg-emerald-500/10" : "border-border"
                    }`}
                  >
                    <div className="text-[10px] text-muted-foreground">Run {i + 1}</div>
                    <div className={`font-mono text-sm font-bold ${isBest ? "text-emerald-500" : "text-primary"}`}>
                      {r.adaptive.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{r.games}j</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {tuneSweep && (
          <div className="rounded-lg border bg-background/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Varredura de peso estatístico
              </div>
              {refinedSweep && (
                <Badge variant="outline" className="text-[10px]">
                  {tuneSweep.filter(s => s.refined).length} pontos refinados
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tuneSweep.map(s => {
                const isBest = Math.round(s.weight * 100) === statWeight;
                return (
                  <div
                    key={s.weight}
                    className={`min-w-[64px] rounded-md border p-2 text-center ${
                      isBest ? "border-primary bg-primary/10"
                             : s.refined ? "border-primary/40 bg-primary/5"
                                          : "border-border"
                    }`}
                    title={s.refined ? "Refinamento fino" : "Varredura ampla"}
                  >
                    <div className="text-[10px] text-muted-foreground">
                      {(s.weight * 100).toFixed(0)}%{s.refined && <span className="ml-0.5 text-primary">•</span>}
                    </div>
                    <div className="font-mono text-sm font-bold text-primary">{s.adaptive.toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground">{s.games}j</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tuneDelta && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Ganho vs baseline matemático (peso 0%)
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <DeltaCell
                label="Nota adaptativa"
                value={tuneDelta.adaptiveGain > 0 ? `+${tuneDelta.adaptiveGain}` : `${tuneDelta.adaptiveGain}`}
                positive={tuneDelta.adaptiveGain > 0}
                sub={`base ${tuneDelta.baselineAdaptive.toFixed(1)}`}
              />
              <DeltaCell
                label="Jogos"
                value={tuneDelta.gamesGain > 0 ? `-${tuneDelta.gamesGain}` : tuneDelta.gamesGain < 0 ? `+${-tuneDelta.gamesGain}` : "="}
                positive={tuneDelta.gamesGain > 0}
                sub={`base ${tuneDelta.baselineGames}j`}
              />
              <DeltaCell
                label="Custo"
                value={tuneDelta.costGain > 0 ? `-${formatCurrency(tuneDelta.costGain)}` : tuneDelta.costGain < 0 ? `+${formatCurrency(-tuneDelta.costGain)}` : "="}
                positive={tuneDelta.costGain > 0}
                sub={`base ${formatCurrency(tuneDelta.baselineCost)}`}
              />
            </div>
          </div>
        )}

        {report && (
          <div className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-4">
              <KPI icon={Trophy} label="Estratégia vencedora" value={STRATEGY_LABEL[report.chosen.strategy]} tone="amber" />
              <KPI icon={TrendingUp} label="Jogos finais" value={String(report.chosen.gameCount)} tone="emerald" />
              <KPI icon={Filter} label="Redução" value={report.droppedGames > 0 ? `-${report.droppedGames}` : "—"} tone={report.droppedGames > 0 ? "sky" : "slate"} />
              <KPI icon={CheckCircle2} label="Custo" value={formatCurrency(report.chosen.cost)} tone="primary" />
            </div>

            {!report.guaranteeIntact && (
              <Alert variant="destructive">
                <AlertDescription>
                  Não foi possível reduzir mantendo a garantia. Resultado sem redução.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border bg-background/60 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Etapas
              </div>
              {report.steps.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">{i + 1}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">— {s.detail}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{s.elapsedMs.toFixed(0)}ms</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-background/60 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ranking das estratégias
              </div>
              <div className="space-y-1.5">
                {report.strategies.map((s, i) => (
                  <div key={s.strategy} className="grid grid-cols-[24px_1fr_60px_60px_80px] items-center gap-2 text-xs">
                    <Badge variant={i === 0 ? "default" : "outline"} className="justify-center px-1.5">{i + 1}</Badge>
                    <span className="font-medium">{STRATEGY_LABEL[s.strategy]}</span>
                    <span className="font-mono text-muted-foreground">Mat: {s.overall}</span>
                    <span className="font-mono text-primary">Adp: {s.adaptive}</span>
                    <span className="font-mono text-right text-muted-foreground">{s.games}j · {formatCurrency(s.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPI({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tone: "amber" | "emerald" | "sky" | "slate" | "primary";
}) {
  const map: Record<string, string> = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-500",
    slate: "border-slate-500/30 bg-slate-500/10 text-muted-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
  };
  return (
    <div className={`rounded-lg border p-3 ${map[tone]}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-lg font-bold font-mono">{value}</div>
    </div>
  );
}

function DeltaCell({
  label, value, positive, sub,
}: {
  label: string; value: string; positive: boolean; sub: string;
}) {
  return (
    <div className={`rounded-md border p-2 ${positive ? "border-emerald-500/30 bg-emerald-500/10" : "border-border bg-background/40"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono text-base font-bold ${positive ? "text-emerald-500" : "text-muted-foreground"}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
