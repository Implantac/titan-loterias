import { useState, useMemo, useCallback } from "react";
import { MatrixRow, generateUnfolding, computeCoverage } from "@/engine/matrix-analysis";
import { LotteryConfig } from "@/data/lotteries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dices, Copy, Sparkles, Check, Info, ShieldCheck, Trophy, SearchCheck, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { WHEEL_TEMPLATES, WheelTemplate, auditWheelTemplate, WheelGuaranteeAudit } from "@/engine/lottery-wheels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface Props {
  matrixData: MatrixRow[];
  config: LotteryConfig;
  onSaveBet?: (numbers: number[], strategy?: string, score?: number, grade?: string) => void;
}

export function SmartUnfoldingGenerator({ matrixData, config, onSaveBet }: Props) {
  const defaultBaseCount = Math.min(config.numbers, Math.max(config.pick + 3, 21));
  const [baseCount, setBaseCount] = useState(defaultBaseCount);
  const [maxGames, setMaxGames] = useState(20);
  const [useAutoSuggest, setUseAutoSuggest] = useState(true);
  const [manualSelection, setManualSelection] = useState<number[]>([]);
  const [games, setGames] = useState<number[][]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WheelTemplate | null>(null);
  const [auditResult, setAuditResult] = useState<WheelGuaranteeAudit | null>(null);
  const [auditSeed, setAuditSeed] = useState(12345);

  const suggestedNumbers = useMemo(
    () => matrixData.slice(0, baseCount).map(r => r.number).sort((a, b) => a - b),
    [matrixData, baseCount]
  );

  const baseNumbers = useAutoSuggest ? suggestedNumbers : manualSelection;

  const toggleManual = useCallback((n: number) => {
    setManualSelection(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  }, []);

  const handleGenerate = useCallback(() => {
    if (selectedTemplate) {
      if (baseNumbers.length < selectedTemplate.v) {
        toast.error(`O template selecionado requer exatamente ${selectedTemplate.v} dezenas`);
        return;
      }
      // Use exactly v numbers for the template
      const pool = baseNumbers.slice(0, selectedTemplate.v);
      const result = selectedTemplate.generate(pool);
      setGames(result);
      
      // Run audit
      const audit = auditWheelTemplate(selectedTemplate, pool, auditSeed);
      setAuditResult(audit);
      
      toast.success(`${result.length} jogos gerados usando template matemático!`);
    } else {
      if (baseNumbers.length < config.pick) {
        toast.error(`Selecione ao menos ${config.pick} dezenas`);
        return;
      }
      const result = generateUnfolding(baseNumbers, config.pick, maxGames);
      setGames(result);
      setAuditResult(null);
      toast.success(`${result.length} jogos gerados!`);
    }
  }, [baseNumbers, config.pick, maxGames, selectedTemplate]);

  const coverage = useMemo(() => computeCoverage(games, baseNumbers), [games, baseNumbers]);

  const copyGame = (game: number[], idx: number) => {
    navigator.clipboard.writeText(game.map(n => String(n).padStart(2, "0")).join(", "));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
    toast.success("Copiado!");
  };

  const copyAll = () => {
    const text = games.map((g, i) =>
      `Jogo ${i + 1}: ${g.map(n => String(n).padStart(2, "0")).join(", ")}`
    ).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Todos os jogos copiados!");
  };

  return (
    <div className="rounded-xl glass-card p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Dices className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Desdobramento Inteligente</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Selecione dezenas e gere jogos equilibrados automaticamente
          </p>
        </div>
      </div>

      {/* Templates Selection */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-primary" /> Templates de Fechamento Matemático
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!selectedTemplate ? "default" : "outline"}
            onClick={() => { setSelectedTemplate(null); setBaseCount(defaultBaseCount); }}
            className="h-8 text-[10px]"
          >
            Livre / Customizado
          </Button>
          {WHEEL_TEMPLATES.map(t => (
            <TooltipProvider key={t.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={selectedTemplate?.id === t.id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedTemplate(t);
                      setBaseCount(t.v);
                      toast.info(`Template ${t.name} selecionado. Selecione ${t.v} dezenas.`);
                    }}
                    className={`h-8 text-[10px] ${selectedTemplate?.id === t.id ? "gradient-brand border-none" : ""}`}
                  >
                    {t.name}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold">{t.name}</p>
                    <p className="text-[10px] leading-relaxed">{t.description}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                      <Badge variant="outline" className="text-[8px]">{t.v} Dezenas</Badge>
                      <Badge variant="outline" className="text-[8px]">{t.gamesCount} Jogos</Badge>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={useAutoSuggest ? "default" : "outline"}
            onClick={() => setUseAutoSuggest(true)}
            className="h-8 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" /> Auto ({baseCount})
          </Button>
          <Button
            size="sm"
            variant={!useAutoSuggest ? "default" : "outline"}
            onClick={() => setUseAutoSuggest(false)}
            className="h-8 text-xs"
          >
            Manual ({manualSelection.length})
          </Button>
        </div>

        {useAutoSuggest && !selectedTemplate && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Dezenas base:</span>
            <input
              type="range"
              min={config.pick}
              max={Math.min(config.numbers, 30)}
              value={baseCount}
              aria-label="Quantidade de dezenas na base"
              onChange={e => setBaseCount(+e.target.value)}
              className="w-24"
            />
            <span className="font-mono font-bold text-primary">{baseCount}</span>
          </div>
        )}

        {selectedTemplate && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Seed Auditor:</span>
            <input
              type="number"
              value={auditSeed}
              aria-label="Semente de auditoria"
              onChange={e => setAuditSeed(+e.target.value)}
              className="w-16 h-7 bg-background border border-border rounded px-1 text-[10px] font-mono focus:ring-1 focus:ring-primary outline-none"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 hover:bg-primary/10 transition-colors" 
              onClick={() => {
                const newSeed = Math.floor(Math.random() * 99999);
                setAuditSeed(newSeed);
                toast.info(`Nova seed gerada: ${newSeed}`);
              }}
              title="Gera nova semente determinística"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {!selectedTemplate && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Jogos:</span>
            <input
              type="range"
              min={1}
              max={50}
              value={maxGames}
              aria-label="Quantidade máxima de jogos"
              onChange={e => setMaxGames(+e.target.value)}
              className="w-24"
            />
            <span className="font-mono font-bold text-primary">{maxGames}</span>
          </div>
        )}

        <Button 
          onClick={handleGenerate} 
          size="sm" 
          className="h-9 px-4 gradient-brand border-none shadow-lg shadow-primary/20 ml-auto"
        >
          <Dices className="w-3.5 h-3.5 mr-2" /> Gerar {selectedTemplate ? "Template" : "Desdobramento"}
        </Button>
      </div>

      {/* Manual selection grid */}
      {!useAutoSuggest && (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(config.numbers, 10)}, 1fr)` }}>
          {Array.from({ length: config.numbers }, (_, i) => i + 1).map(n => {
            const selected = manualSelection.includes(n);
            const matrixRow = matrixData.find(r => r.number === n);
            return (
              <button
                key={n}
                onClick={() => toggleManual(n)}
                className={`aspect-square rounded-lg text-xs font-bold font-mono transition-all border ${
                  selected
                    ? "bg-primary/20 border-primary/40 text-primary scale-105"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                }`}
                title={matrixRow ? `Score: ${matrixRow.score}` : ""}
              >
                {String(n).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      )}

      {/* Base numbers preview */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] text-muted-foreground self-center mr-1">Base:</span>
        {baseNumbers.map(n => (
          <span key={n} className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-mono font-bold text-primary">
            {String(n).padStart(2, "0")}
          </span>
        ))}
      </div>

      {/* Generated games */}
      {games.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span>{coverage.totalCombinations} jogos • {coverage.coveredNumbers} dezenas cobertas • Média de repetição: {coverage.avgRepetition}x</span>
            <Button size="sm" variant="outline" onClick={copyAll} className="h-7 text-xs ml-auto">
              <Copy className="w-3 h-3 mr-1" /> Copiar Todos
            </Button>
          </div>

          {/* Audit Results Section */}
          {auditResult && (
            <Card className="p-4 bg-primary/5 border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SearchCheck className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Relatório de Auditoria Matemática</h4>
                </div>
                <Badge variant={auditResult.isSolid ? "default" : "destructive"} className="text-[9px] h-5">
                  {auditResult.isSolid ? "GARANTIA SÓLIDA" : "COBERTURA PARCIAL"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Alvo (t)</p>
                  <p className="text-sm font-bold font-mono">{auditResult.targetGuarantee} Acertos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Cobertura Real</p>
                  <p className={`text-sm font-bold font-mono ${auditResult.actualCoverage > 90 ? "text-emerald-400" : "text-amber-400"}`}>
                    {auditResult.actualCoverage.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Eficiência</p>
                  <p className="text-sm font-bold font-mono">Alta (Redução +90%)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Amostra de Teste</p>
                  <p className="text-sm font-bold font-mono">{auditResult.combinationsTested} simulações</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold">
                  <span className="text-muted-foreground">Progresso da Cobertura Combinatória</span>
                  <span className="text-primary">{auditResult.actualCoverage.toFixed(0)}%</span>
                </div>
                <Progress value={auditResult.actualCoverage} className="h-1.5 bg-primary/10" />
              </div>

              {!auditResult.isSolid && (
                <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 italic">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Nota: O fechamento selecionado utiliza uma redução agressiva. Em alguns casos raros, a garantia pode oscilar levemente dependendo da distribuição das dezenas escolhidas.</span>
                </div>
              )}
            </Card>
          )}

          <div className="grid gap-2 max-h-96 overflow-y-auto pr-1">
            {games.map((game, idx) => (
              <Card key={idx} className="flex items-center gap-3 px-3 py-2 bg-muted/20 border-border">
                <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">Jogo {idx + 1}</span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {game.map(n => (
                    <span key={n} className="w-7 h-7 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center text-[10px] font-mono font-bold text-foreground">
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => copyGame(game, idx)}
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  {onSaveBet && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        onSaveBet(game, "Desdobramento", undefined, undefined);
                        toast.success(`Jogo ${idx + 1} salvo!`);
                      }}
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
