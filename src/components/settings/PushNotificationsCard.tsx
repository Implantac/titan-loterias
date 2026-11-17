import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Send, Loader2 } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushNotificationsCard() {
  const {
    supported,
    isSubscribed,
    loading,
    categories,
    subscribe,
    unsubscribe,
    updateCategories,
    sendTest,
  } = usePushSubscription();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações Push
              {isSubscribed && <Badge variant="default" className="ml-1">Ativo</Badge>}
            </CardTitle>
            <CardDescription>
              Ative avisos quando houver dados e notificações disponíveis. A entrega depende do navegador e da conexão; confirme sempre o resultado oficial.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported && (
          <p className="text-sm text-muted-foreground">
            Seu navegador não suporta notificações push. Use um navegador moderno (Chrome, Edge, Firefox) ou instale o PWA no celular.
          </p>
        )}

        {supported && (
          <>
            <div className="flex flex-wrap gap-2">
              {!isSubscribed ? (
                <Button onClick={subscribe} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                  Ativar notificações
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={sendTest} disabled={loading}>
                    <Send className="h-4 w-4 mr-2" /> Enviar teste
                  </Button>
                  <Button variant="ghost" onClick={unsubscribe} disabled={loading}>
                    <BellOff className="h-4 w-4 mr-2" /> Desativar
                  </Button>
                </>
              )}
            </div>

            {isSubscribed && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Quais alertas você quer receber?</p>
                {[
                  { key: "draws" as const, label: "Novos sorteios oficiais", desc: "Quando um novo concurso é sorteado" },
                  { key: "pre_draw" as const, label: "Alertas T-2h", desc: "Sinais críticos antes do sorteio oficial" },
                  { key: "results" as const, label: "Resultado das suas apostas", desc: "Acertos e prêmios das apostas salvas" },
                  { key: "closings" as const, label: "Fechamentos e otimizações", desc: "Sugestões e melhorias dos seus fechamentos" },
                  { key: "system" as const, label: "Sistema e atualizações", desc: "Novidades da plataforma" },
                ].map((it) => (
                  <div key={it.key} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm">{it.label}</p>
                      <p className="text-xs text-muted-foreground">{it.desc}</p>
                    </div>
                    <Switch
                      checked={categories[it.key]}
                      onCheckedChange={(v) => updateCategories({ ...categories, [it.key]: v })}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
