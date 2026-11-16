/**
 * ClosingBaseSuggestionPanel — fechamento assistido: sugere bases candidatas por frequência recente.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Sparkles, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import type { LotteryParams, ClosingStrategy } from "@/engine/closing";
import { suggestBase, type BaseSuggestion } from "@/engine/closing/analysis/suggestBase";
import { useLotteryDraws } from "@/hooks/useLotteryDraws";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";

type Risk = "conservative" | "balanced" | "aggressive";

interface Props {
  lottery: LotteryParams;
  onApply: (opts: { baseNumbers: number[]; minHits: number; maxGames: number; strategy: ClosingStrategy }) => void;
}

export function ClosingBaseSuggestionPanel({ lottery, onApply }: Props) {
  const { draws, loading } = useLotteryDraws(lottery.id);
  const [budget, setBudget] = useState<number>(60);
  const [targetGuarantee, setTargetGuarantee] = useState<number>(Math.max(1, lottery.pick - 1));
  const [risk, setRisk] = useState<Risk>("balanced");
  const [suggestions, setSuggestions] = useState<BaseSuggestion[] | null>(null);
  const [computing, setComputing] = useState(false);

  const compute = () => {
    setComputing(true);
    try {
      const recent = draws.slice(0, 80).map(d => d.numbers);
      if (recent.length === 0) {
        toast.warning("Sem histórico local. Sincronize sorteios primeiro.");
      }
      const res = suggestBase({
        totalNumbers: lottery.totalNumbers,
        pick: lottery.pick,
        ticketPrice: lottery.ticketPrice,
        recentDraws: recent,
        targetGuarantee,
        budget: budget > 0 ? budget : undefined,
        risk,
      });
      setSuggestions(res);
      if (res.length === 0) toast.error("Nenhuma base viável encontrada. Aumente o orçamento.");
      else toast.success(`${res.length} sugestões de base geradas.`);
    } finally {
      setComputing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Fechamento Assistido — Bases Candidatas
          <Badge variant="secondary" className="ml-auto">Heurística</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <Label className="text-xs">Orçamento (R$)</Label>
            <Input
              type="number" min={0} value={budget} className="h-9"
              onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div>
            <Label className="text-xs">Meta de acertos (a validar)</Label>
            <Input
              type="number" min={1} max={lottery.pick} value={targetGuarantee} className="h-9"
              onChange={e => setTargetGuarantee(Math.max(1, Math.min(lottery.pick, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <Label className="text-xs">Perfil</Label>
            <Select value={risk} onValueChange={v => setRisk(v as Risk)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservador</SelectItem>
                <SelectItem value="balanced">Balanceado</SelectItem>
                <SelectItem value="aggressive">Agressivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full h-9" onClick={compute} disabled={computing || loading}>
              {computing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Sugerir base
            </Button>
          </div>
        </div>

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Frequência passada não prevê sorteios futuros. Quantidade e custo são referências teóricas, não jogos gerados nem garantia; valide a cobertura após gerar.</p>
            {suggestions.map((s, i) => {
              const fits = !budget || s.estimatedCost <= budget;
              return (
                <div
                  key={i}
                  className="rounded-lg border p-3 bg-muted/10 hover:bg-muted/20 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={i === 0 ? "default" : "outline"} className="font-bold">
                        {i === 0 ? "Menor referência" : `Opção ${i + 1}`}
                      </Badge>
                      <span className="font-semibold text-sm">Base {s.baseSize} dezenas</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        Referência: {s.estimatedGames} jogos · {formatCurrency(s.estimatedCost)}
                      </span>
                      {fits && (
                        <span className="flex items-center gap-1 text-emerald-500 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> referência cabe no orçamento
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={i === 0 ? "default" : "outline"}
                      disabled={!fits}
                      onClick={() => {
                        onApply({
                          baseNumbers: s.numbers,
                          minHits: s.minHits,
                          maxGames: s.estimatedGames,
                          strategy: "greedy",
                        });
                        toast.success(`Base de ${s.baseSize} dezenas aplicada.`);
                      }}
                    >
                      Aplicar <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.numbers.map(n => (
                      <span
                        key={n}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold border border-primary/30"
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                  <ul className="text-[11px] text-muted-foreground list-disc pl-5">
                    {s.rationale.map((r, k) => <li key={k}>{r}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
