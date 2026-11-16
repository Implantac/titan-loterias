/**
 * ClosingNextDrawPanel — recomenda parâmetros de fechamento para o próximo concurso
 * baseado em análise dos sorteios recentes.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, Zap } from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { recommendNextDraw, type NextDrawRecommendation } from "@/engine/closing/analysis/nextDrawRecommender";
import { LOTTERY_BET_COST } from "@/engine/betting-budget";
import { cn } from "@/lib/utils";

interface Props {
  onApply?: (rec: NextDrawRecommendation) => void;
}

export function ClosingNextDrawPanel({ onApply }: Props) {
  const { draws, config } = useLotteryContext();
  const [budget, setBudget] = useState<number>(300);
  const [risk, setRisk] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [baseSize, setBaseSize] = useState<number>(Math.min(config.numbers, config.pick + Math.round(config.pick * 0.3)));
  const [ran, setRan] = useState(false);

  const rec = useMemo<NextDrawRecommendation | null>(() => {
    if (!ran || draws.length === 0) return null;
    return recommendNextDraw({
      totalNumbers: config.numbers,
      pick: config.pick,
      recentDraws: draws.slice(0, 60).map(d => ({
        concurso: d.concurso, numbers: d.numbers, date: d.date,
      })),
      targetBaseSize: baseSize,
      budget,
      ticketPrice: LOTTERY_BET_COST[config.id] ?? 3,
      riskProfile: risk,
    });
  }, [ran, draws, config, budget, risk, baseSize]);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const nextConcurso = (draws[0]?.concurso ?? 0) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-5 w-5 text-primary" />
          Recomendação para o Próximo Concurso
          {nextConcurso > 1 && (
            <Badge variant="outline" className="ml-auto">
              #{nextConcurso}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Perfil de risco</Label>
            <Select value={risk} onValueChange={(v) => { setRisk(v as typeof risk); setRan(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservador</SelectItem>
                <SelectItem value="balanced">Balanceado</SelectItem>
                <SelectItem value="aggressive">Agressivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Base alvo (dezenas)</Label>
            <Input
              type="number"
              min={config.pick}
              max={config.numbers}
              value={baseSize}
              onChange={(e) => { setBaseSize(Math.min(config.numbers, Math.max(config.pick, Number(e.target.value) || config.pick))); setRan(false); }}
            />
          </div>
          <div>
            <Label className="text-xs">Orçamento (R$; 0 = sem teto)</Label>
            <Input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => { setBudget(Math.max(0, Number(e.target.value) || 0)); setRan(false); }}
            />
          </div>
        </div>

        <Button onClick={() => setRan(true)} disabled={draws.length === 0}>
          <Play className="h-4 w-4 mr-1" /> Gerar recomendação
        </Button>

        {rec && (
          <>
            <div className="rounded-lg border bg-primary/5 border-primary/30 p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold">Base sugerida ({rec.baseNumbers.length} dezenas)</p>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="font-mono">{rec.strategy}</Badge>
                  <Badge className="font-mono">Meta {rec.minHits} acertos</Badge>
                  <Badge variant="outline" className="font-mono">Teto {rec.maxGames} jogos</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {rec.baseNumbers.map(n => (
                  <span key={n} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-mono font-bold border border-primary/40">
                    {pad(n)}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <MiniStat label="Quentes" value={`${Math.round(rec.hotShare * 100)}%`}  />
                <MiniStat label="Atrasadas" value={`${Math.round(rec.overdueShare * 100)}%`}  />
                <MiniStat label="Frias" value={`${Math.round(rec.coldShare * 100)}%`}  />
                <MiniStat label="Balanço" value={`${rec.balanceScore}/100`}  />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Quentes, frias, atrasadas e balanço descrevem o histórico; não aumentam a probabilidade de uma dezena ser sorteada. A cobertura da meta só pode ser avaliada após gerar os jogos.</p>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Justificativa
              </p>
              {rec.reasoning.map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground rounded p-2 bg-muted/20">• {r}</p>
              ))}
            </div>

            {onApply && (
              <Button variant="secondary" disabled={rec.maxGames < 1} onClick={() => onApply(rec)}>
                Aplicar recomendação
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className={cn(
      "rounded p-2 border",
      good ? "border-emerald-500/40 bg-emerald-500/5" : bad ? "border-red-500/40 bg-red-500/5" : "bg-muted/20",
    )}>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className={cn(
        "font-mono font-bold text-sm",
        good && "text-emerald-400", bad && "text-red-400",
      )}>{value}</p>
    </div>
  );
}
