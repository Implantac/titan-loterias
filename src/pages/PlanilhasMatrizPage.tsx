import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Grid3X3, FileSpreadsheet, CheckCircle2, Save, Sparkles, Target, AlertTriangle, Table2 } from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { computeMatrixAnalysis } from "@/engine/matrix-analysis";
import {
  analyzeWorksheetGames,
  generateWorksheetMatrixGames,
  getPresetInputSize,
  LOTOFACIL_WORKSHEET_PRESETS,
  selectTopLotofacilNumbers,
} from "@/engine/worksheet-matrices";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";
import { EmptyState } from "@/components/common/EmptyState";
import { PlanGate } from "@/components/PlanGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDrawDate } from "@/lib/draw-date";

export default function PlanilhasMatrizPage() {
  const { config, draws, selectedLottery } = useLotteryContext();
  const { saveBet } = useSavedBets(selectedLottery);
  const [presetId, setPresetId] = useState(LOTOFACIL_WORKSHEET_PRESETS[0].id);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedDrawConcurso, setSelectedDrawConcurso] = useState<string>("latest");
  const [saving, setSaving] = useState(false);

  const matrixData = useMemo(() => computeMatrixAnalysis(draws, config.numbers), [draws, config.numbers]);
  const rankedNumbers = useMemo(() => matrixData.map((row) => row.number), [matrixData]);
  const preset = LOTOFACIL_WORKSHEET_PRESETS.find((item) => item.id === presetId) ?? LOTOFACIL_WORKSHEET_PRESETS[0];
  const inputSize = getPresetInputSize(preset);

  const selectedDraw = useMemo(() => {
    if (selectedDrawConcurso === "latest") return draws[0] ?? null;
    return draws.find((draw) => String(draw.concurso) === selectedDrawConcurso) ?? draws[0] ?? null;
  }, [draws, selectedDrawConcurso]);

  const previousDraw = useMemo(() => {
    if (!selectedDraw) return null;
    const idx = draws.findIndex((draw) => draw.concurso === selectedDraw.concurso);
    return idx >= 0 ? draws[idx + 1] ?? null : null;
  }, [draws, selectedDraw]);

  const generatedGames = useMemo(
    () => generateWorksheetMatrixGames(preset, selectedNumbers),
    [preset, selectedNumbers],
  );
  const analysis = useMemo(
    () => analyzeWorksheetGames(generatedGames, selectedDraw, previousDraw),
    [generatedGames, selectedDraw, previousDraw],
  );

  const canGenerate = selectedNumbers.length >= inputSize && generatedGames.length > 0;

  const autoSelect = () => {
    const numbers = selectTopLotofacilNumbers(rankedNumbers, inputSize);
    setSelectedNumbers(numbers);
  };

  const toggleNumber = (number: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(number)) return prev.filter((item) => item !== number);
      if (prev.length >= inputSize) return prev;
      return [...prev, number].sort((a, b) => a - b);
    });
  };

  const saveAllGames = async () => {
    if (!canGenerate) return;
    setSaving(true);
    let saved = 0;
    for (const game of generatedGames) {
      const ok = await saveBet({
        numbers: game,
        strategy: `Planilha Matriz: ${preset.label}`,
        label: `${preset.sheetName} J${saved + 1}`,
      });
      if (ok) saved++;
    }
    setSaving(false);
    if (saved > 0) toast.success(`${saved} jogos salvos.`);
  };

  if (selectedLottery !== "lotofacil") {
    return (
      <div className="space-y-6">
        <PageHeader title="Planilhas Matriz" description="Presets estilo Farol para Lotofácil" icon={FileSpreadsheet} />
        <LotteryContextBanner />
        <Card className="bg-card/70 border-amber-500/20">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Esta tela replica matrizes da planilha de Lotofácil.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione Lotofácil no seletor de loteria para usar os modelos 21x50, 17x8, 19x5 e similares.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (draws.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Planilhas Matriz" description="Geração e conferência em formato de planilha" icon={FileSpreadsheet} />
        <LotteryContextBanner />
        <EmptyState description="Importe os sorteios da Lotofácil primeiro para conferir jogos contra concursos reais." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planilhas Matriz"
        description="Modelos estilo Farol: 21x50, 19x5, 17x8, 13x6 e conferidor"
        icon={FileSpreadsheet}
        badge="Lotofácil"
      />
      <LotteryContextBanner />
      <ComplianceDisclaimer />

      <PlanGate feature="fechamentos" fallbackMessage="Planilhas Matriz e conferidor avançado">
        <div className="grid xl:grid-cols-[0.8fr_1.2fr] gap-6">
          <Card className="bg-card/70 border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-primary" />
                Configuração da Planilha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Modelo</span>
                <Select
                  value={preset.id}
                  onValueChange={(value) => {
                    setPresetId(value);
                    setSelectedNumbers([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOTOFACIL_WORKSHEET_PRESETS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label} - {item.gameCount} jogos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">{preset.description}</p>
                {(preset.statisticalCoverage || preset.minPrizeChance) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {preset.statisticalCoverage && (
                      <Badge variant="outline" className="text-[10px]">Cobertura: {preset.statisticalCoverage}</Badge>
                    )}
                    {preset.minPrizeChance && (
                      <Badge variant="outline" className="text-[10px]">Prêmio ≥11: {preset.minPrizeChance}</Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Conferir contra</span>
                <Select value={selectedDrawConcurso} onValueChange={setSelectedDrawConcurso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Último concurso ({draws[0]?.concurso})</SelectItem>
                    {draws.slice(0, 60).map((draw) => (
                      <SelectItem key={draw.concurso} value={String(draw.concurso)}>
                        Concurso {draw.concurso} - {formatDrawDate(draw.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Metric label="Selecionar" value={inputSize} />
                <Metric label="Jogos" value={preset.gameCount} />
                <Metric label="Custo" value={`R$ ${(preset.gameCount * 3).toFixed(2)}`} />
              </div>

              <div className="flex gap-2">
                <Button onClick={autoSelect} className="gap-1.5 flex-1">
                  <Sparkles className="w-4 h-4" />
                  Auto-seleção
                </Button>
                <Button variant="outline" onClick={() => setSelectedNumbers([])}>
                  Limpar
                </Button>
              </div>

              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">Dezenas selecionadas</span>
                  <Badge variant={selectedNumbers.length === inputSize ? "default" : "outline"}>
                    {selectedNumbers.length}/{inputSize}
                  </Badge>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((number) => {
                    const selected = selectedNumbers.includes(number);
                    const disabled = !selected && selectedNumbers.length >= inputSize;
                    return (
                      <button
                        key={number}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleNumber(number)}
                        className={`h-9 rounded-lg border text-xs font-bold font-mono transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : disabled
                              ? "bg-muted/20 text-muted-foreground/30 border-transparent"
                              : "bg-background/50 border-border/60 text-foreground hover:border-primary/50"
                        }`}
                      >
                        {String(number).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-card/70 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Conferidor da Matriz
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/matriz">Abrir Matriz de Análise</Link>
                    </Button>
                    <Button size="sm" onClick={saveAllGames} disabled={!canGenerate || saving} className="gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      {saving ? "Salvando" : "Salvar jogos"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric label="Melhor acerto" value={canGenerate ? analysis.bestHits : "-"} />
                  <Metric label="Concurso" value={selectedDraw?.concurso ?? "-"} />
                  <Metric label="Gerados" value={generatedGames.length} />
                  <Metric label="Investimento" value={`R$ ${analysis.totalCost.toFixed(2)}`} />
                </div>

                {!canGenerate ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Selecione {inputSize} dezenas ou use a auto-seleção para gerar os jogos.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Jogo</TableHead>
                          <TableHead>Dezenas</TableHead>
                          <TableHead className="text-center">Acertos</TableHead>
                          <TableHead className="text-center">Soma</TableHead>
                          <TableHead className="text-center">Par/Ímpar</TableHead>
                          <TableHead className="text-center">Rep.</TableHead>
                          <TableHead className="text-center">Mold.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.games.map((game) => (
                          <TableRow key={game.index}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              J{String(game.index).padStart(2, "0")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {game.numbers.map((number) => {
                                  const hit = selectedDraw?.numbers.includes(number);
                                  return (
                                    <span
                                      key={number}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                        hit ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {String(number).padStart(2, "0")}
                                    </span>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={game.hits >= 11 ? "default" : "outline"}>{game.hits}/15</Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">{game.sum}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{game.even}/{game.odd}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{game.repeatedFromPrevious}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{game.moldura}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {canGenerate && (
              <Card className="bg-card/70 border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-accent" />
                    Distribuição de Acertos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.hitDistribution)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([hits, count]) => (
                        <Badge key={hits} variant="outline" className="text-xs">
                          {hits} acertos: {count} jogo(s)
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PlanGate>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold font-mono text-foreground">{value}</p>
    </div>
  );
}
