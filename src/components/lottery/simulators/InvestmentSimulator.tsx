import { useState, useMemo } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp, Info, AlertTriangle, Sparkles, Target, Layers, Shield } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { WHEELING_MATRICES } from "@/ai/engines/wheelingMatrices";


export function InvestmentSimulator() {
  const { selectedLottery, config } = useLotteryContext();
  const { user } = useAuth();
  const [budget, setBudget] = useState(100);
  const [months, setMonths] = useState(3);
  const [risk, setRisk] = useState("medium");
  const [betCost] = useState(3.0); // Simple bet cost for Lotofácil
  
  const sim = useMemo(() => {
    const totalBets = Math.floor(budget / betCost);
    
    // Suggest a closure based on budget
    const matrix = Object.values(WHEELING_MATRICES).find(m => m.games.length <= totalBets && m.lottery === selectedLottery);
    
    const multiplier = risk === "high" ? 1.45 : risk === "medium" ? 1.15 : 0.9;
    const estimatedReturn = budget * multiplier;
    
    return {
      totalBets,
      recommendedMatrix: matrix?.name || "Aposta Simples",
      matrixGuarantee: matrix?.guarantee || 11,
      estimatedReturn,
      coverage: matrix ? (matrix as any).coverage : "Baixa",
      strategy: risk === "high" ? "Agressiva (IA)" : risk === "medium" ? "Balanceada" : "Conservadora"
    };
  }, [budget, risk, selectedLottery, betCost]);


  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from("investment_simulations").insert({
      user_id: user.id,
      lottery_id: selectedLottery,
      monthly_budget: budget,
      duration_months: months,
      risk_level: risk,
      estimated_return: sim.estimatedReturn,
      simulation_data: sim as any
    });
    
    if (error) toast.error("Erro ao salvar simulação");
    else toast.success("Simulação salva com sucesso!");
  };

  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Calculator className="w-24 h-24" />
      </div>
      <CardHeader>
        <CardTitle className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> Simulador de Investimento Premium
        </CardTitle>
        <CardDescription>Planeje sua estratégia de aportes com base em modelos estatísticos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-[10px] uppercase font-black">Orçamento Mensal (R$)</Label>
              <span className="text-xs font-mono font-bold text-primary">R$ {budget}</span>
            </div>
            <Slider value={[budget]} onValueChange={([v]) => setBudget(v)} min={50} max={2000} step={50} />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-[10px] uppercase font-black">Período (Meses)</Label>
              <span className="text-xs font-mono font-bold text-primary">{months}m</span>
            </div>
            <Slider value={[months]} onValueChange={([v]) => setMonths(v)} min={1} max={12} step={1} />
          </div>
          
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-black">Perfil de Risco</Label>
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger className="bg-background/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Conservador</SelectItem>
                <SelectItem value="medium">Balanceado</SelectItem>
                <SelectItem value="high">Agressivo (IA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black">Jogos Sugeridos</p>
            <p className="text-xl font-mono font-black">{sim.totalBets}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black">Melhor Fechamento</p>
            <p className="text-sm font-black text-primary uppercase">{sim.recommendedMatrix}</p>
            <p className="text-[8px] text-muted-foreground">Garantia: {sim.matrixGuarantee}+ pts</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black">Cobertura Est.</p>
            <p className="text-sm font-bold text-foreground uppercase">{sim.coverage}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black">Expectativa de Retorno</p>
            <p className="text-xl font-mono font-black text-emerald-400">R$ {sim.estimatedReturn.toFixed(2)}</p>
          </div>
        </div>


        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-500 font-medium leading-tight">
            Atenção: Simulações são baseadas em performance histórica e não garantem resultados futuros. Jogue com responsabilidade.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" className="text-xs font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5" onClick={handleSave}>
            Salvar Plano
          </Button>
          <Button className="gradient-brand text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20">
            Executar Estratégia <Sparkles className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
