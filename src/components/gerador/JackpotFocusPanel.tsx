import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Save, Flame, Layers, History, Zap, Target } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { runIntelligentPipeline } from "@/ai/knowledge/strategiesLibrary";
import { evaluateBetQuality } from "@/engine/stats/bet-quality";
import type { NumberStats } from "@/engine/stats/statistics";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import { useSavedBets } from "@/hooks/useSavedBets";
import { QuickBacktestDialog } from "@/components/lottery/QuickBacktestDialog";
import { countHits } from "@/engine/validation/backtestRunner";
import { getPrizeTiers } from "@/services/api/lottery";
import { useEnginePerformance } from "@/hooks/useEnginePerformance";
import { pickBestMatrix } from "@/engine/closing/autoMatrix";
import { computeLotofacilSignals } from "@/ai/lotofacil/signals";
import { JackpotConfidencePanel } from "@/components/gerador/JackpotConfidencePanel";


interface Props {
  stats: NumberStats[];
  draws: DrawResult[];
  config: LotteryConfig;
  selectedLottery: string;
}

const JACKPOT_BY_LOTTERY: Record<string, { id: string; name: string; hint: string }> = {
  lotofacil: { id: "lotofacil_jackpot", name: "🎯 Lotofácil Jackpot", hint: "Caça 15 pontos" },
  megasena: { id: "mega_jackpot", name: "🔥 Mega Jackpot", hint: "Caça 6 pontos" },
  quina: { id: "quina_jackpot", name: "⭐ Quina Jackpot", hint: "Caça 5 pontos" },
  duplasena: { id: "duplasena_jackpot", name: "🎲 Dupla Sena Jackpot", hint: "2 sorteios" },
  timemania: { id: "timemania_jackpot", name: "⚽ Timemania Jackpot", hint: "Caça 7 pontos" },
  diadesorte: { id: "diadesorte_jackpot", name: "☀️ Dia de Sorte Jackpot", hint: "Caça 7 pontos" },
  lotomania: { id: "lotomania_jackpot", name: "🔥 Lotomania Jackpot", hint: "Caça 20 pontos" },
};

interface Row {
  numbers: number[];
  score: number;
  grade: string;
  strengths: string[];
  signals?: { label: string; ok: boolean; hint: string }[];
}

// Sinais Lotofácil são delegados a `@/ai/lotofacil/signals` (fonte única).


function computeDecadeSignals(nums: number[], draws: DrawResult[], config: LotteryConfig): Row["signals"] {
  const sum = nums.reduce((a, b) => a + b, 0);
  const decades = new Set(nums.map((n) => Math.floor((n - 1) / 10)));
  const totalDecades = Math.ceil(config.numbers / 10);
  const odd = nums.filter((n) => n % 2 === 1).length;
  const sorted = [...nums].sort((a, b) => a - b);
  const hasConsec = sorted.some((n, i) => i > 0 && n - sorted[i - 1] === 1);
  const last = draws[0]?.numbers ?? [];
  const reps = last.filter((n) => nums.includes(n)).length;
  // ideal sum ≈ pick * (maxNumber + 1) / 2, tolerate ±15%
  const idealSum = (config.pick * (config.numbers + 1)) / 2;
  const sumOk = Math.abs(sum - idealSum) / idealSum <= 0.15;
  const parityOk = odd >= Math.floor(config.pick / 2) - 1 && odd <= Math.ceil(config.pick / 2) + 1;
  return [
    { label: `Soma ${sum}`, ok: sumOk, hint: `Ideal ≈ ${Math.round(idealSum)} (±15%)` },
    { label: `${decades.size}/${totalDecades} dez.`, ok: decades.size >= Math.min(totalDecades, config.pick - 1), hint: "Cobertura de dezenas" },
    { label: `${odd}P/${config.pick - odd}I`, ok: parityOk, hint: "Equilíbrio par/ímpar" },
    { label: hasConsec ? "Consec. ✓" : "Sem consec.", ok: true, hint: "Padrão observado (informativo)" },
    { label: `Repete ${reps}`, ok: reps <= Math.ceil(config.pick / 2), hint: "Repetição moderada do último sorteio" },
  ];
}

const BATCH_BY_LOTTERY: Record<string, number> = {
  lotofacil: 30, // filtros mais rígidos → lote maior p/ selecionar top 3 de alta qualidade
  megasena: 12,
  quina: 12,
  duplasena: 12,
  timemania: 12,
  diadesorte: 10,
  lotomania: 8,
};
const TOP_N = 3;
const ACUMULOU_MULT = 2; // dobra o lote no Modo Acumulou
const ACUMULOU_TOP = 5; // devolve top 5 quando acumulado

