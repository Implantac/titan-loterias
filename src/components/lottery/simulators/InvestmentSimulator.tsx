import { useMemo, useState } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator, AlertTriangle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { planLotteryBudget } from "@/engine/budget-plan";

export function InvestmentSimulator() {
  const { selectedLottery, config } = useLotteryContext();
  const { user } = useAuth();
  const [budget, setBudget] = useState(100);
  const [months, setMonths] = useState(3);
  const plan = useMemo(() => planLotteryBudget(selectedLottery, budget, months), [selectedLottery, budget, months]);

  const handleSave = async () => {
    if (!user || !plan) { toast.error("Entre na conta para salvar um plano válido."); return; }
    const { error } = await supabase.from("investment_simulations").insert({
      user_id: user.id,
      lottery_id: selectedLottery,
      monthly_budget: budget,
      duration_months: months,
      risk_level: "not_assessed",
      estimated_return: null,
      simulation_data: {
        type: "budget_plan", pricePerSimpleGame: plan.price,
        maxSimpleGames: plan.maxSimpleGames, totalBudget: plan.totalBudget,
        matrixId: plan.matrix?.id ?? null,
      },
    });
    if (error) toast.error("Erro ao salvar plano de orçamento.");
    else toast.success("Plano de orçamento salvo.");
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> Planejador de Orçamento</CardTitle>
        <CardDescription>Estime quantos jogos simples cabem no teto informado. Não prevê prêmio, lucro ou vantagem.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Orçamento mensal: R$ {budget}</Label>
            <Slider value={[budget]} onValueChange={([v]) => setBudget(v)} min={50} max={2000} step={50} />
          </div>
          <div className="space-y-3">
            <Label>Período: {months} {months === 1 ? "mês" : "meses"}</Label>
            <Slider value={[months]} onValueChange={([v]) => setMonths(v)} min={1} max={12} step={1} />
          </div>
        </div>
        {!plan ? <p className="text-sm text-muted-foreground">Preço de jogo simples indisponível para esta modalidade.</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl bg-primary/5 border border-primary/10 p-4 text-sm">
            <div>Preço configurado/jogo <strong className="block">R$ {plan.price.toFixed(2)}</strong></div>
            <div>Máximo de jogos simples/mês <strong className="block">{plan.maxSimpleGames}</strong></div>
            <div>Teto do período <strong className="block">R$ {plan.totalBudget.toFixed(2)}</strong></div>
            <div>Matriz que cabe no mês <strong className="block">{plan.matrix ? `${plan.matrix.name} (${plan.matrix.games} jogos; R$ ${plan.matrix.cost.toFixed(2)})` : "Nenhuma disponível"}</strong>
              {plan.matrix && <span className="text-xs text-muted-foreground">Meta condicional: {plan.matrix.target} acertos — {plan.matrix.proven ? "comprovada sob hipótese da base" : "não comprovada"}.</span>}
            </div>
          </div>
        )}
        <p className="flex items-start gap-2 text-xs text-amber-500"><AlertTriangle className="w-4 h-4 shrink-0" />
          {config.name}: teto de gasto, não investimento. Confira o preço vigente e as regras na Caixa. Matriz não aumenta a probabilidade de as dezenas sorteadas estarem na base.
        </p>
        <Button variant="outline" disabled={!plan || !user} onClick={handleSave}>Salvar plano de orçamento</Button>
      </CardContent>
    </Card>
  );
}
