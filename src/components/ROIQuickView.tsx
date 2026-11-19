import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Historic saved-game ROI lacks verified ticket/payment provenance. Do not display it as actual return. */
export function ROIQuickView() {
  return <Card className="glass-card border-primary/20">
    <CardHeader><CardTitle className="text-sm">ROI automático suspenso</CardTitle></CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      Jogos salvos não comprovam apostas pagas nem prêmios recebidos. Valores históricos estimados não são exibidos como investimento ou retorno real.
    </CardContent>
  </Card>;
}