export function JackpotFocusPanel({ stats, draws, config, selectedLottery }: Props) {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [acumulou, setAcumulou] = useState(false);
  const [minPresencePct, setMinPresencePct] = useState(60); // 0-100
  const { saveBet } = useSavedBets(selectedLottery);
  const { logGeneration } = useEnginePerformance();
  const navigate = useNavigate();

  const jackpot = useMemo(() => JACKPOT_BY_LOTTERY[selectedLottery], [selectedLottery]);
  const baseBatch = BATCH_BY_LOTTERY[selectedLottery] ?? 10;
  const BATCH = acumulou ? baseBatch * ACUMULOU_MULT : baseBatch;
  const topN = acumulou ? ACUMULOU_TOP : TOP_N;

  // ATENÇÃO: este `return null` NÃO pode vir antes dos hooks abaixo.
  // `JACKPOT_BY_LOTTERY` não cobre supersete/maismilionaria/federal, então o
  // retorno antecipado mudava o número de hooks entre renders e o React
  // abortava com "Rendered fewer hooks than expected" ao trocar de loteria.
  const unionBase = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => r.numbers.forEach((n) => set.add(n)));
    return Array.from(set).sort((a, b) => a - b);
  }, [rows]);

  const consensus = useMemo(() => {
    const freq = new Map<number, number>();
    rows.forEach((r) => r.numbers.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1)));
    return Array.from(freq.entries())
      .map(([n, c]) => ({ n, c }))
      .sort((a, b) => b.c - a.c || a.n - b.n);
  }, [rows]);

  const anchorBase = useMemo(() => {
    if (rows.length === 0) return [] as number[];
    const threshold = Math.max(1, Math.ceil((minPresencePct / 100) * rows.length));
    return consensus.filter((c) => c.c >= threshold).map((c) => c.n).sort((a, b) => a - b);
  }, [consensus, rows.length, minPresencePct]);

  const [showBacktest, setShowBacktest] = useState(false);
  const aggregate = useMemo(() => {
    if (!showBacktest || rows.length === 0 || draws.length === 0) return null;
    const window = draws.slice(0, Math.min(50, draws.length));
    const tiers = getPrizeTiers(selectedLottery);
    const tierHits = new Map<number, number>();
    let totalHits = 0;
    let best = { concurso: 0, hits: 0, rowIndex: 0 };
    let comparisons = 0;
    for (const d of window) {
      for (let i = 0; i < rows.length; i++) {
        const h = countHits(rows[i].numbers, d.numbers);
        totalHits += h;
        comparisons++;
        if (h > best.hits) best = { concurso: d.concurso, hits: h, rowIndex: i };
        if (tiers.some((t) => t.hits === h)) {
          tierHits.set(h, (tierHits.get(h) ?? 0) + 1);
        }
      }
    }
    return {
      window: window.length,
      avgHits: comparisons ? totalHits / comparisons : 0,
      best,
      tierHits: Array.from(tierHits.entries())
        .map(([hits, count]) => ({ hits, count, label: tiers.find((t) => t.hits === hits)?.label ?? `${hits} acertos` }))
        .sort((a, b) => b.hits - a.hits),
    };
  }, [showBacktest, rows, draws, selectedLottery]);


  const sendToFechamento = () => {
    if (unionBase.length < config.pick + 1) {
      toast.error(`União do Top ${rows.length} tem só ${unionBase.length} números. Rode novamente ou salve individualmente.`);
      return;
    }
    navigate("/fechamento-universal", { state: { baseNumbers: unionBase, fromGerador: true } });
    toast.success(`Base de ${unionBase.length} números enviada ao Fechamento Universal.`);
  };

  const sendAnchorsToFechamento = () => {
    if (anchorBase.length < config.pick + 1) {
      toast.error(`Consenso ≥${minPresencePct}% tem só ${anchorBase.length} números. Reduza o limiar.`);
      return;
    }
    navigate("/fechamento-universal", { state: { baseNumbers: anchorBase, fromGerador: true } });
    toast.success(`Base de consenso (${anchorBase.length} números ≥${minPresencePct}%) enviada ao Fechamento.`);
  };

  const autoCloseSuggestion = useMemo(() => {
    if (anchorBase.length < config.pick + 1) return null;
    return pickBestMatrix({
      lotteryId: selectedLottery,
      availableBaseSize: anchorBase.length,
      budget: 100,
    });
  }, [anchorBase.length, selectedLottery, config.pick]);

  const run = () => {
    if (draws.length === 0) {
      toast.error("Sincronize os concursos primeiro.");
      return;
    }
    setRunning(true);
    setTimeout(() => {
      try {
        const r = runIntelligentPipeline(stats, draws, selectedLottery, jackpot.id, BATCH);
        if (!r.games?.length) {
          toast.error("Nenhum jogo gerado.");
          setRunning(false);
          return;
        }
        const seen = new Set<string>();
        const scored: Row[] = [];
        for (const g of r.games) {
          const key = g.slice().sort((a, b) => a - b).join(",");
          if (seen.has(key)) continue;
          seen.add(key);
          const q = evaluateBetQuality(g, stats, config, draws);
          const signals = selectedLottery === "lotofacil"
            ? computeLotofacilSignals(g, draws)
            : computeDecadeSignals(g, draws, config);
          scored.push({ numbers: g, score: q.overall, grade: q.grade, strengths: q.strengths ?? [], signals });
        }
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, topN);
        setRows(top);
        // Registra o lote no log de performance do motor (fire-and-forget)
        logGeneration({
          lotteryId: selectedLottery,
          games: top.map((r) => r.numbers),
          config: {
            strategy: jackpot.id,
            acumulou,
            batch: BATCH,
            topN,
            minPresencePct,
          },
          label: `${jackpot.name}${acumulou ? " · Acumulou" : ""} · Consenso ${minPresencePct}%`,
        }).catch(() => {});
      } catch (e) {
        console.error("[JackpotFocus]", e);
        toast.error("Falha ao gerar lote jackpot.");
      } finally {
        setRunning(false);
      }
    }, 700);
  };

  const saveAll = async () => {
    for (const r of rows) {
      await saveBet({ numbers: r.numbers, strategy: jackpot.name, score: r.score, grade: r.grade });
    }
    toast.success(`${rows.length} jogos jackpot salvos!`);
  };

  if (!jackpot) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                Modo Caça-Jackpot
                <Badge variant="outline" className="text-[10px] font-normal">{jackpot.hint}</Badge>
                {acumulou && (
                  <Badge className="text-[10px] font-normal bg-amber-500/20 text-amber-500 border-amber-500/40 gap-1">
                    <Zap className="w-3 h-3" /> ACUMULOU
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Gera {BATCH} jogos com {jackpot.name} e devolve os {topN} melhores pelo Titan Score.
                {acumulou && " • Lote dobrado + Top 5 para caçar o prêmio principal."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/[0.03]">
              <Zap className={`w-3.5 h-3.5 ${acumulou ? "text-amber-500" : "text-muted-foreground"}`} />
              <Label htmlFor="acumulou-mode" className="text-xs cursor-pointer">Modo Acumulou</Label>
              <Switch id="acumulou-mode" checked={acumulou} onCheckedChange={setAcumulou} />
            </div>

            {rows.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={sendToFechamento} className="gap-2">
                  <Layers className="w-4 h-4" /> Enviar união ao Fechamento ({unionBase.length})
                </Button>
                <Button size="sm" variant="outline" onClick={saveAll} className="gap-2">
                  <Save className="w-4 h-4" /> Salvar Top {rows.length}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowBacktest((v) => !v)} className="gap-2">
                  <History className="w-4 h-4" /> {showBacktest ? "Ocultar" : "Backtest"} agregado
                </Button>
              </>
            )}
            <Button size="sm" variant="premium" onClick={run} disabled={running} className="gap-2">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
              {running ? "Caçando..." : "Rodar Caça-Jackpot"}
            </Button>
          </div>
        </div>

        <JackpotConfidencePanel
          strategyId={`${selectedLottery}:${jackpot.id}`}
          strategyName={jackpot.name}
          config={config}
          draws={draws}
          topOne={rows[0]?.numbers}
        />

        {rows.length > 0 && consensus.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consenso Top {rows.length} — dezenas âncora
              </span>
              <span className="text-[10px] text-muted-foreground">
                intensidade = presença nos jogos
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {consensus.map(({ n, c }) => {
                const pct = c / rows.length;
                const isAnchor = anchorBase.includes(n);
                return (
                  <span
                    key={n}
                    title={`Aparece em ${c}/${rows.length} jogos (${Math.round(pct * 100)}%)${isAnchor ? " · âncora" : ""}`}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold transition-all ${isAnchor ? "ring-2 ring-primary/60" : ""}`}
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${0.08 + pct * 0.55})`,
                      borderColor: `hsl(var(--primary) / ${0.25 + pct * 0.5})`,
                      color: pct >= 0.66 ? "hsl(var(--primary))" : undefined,
                    }}
                  >
                    {String(n).padStart(2, "0")}
                    <sup className="text-[8px] ml-0.5 opacity-70">{c}</sup>
                  </span>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                  <Label className="text-xs shrink-0">Limiar de consenso</Label>
                  <Slider
                    value={[minPresencePct]}
                    min={33}
                    max={100}
                    step={1}
                    onValueChange={(v) => setMinPresencePct(v[0])}
                    className="flex-1 max-w-[220px]"
                  />
                  <Badge variant="outline" className="text-[10px] font-mono tabular-nums shrink-0">
                    ≥{minPresencePct}% · {anchorBase.length} dezenas
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="premium"
                  onClick={sendAnchorsToFechamento}
                  disabled={anchorBase.length < config.pick + 1}
                  className="gap-2"
                >
                  <Target className="w-4 h-4" /> Enviar consenso ao Fechamento
                </Button>
              </div>
              {autoCloseSuggestion?.best && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/[0.04] px-2 py-1.5 text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold">Fechamento auto:</span>
                    <span className="truncate">
                      {autoCloseSuggestion.best.name} · {autoCloseSuggestion.best.gameCount} jogos · garantia {autoCloseSuggestion.best.guarantee} pts
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-primary shrink-0">
                    R$ {autoCloseSuggestion.best.cost.toFixed(2)}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                A base de consenso é mais enxuta que a união do Top {rows.length}: só entram dezenas presentes em pelo menos {minPresencePct}% dos jogos, gerando fechamentos com menor custo e maior densidade estatística.
              </p>
            </div>
          </div>
        )}

        {showBacktest && aggregate && (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Backtest agregado · últimos {aggregate.window} concursos × Top {rows.length}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-border/60 bg-card p-2">
                <div className="text-muted-foreground text-[10px] uppercase">Média de acertos</div>
                <div className="font-mono tabular-nums text-base font-semibold">{aggregate.avgHits.toFixed(2)}</div>
              </div>
              <div className="rounded border border-border/60 bg-card p-2">
                <div className="text-muted-foreground text-[10px] uppercase">Melhor jogo</div>
                <div className="font-mono tabular-nums text-base font-semibold">
                  {aggregate.best.hits} pts <span className="text-muted-foreground text-[10px]">#{aggregate.best.rowIndex + 1} · c.{aggregate.best.concurso}</span>
                </div>
              </div>
              <div className="rounded border border-border/60 bg-card p-2">
                <div className="text-muted-foreground text-[10px] uppercase">Faixas premiadas</div>
                <div className="font-mono tabular-nums text-base font-semibold">
                  {aggregate.tierHits.reduce((s, t) => s + t.count, 0)}
                </div>
              </div>
            </div>
            {aggregate.tierHits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {aggregate.tierHits.map((t) => (
                  <Badge key={t.hits} variant="outline" className="text-[10px] font-mono">
                    {t.label}: {t.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}


        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 flex flex-col gap-2 ${
                  i === 0 ? "border-primary/50 bg-primary/[0.05]" : "border-border/60 bg-card"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <span className="text-xs font-mono tabular-nums text-muted-foreground w-5">#{i + 1}</span>
                    {i === 0 && <Trophy className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {r.numbers.map((n) => (
                      <span
                        key={n}
                        className="w-7 h-7 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold"
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono tabular-nums">
                      {r.score}/100 · {r.grade}
                    </Badge>
                    <QuickBacktestDialog
                      numbers={r.numbers}
                      lotteryId={selectedLottery}
                      trigger={
                        <Button size="icon" variant="outline" title="Backtest histórico">
                          <History className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      title="Salvar jogo"
                      onClick={async () => {
                        await saveBet({ numbers: r.numbers, strategy: jackpot.name, score: r.score, grade: r.grade });
                        toast.success("Jogo salvo!");
                      }}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {r.signals && r.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                    {r.signals.map((s, si) => (
                      <span
                        key={si}
                        title={s.hint}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          s.ok
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-destructive/30 bg-destructive/5 text-destructive/80"
                        }`}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
