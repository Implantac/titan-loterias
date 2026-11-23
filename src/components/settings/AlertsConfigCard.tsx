import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, RefreshCw, Flame, Snowflake, Clock, Coins, RotateCw, ChevronDown, ChevronUp } from "lucide-react";
import {
  AVAILABLE_LOTTERIES,
  DEFAULT_TRIGGERS,
  useAlertsConfig,
  type AlertTriggers,
} from "@/hooks/useAlertsConfig";

const TRIGGER_META: Array<{ key: keyof AlertTriggers; label: string; desc: string; Icon: typeof Flame }> = [
  { key: "hot", label: "Números quentes", desc: "Novo líder de frequência recente.", Icon: Flame },
  { key: "cold", label: "Retorno de frias", desc: "Dezenas com atraso alto que voltaram.", Icon: Snowflake },
  { key: "delay", label: "Atraso crítico", desc: "Dezenas passaram do ciclo esperado.", Icon: Clock },
  { key: "accumulated", label: "Acumulou", desc: "Prêmio rolou para o próximo concurso.", Icon: Coins },
  { key: "cycle", label: "Ciclo fechado", desc: "Todas as dezenas saíram na janela.", Icon: RotateCw },
];

export function AlertsConfigCard() {
  const { configs, loading, scanning, upsert, runScan } = useAlertsConfig();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byLottery = useMemo(() => {
    const map = new Map(configs.map((c) => [c.lottery_id, c]));
    return AVAILABLE_LOTTERIES.map((l) => ({
      ...l,
      cfg: map.get(l.id),
    }));
  }, [configs]);

  const activeCount = byLottery.filter(({ cfg }) => cfg?.enabled).length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Alertas Estatísticos
              {activeCount > 0 && <Badge variant="default">{activeCount} ativa(s)</Badge>}
            </CardTitle>
            <CardDescription>
              Alertas descritivos de sorteios anteriores (frequência, atrasos, acúmulo e ciclos); não preveem resultados. Super Sete e Lotomania exigem análise própria e não estão disponíveis aqui. Requer notificações push ativas.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={runScan} disabled={scanning || activeCount === 0}>
            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Varrer agora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        )}

        {!loading &&
          byLottery.map(({ id, name, cfg }) => {
            const enabled = cfg?.enabled ?? false;
            const triggers = cfg?.triggers ?? DEFAULT_TRIGGERS;
            const isOpen = expanded[id];

            return (
              <div key={id} className="rounded-lg border border-border bg-secondary/20">
                <div className="flex items-center gap-3 p-3">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => upsert(id, { enabled: v })}
                    aria-label={`Ativar alertas ${name}`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{name}</div>
                    {enabled && (
                      <div className="text-[11px] text-muted-foreground">
                        {Object.entries(triggers).filter(([, v]) => v).length} gatilho(s) ativos
                        {cfg?.last_concurso ? ` · último processado #${cfg.last_concurso}` : ""}
                      </div>
                    )}
                  </div>
                  {enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
                      className="h-8 px-2"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  )}
                </div>

                {enabled && isOpen && (
                  <div className="border-t border-border p-3 grid gap-2 sm:grid-cols-2">
                    {TRIGGER_META.map(({ key, label, desc, Icon }) => (
                      <label
                        key={key}
                        className="flex items-start gap-2 rounded-md p-2 hover:bg-secondary/40 cursor-pointer"
                      >
                        <Switch
                          checked={triggers[key]}
                          onCheckedChange={(v) =>
                            upsert(id, { triggers: { ...triggers, [key]: v } })
                          }
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            {label}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
