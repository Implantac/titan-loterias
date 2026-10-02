import { useState, lazy, Suspense, useMemo } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { m, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Target, Settings2, Hash, Play, Save, History as HistoryIcon, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSavedBets } from "@/hooks/useSavedBets";
import { useGenerationHistory } from "@/hooks/useGenerationHistory";
import { runIntelligentPipeline } from "@/ai/knowledge/strategiesLibrary";
import { evaluateBetQuality } from "@/engine/stats/bet-quality";
import { computeFrequencyStats } from "@/engine/stats/statistics";
import { toast } from "sonner";
import { DrawTestDialog } from "@/components/lottery/DrawTestDialog";
import { QuickBacktestDialog } from "@/components/lottery/QuickBacktestDialog";
import { StrategyComparePanel } from "@/components/gerador/StrategyComparePanel";
import { JackpotFocusPanel } from "@/components/gerador/JackpotFocusPanel";

type HistoryWindow = "all" | "10" | "20" | "50";
const WINDOW_OPTIONS: { value: HistoryWindow; label: string; hint: string }[] = [
  { value: "10", label: "Últimos 10", hint: "Tendência imediata" },
  { value: "20", label: "Últimos 20", hint: "Curto prazo" },
  { value: "50", label: "Últimos 50", hint: "Médio prazo" },
  { value: "all", label: "Histórico Total", hint: "Probabilidade real" },
];

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const GeradorPage = () => {
  const { config, stats, draws, selectedLottery, setSelectedLottery } = useLotteryContext();
  const { saveBet } = useSavedBets(selectedLottery);
  const { saveGeneration } = useGenerationHistory(selectedLottery);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [strategy, setStrategy] = useState<string>("consensus");

  useEffect(() => {
    if (location.state?.fromOnboarding) {
      if (location.state.lotteryId && location.state.lotteryId !== selectedLottery) {
        setSelectedLottery(location.state.lotteryId);
      }
      setStep(2);
    }
  }, [location.state, selectedLottery, setSelectedLottery]);




  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>("all");

  const scopedDraws = useMemo(() => {
    if (historyWindow === "all") return draws;
    const n = parseInt(historyWindow, 10);
    return draws.slice(0, Math.min(n, draws.length));
  }, [draws, historyWindow]);

  // Sempre recomputa stats a partir de scopedDraws para garantir consistência
  // com a janela selecionada (inclusive "Histórico Total").
  const scopedStats = useMemo(() => {
    if (scopedDraws.length === 0) return stats;
    return computeFrequencyStats(scopedDraws, config.numbers);
  }, [scopedDraws, stats, config.numbers]);

  const STRATEGIES = [
    { id: "consensus", name: "Consenso Multi-Estratégia", desc: "Agrega 6 estratégias por Borda Count ponderado. Números com convergência em múltiplos modelos ganham boost. Recomendada." },
    ...(selectedLottery === "lotofacil"
      ? [{ id: "lotofacil_jackpot", name: "🎯 Lotofácil Jackpot (15 pontos)", desc: "Exclusiva Lotofácil: repetição forte do anterior, moldura×miolo, grade 5×5 balanceada, viés oficial, primos e múltiplos de 3. Caça os 15 acertos." }]
      : []),
    ...(selectedLottery === "megasena"
      ? [{ id: "mega_jackpot", name: "🔥 Mega Jackpot (Sena)", desc: "Exclusiva Mega-Sena: pool enxuto de 22 dezenas, foco na faixa 51-60, atraso qualificado, viés oficial e baixa repetição. Caça os 6 acertos." }]
      : []),
    ...(selectedLottery === "quina"
      ? [{ id: "quina_jackpot", name: "⭐ Quina Jackpot (5 acertos)", desc: "Exclusiva Quina: pool de 18 dezenas distribuído pelos 4 quartis do volante, viés oficial, atraso qualificado e baixa repetição. Caça os 5 acertos." }]
      : []),
    ...(selectedLottery === "duplasena"
      ? [{ id: "duplasena_jackpot", name: "🎲 Dupla Sena Jackpot", desc: "Exclusiva Dupla Sena: pool de 20 dezenas balanceado nas metades do volante, aproveitando os 2 sorteios por concurso, viés oficial e atraso qualificado." }]
      : []),
    ...(selectedLottery === "timemania"
      ? [{ id: "timemania_jackpot", name: "⚽ Timemania Jackpot (7 acertos)", desc: "Exclusiva Timemania: pool de 24 dezenas distribuído pelos 4 quartis do volante 80, viés oficial, atraso qualificado e boost de repetição." }]
      : []),
    ...(selectedLottery === "diadesorte"
      ? [{ id: "diadesorte_jackpot", name: "☀️ Dia de Sorte Jackpot (7 acertos)", desc: "Exclusiva Dia de Sorte: pool de 16 dezenas balanceado nas metades do volante 31, viés oficial, atraso curto e boost em primos/Fibonacci." }]
      : []),
    ...(selectedLottery === "lotomania"
      ? [{ id: "lotomania_jackpot", name: "🔥 Lotomania Jackpot (20 acertos)", desc: "Exclusiva Lotomania: pool amplo de 65 dezenas distribuído pelas 10 dezenas do volante 100, viés oficial e boost de repetição alta (média 20-30)." }]
      : []),

    { id: "balance", name: "Aposta Equilibrada", desc: "Equilibra pares, ímpares, soma e faixas de dezenas com base no histórico." },
    { id: "hot_cold", name: "Quente-Frio", desc: "Combina viés oficial, atraso e frequência recente. Ideal para qualquer loteria." },
    { id: "repetition", name: "Repetição do Anterior", desc: "Aproveita o viés de repetição do último sorteio (ex.: 8-10 dezenas na Lotofácil)." },
    { id: "frequency", name: "Frequência Histórica", desc: "Prioriza números mais sorteados, com boost por frequência recente." },
    { id: "delay", name: "Números Atrasados", desc: "Foca em números que não saem há tempo, ponderando ciclos." },
    { id: "dispersion", name: "Dispersão no Volante", desc: "Espalha as dezenas por todas as faixas do volante." },
    { id: "anti_pattern", name: "Anti-Padrões", desc: "Evita sequências e padrões visuais óbvios (baixa concorrência em rateio)." },
    { id: "coverage", name: "Cobertura Máxima", desc: "Combina frequência, atraso, primos e Fibonacci para cobrir mais faixas." },
    { id: "predictive", name: "Estatística Preditiva", desc: "Foco em tendências de alta probabilidade baseadas em IA." },
    { id: "aggressive", name: "Aposta IA Premium", desc: "Modelos avançados para busca de convergência máxima." },
    { id: "conservative", name: "Aposta Conservadora", desc: "Baseada em frequência histórica estável e ciclos de retorno." },
  ];


  const handleGenerate = async () => {
    if (scopedDraws.length === 0) {
      toast.error("Sem sorteios suficientes para a janela selecionada.");
      return;
    }
    setGenerating(true);
    // Artificial delay for premium feel
    setTimeout(async () => {
      try {
        const result = runIntelligentPipeline(scopedStats, scopedDraws, selectedLottery, strategy, quantity);
        if (!result.games || result.games.length === 0) {
          console.warn("[Gerador] Pipeline retornou 0 jogos", { strategy, quantity, draws: scopedDraws.length, stats: scopedStats.length });
          toast.error("Não foi possível gerar jogos com a estratégia atual. Tente outra estratégia ou janela.");
          return;
        }
        const processedResults = result.games.map(bet => {
          const quality = evaluateBetQuality(bet, scopedStats, config, scopedDraws);
          return {
            numbers: bet,
            score: quality.overall,
            strategy: STRATEGIES.find(s => s.id === strategy)?.name || "Personalizada",
            grade: quality.grade,
            description: result.strategy.description,
            pipeline: result.pipeline
          };
        });
        setResults(processedResults);
        await saveGeneration(processedResults[0]);
        setStep(4);
      } catch (error) {
        console.error("[Gerador] Erro:", error);
        toast.error("Erro ao gerar jogos. Tente novamente.");
      } finally {
        setGenerating(false);
      }
    }, 1500);
  };

  const handleSaveAll = async () => {
    for (const res of results) {
      await saveBet({
        numbers: res.numbers,
        strategy: res.strategy,
        score: res.score,
        grade: res.grade
      });
    }
    toast.success(`${results.length} jogos salvos no seu portfólio!`);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Titan Engine</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Motor de <span className="gradient-brand-text">Geração de Apostas</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Análises baseadas em dados históricos, estatística e inteligência artificial para auxiliar sua tomada de decisão.
          </p>
        </div>
      </div>


      <div>
        <LotteryContextBanner />
      </div>

      <div className="px-2 space-y-3">
        <div className="flex justify-between items-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <div className="flex gap-6">
            <span className={step >= 1 ? "text-primary" : ""}>01. Dataset</span>
            <span className={step >= 2 ? "text-primary" : ""}>02. Engine</span>
            <span className={step >= 3 ? "text-primary" : ""}>03. Volume</span>
            <span className={step >= 4 ? "text-primary" : ""}>04. Resultado</span>
          </div>
          <span className="font-mono tabular-nums">{Math.round((step / 4) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
          <m.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <Card className="p-8 md:p-10 space-y-7 max-w-3xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                <HistoryIcon className="w-32 h-32" />
              </div>

              <div className="flex flex-col items-center text-center space-y-5 relative z-10">
                <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center shadow-gold">
                  <span className="text-4xl drop-shadow">{config.icon}</span>
                </div>

                <div className="space-y-2.5">
                  <Badge variant="outline" className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border-primary/30 text-primary">Etapa 01 · Dataset</Badge>
                  <h3 className="text-2xl font-bold tracking-tight">Sincronização: {config.name}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Base oficial atualizada com {draws.length} concursos. O motor está pronto para processar milhões de combinações.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-left">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <p className="text-sm font-semibold text-emerald-400">100% Sincronizada</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-left">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Último Concurso</p>
                    <p className="text-sm font-semibold font-mono tabular-nums">#{draws[0]?.concurso || '---'}</p>
                  </div>
                </div>

                <Button onClick={nextStep} variant="premium" size="lg" className="group w-full sm:w-auto">
                  Configurar Engine
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>

          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-6">
                <Badge variant="outline" className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border-primary/30 text-primary mb-2">Etapa 02 · Engine</Badge>
                <h3 className="text-2xl font-bold tracking-tight">Configurar Algoritmo</h3>
                <p className="text-sm text-muted-foreground">Selecione o modelo que o motor utilizará para processar as combinações.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setStrategy(s.id); nextStep(); }}
                    className={`p-5 rounded-xl border transition-all text-left flex items-start gap-4 hover:border-primary/50 group relative overflow-hidden ${
                      strategy === s.id ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-card"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      strategy === s.id ? "bg-primary text-primary-foreground" : "bg-muted/50 group-hover:bg-primary/15 group-hover:text-primary"
                    }`}>
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-base tracking-tight mb-1">{s.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-start">
                <Button variant="ghost" size="sm" onClick={prevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <Card className="p-8 space-y-7 max-w-3xl mx-auto">
              <div className="text-center space-y-2">
                <Badge variant="outline" className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border-primary/30 text-primary mb-2">Etapa 03 · Volume</Badge>
                <h3 className="text-2xl font-bold tracking-tight">Volume de Processamento</h3>
                <p className="text-sm text-muted-foreground">Quantas combinações deseja gerar?</p>
              </div>

              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Base de Análise · {scopedDraws.length} sorteios
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WINDOW_OPTIONS.map(opt => {
                    const active = historyWindow === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setHistoryWindow(opt.value)}
                        className={`text-left p-2.5 rounded-md border transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-background/40 hover:border-primary/50"
                        }`}
                      >
                        <div className="text-xs font-semibold">{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{opt.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>


              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 5, 10, 20].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`p-5 rounded-lg border transition-all font-bold text-2xl font-mono tabular-nums ${
                      quantity === q ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:border-primary/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={generating}
                  variant="premium"
                  className="px-12 group"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Gerar {quantity} Jogo{quantity > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={prevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Alterar Estratégia
                </Button>
              </div>
            </Card>
          )}

          {step === 4 && (
            <div className="space-y-7 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto border border-emerald-500/30 mb-3">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Predições Finalizadas</h3>
                <p className="text-sm text-muted-foreground">As combinações abaixo apresentam as maiores probabilidades estatísticas.</p>
              </div>

              <div className="space-y-3">
                {results.map((res, i) => (
                  <Card key={i} className="overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-primary" />
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {res.numbers.map((n: number) => (
                            <div key={n} className="lottery-ball">
                              {String(n).padStart(2, '0')}
                            </div>

                          ))}
                        </div>
                        <div className="flex items-center gap-5 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Titan Score</p>
                            <p className={`text-2xl font-bold font-mono tabular-nums leading-none ${res.score >= 90 ? 'text-emerald-400' : res.score >= 75 ? 'text-primary' : 'text-amber-400'}`}>{res.score}<span className="text-sm text-muted-foreground">/100</span></p>
                            <p className="text-[10px] font-medium uppercase text-emerald-400/90 tracking-wider mt-1">{res.score >= 90 ? 'Excelente' : res.score >= 75 ? 'Alta Convergência' : 'Estável'}</p>
                          </div>
                          <DrawTestDialog numbers={res.numbers} />
                          <QuickBacktestDialog numbers={res.numbers} lotteryId={selectedLottery} />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              saveBet({ numbers: res.numbers, strategy: res.strategy, score: res.score, grade: res.grade });
                              toast.success("Jogo salvo!");
                            }}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <JackpotFocusPanel
                stats={scopedStats}
                draws={scopedDraws}
                config={config}
                selectedLottery={selectedLottery}
              />

              <StrategyComparePanel
                stats={scopedStats}
                draws={scopedDraws}
                config={config}
                selectedLottery={selectedLottery}
                strategies={STRATEGIES}
              />


              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button variant="premium" size="lg" className="px-8 gap-2" onClick={handleSaveAll}>
                  <Save className="w-4 h-4" />
                  Salvar Todos no Portfólio
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 gap-2"
                  onClick={() => {
                    const union = [...new Set(results.flatMap((r: any) => r.numbers as number[]))].sort((a, b) => a - b);
                    if (union.length < config.pick) {
                      toast.error(`Base insuficiente (${union.length}/${config.pick}). Gere mais jogos.`);
                      return;
                    }
                    navigate("/fechamento-universal", { state: { baseNumbers: union, fromGerador: true } });
                  }}
                >
                  <Layers className="w-4 h-4" />
                  Aplicar Fechamento
                </Button>
                <Button variant="outline" size="lg" className="px-8" onClick={() => setStep(1)}>
                  Novo Ciclo de Geração
                </Button>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
};

export default GeradorPage;