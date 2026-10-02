import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Trophy, History, Dice5 } from "lucide-react";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { NumberStats } from "@/engine/stats/statistics";
import { runIntelligentPipeline } from "@/ai/knowledge/strategiesLibrary";
import { useToast } from "@/hooks/use-toast";

interface Props {
  config: LotteryConfig;
  draws: DrawResult[];
  stats: NumberStats[];
}

// Tabela de prêmios estimados (R$) por número de acertos, por modalidade
const PRIZE_MAP: Record<string, Record<number, number>> = {
  megasena: { 4: 1000, 5: 50000, 6: 50000000 },
  lotofacil: { 11: 6, 12: 12, 13: 30, 14: 1800, 15: 1500000 },
  quina: { 2: 3.5, 3: 130, 4: 9000, 5: 5000000 },
  lotomania: { 0: 5, 15: 8, 16: 25, 17: 100, 18: 1500, 19: 50000, 20: 3000000 },
  duplasena: { 3: 3, 4: 100, 5: 7500, 6: 2000000 },
  timemania: { 3: 3, 4: 9, 5: 36, 6: 1500, 7: 1500000 },
  diadesorte: { 4: 5, 5: 25, 6: 1500, 7: 350000 },
  supersete: { 3: 6, 4: 60, 5: 1500, 6: 50000, 7: 2000000 },
};

interface GeneratedGame {
  numbers: number[];
  strategy: string;
}

interface GameBacktest {
  bestHits: number;
  bestDraw: DrawResult | null;
  hitDistribution: Record<number, number>;
  totalPrize: number;
  winningDraws: number;
}

export function AutonomousGamesPanel({ config, draws, stats }: Props) {
  const { toast } = useToast();
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [games, setGames] = useState<GeneratedGame[]>([]);
  const [backtests, setBacktests] = useState<Record<number, GameBacktest>>({});
  const [analyzingAll, setAnalyzingAll] = useState(false);

  const prizes = useMemo(
    () => PRIZE_MAP[config.id] || { [config.pick - 1]: 100, [config.pick]: 500000 },
    [config.id, config.pick]
  );

  const minHitsForPrize = useMemo(
    () => Math.min(...Object.keys(prizes).map(Number)),
    [prizes]
  );

  const handleGenerate = () => {
    if (draws.length === 0) {
      toast({ title: "Sem dados", description: "Importe sorteios primeiro.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setBacktests({});
    setTimeout(() => {
      try {
        const result = runIntelligentPipeline(stats, draws, config.id, "ml", count);
        const generated: GeneratedGame[] = result.games.map((g) => ({
          numbers: g,
          strategy: "Motor Estatístico Autônomo",
        }));
        setGames(generated);
        toast({
          title: "Jogos gerados",
          description: `${generated.length} jogos criados pela IA autônoma.`,
        });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      } finally {
        setGenerating(false);
      }
    }, 400);
  };

  const backtestGame = (game: number[]): GameBacktest => {
    const set = new Set(game);
    let bestHits = 0;
    let bestDraw: DrawResult | null = null;
    const hitDistribution: Record<number, number> = {};
    let totalPrize = 0;
    let winningDraws = 0;

    for (const draw of draws) {
      const hits = draw.numbers.filter((n) => set.has(n)).length;
      hitDistribution[hits] = (hitDistribution[hits] || 0) + 1;
      if (hits > bestHits) {
        bestHits = hits;
        bestDraw = draw;
      }
      const prize = prizes[hits];
      if (prize) {
        totalPrize += prize;
        winningDraws++;
      }
    }
    return { bestHits, bestDraw, hitDistribution, totalPrize, winningDraws };
  };

  const handleAnalyzeAll = () => {
    setAnalyzingAll(true);
    setTimeout(() => {
      const results: Record<number, GameBacktest> = {};
      games.forEach((g, idx) => {
        results[idx] = backtestGame(g.numbers);
      });
      setBacktests(results);
      setAnalyzingAll(false);
      toast({
        title: "Análise histórica concluída",
        description: `${games.length} jogos testados contra ${draws.length} sorteios.`,
      });
    }, 300);
  };

  const handleAnalyzeOne = (idx: number) => {
    setBacktests((prev) => ({ ...prev, [idx]: backtestGame(games[idx].numbers) }));
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/30 rounded-[2rem]">
        <CardHeader className="p-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-primary" />
                Gerador Autônomo de Jogos
              </CardTitle>
              <CardDescription className="text-xs">
                A IA usa o motor estatístico multicritério para criar combinações e testá-las contra todo o histórico de sorteios.
              </CardDescription>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="count" className="text-[10px] uppercase font-bold tracking-widest">Qtde de jogos</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-24 h-10"
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="h-10 gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar
              </Button>
              {games.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleAnalyzeAll}
                  disabled={analyzingAll}
                  className="h-10 gap-2"
                >
                  {analyzingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                  Analisar todos
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {games.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dice5 className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Clique em <strong>Gerar</strong> para criar jogos com a IA autônoma.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {games.map((g, idx) => {
          const bt = backtests[idx];
          return (
            <Card key={idx} className="glass-card border-white/10 rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono font-black">Jogo #{idx + 1}</Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20">{g.strategy}</Badge>
                  </div>
                  {!bt && (
                    <Button size="sm" variant="outline" onClick={() => handleAnalyzeOne(idx)} className="gap-2">
                      <History className="w-3.5 h-3.5" />
                      Analisar histórico
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {g.numbers.map((n) => (
                    <span
                      key={n}
                      className="w-10 h-10 rounded-xl bg-primary/15 text-primary font-mono font-black text-base border border-primary/30 flex items-center justify-center"
                    >
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>

                {bt && (
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Stat label="Melhor acerto" value={`${bt.bestHits} pts`} icon={<Trophy className="w-3.5 h-3.5 text-yellow-400" />} />
                      <Stat label="Sorteios premiados" value={`${bt.winningDraws}`} hint={`mín. ${minHitsForPrize} acertos`} />
                      <Stat label="Total ganho (estim.)" value={formatBRL(bt.totalPrize)} highlight={bt.totalPrize > 0} />
                      <Stat
                        label="Concurso top"
                        value={bt.bestDraw ? `#${bt.bestDraw.concurso}` : "—"}
                        hint={bt.bestDraw?.date || ""}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">
                        Distribuição de acertos (em {draws.length} sorteios)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(bt.hitDistribution)
                          .map(([h, c]) => ({ h: Number(h), c }))
                          .filter((d) => d.h >= Math.max(0, minHitsForPrize - 2))
                          .sort((a, b) => b.h - a.h)
                          .map(({ h, c }) => {
                            const isPrize = !!prizes[h];
                            return (
                              <div
                                key={h}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                                  isPrize
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold"
                                    : "bg-white/5 text-muted-foreground border-white/10"
                                }`}
                              >
                                {h} pts: <strong>{c}×</strong>
                                {isPrize && <span className="ml-1 opacity-70">({formatBRL(prizes[h])})</span>}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl border ${highlight ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={`font-mono font-black text-sm ${highlight ? "text-emerald-400" : "text-foreground"}`}>{value}</p>
      {hint && <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
