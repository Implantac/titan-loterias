/**
 * ClosingAIRecommendationPanel — sugere estratégia + meta de acertos + limite de jogos
 * com base em orçamento e perfil de risco. Aplica no formulário via callback.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  aiRecommendation,
  heuristicRecommendation,
  type Recommendation,
  type RiskProfile,
} from "@/engine/closing/ai/AIRecommendationEngine";
import type { LotteryParams } from "@/engine/closing";
import { toast } from "sonner";

interface Props {
  lottery: LotteryParams;
  baseSize: number;
  onApply: (rec: Recommendation) => void;
}

export function ClosingAIRecommendationPanel({ lottery, baseSize, onApply }: Props) {
  const [budget, setBudget] = useState<number>(50);
  const [risk, setRisk] = useState<RiskProfile>("balanced");
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<Recommendation | null>(null);

  const buildInput = () => ({
    lottery, baseSize,
    budget: budget > 0 ? budget : undefined,
    riskProfile: risk,
    ticketPrice: lottery.ticketPrice,
  });

  const runQuick = () => {
    if (baseSize < lottery.pick) {
      toast.error(`Selecione ao menos ${lottery.pick} dezenas para receber recomendação.`);
      return;
    }
    setRec(heuristicRecommendation(buildInput()));
  };

  const runAI = async () => {
    if (baseSize < lottery.pick) {
      toast.error(`Selecione ao menos ${lottery.pick} dezenas para receber recomendação.`);
      return;
    }
    setLoading(true);
    try {
      const r = await aiRecommendation(buildInput());
      setRec(r);
      if (r.source === "ai") toast.success("Recomendação da IA gerada.");
      else toast.info("Usando recomendação heurística (IA indisponível).");
    } catch {
      toast.error("Falha ao consultar IA. Usando heurística.");
      setRec(heuristicRecommendation(buildInput()));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Recomendação Inteligente
          {rec && (
            <Badge variant={rec.source === "ai" ? "default" : "secondary"} className="ml-2">
              {rec.source === "ai" ? "IA" : "Heurística"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <Label className="text-xs">Orçamento (R$; 0 = sem teto)</Label>
            <Input
              type="number" min={0} value={budget}
              onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Perfil de risco</Label>
            <Select value={risk} onValueChange={v => setRisk(v as RiskProfile)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservador</SelectItem>
                <SelectItem value="balanced">Balanceado</SelectItem>
                <SelectItem value="aggressive">Agressivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button className="flex-1" variant="outline" onClick={runQuick} disabled={loading}>
              Rápida
            </Button>
            <Button className="flex-1" onClick={runAI} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Consultar IA
            </Button>
          </div>
        </div>

        {rec && (
          <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Metric label="Estratégia" value={rec.strategy} />
              <Metric label="Meta (a validar)" value={String(rec.minHits)} />
              <Metric label="Limite de jogos" value={String(rec.maxGames)} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              {rec.budgetFits ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Cabe no orçamento configurado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> Orçamento insuficiente para um jogo
                </span>
              )}
              <span className="text-muted-foreground">Sem previsão de cobertura, prêmio ou ROI.</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Justificativas são sugestões de configuração, não evidência de vantagem; valide os jogos antes de afirmar cobertura.</p>
            <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground">
              {rec.rationale.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <Button size="sm" className="w-full" disabled={!rec.budgetFits || rec.maxGames < 1} onClick={() => onApply(rec)}>
              <Sparkles className="h-4 w-4 mr-1" /> Aplicar recomendação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/60 border p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold text-sm truncate">{value}</div>
    </div>
  );
}
