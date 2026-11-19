import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

/** No ticket/payment proof exists for saved bets; do not turn simulations into actual ROI. */
export default function ROIDashboardPage() {
  return <div className="space-y-6">
    <PageHeader title="ROI automático suspenso" description="Jogos salvos são planejamento, não comprovantes de aposta" icon={TrendingUp} />
    <Card><CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
      <p>O Titan não verifica registro de apostas, valores pagos ou prêmios recebidos. Por isso, a comparação de jogos salvos com sorteios não é apresentada como retorno financeiro real.</p>
      <p>Registros automáticos antigos podem conter estimativas, não transações comprovadas. Nenhum dado foi apagado; a exibição e a sincronização automática ficam suspensas até existir um modelo de evidência verificável.</p>
    </CardContent></Card>
  </div>;
}
