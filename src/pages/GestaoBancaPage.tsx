import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, Wallet, ShieldCheck, TrendingDown, TrendingUp,
  Target, Trash2, Plus, PiggyBank, Zap, LineChart, Calculator, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LOTTERIES } from "@/data/lotteries";
import {
  buildBankrollPlan,
  computeSessionStats,
  DEFAULT_BANKROLL_CONFIG,
  loadBankrollState,
  projectBankroll,
  saveBankrollState,
  suggestReserveByRisk,
  type BankrollConfig,
  type BankrollSession,
  type RiskProfile,
} from "@/engine/bankroll/bankrollEngine";
import { useROIByLottery } from "@/hooks/useROIByLottery";
import { toast } from "sonner";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const riskCopy: Record<RiskProfile, string> = {
  conservador: "Preserva banca. Menor volume, foco em modalidades previsíveis.",
  moderado: "Equilibra volume e risco. Padrão para operação sustentável.",
  agressivo: "Amplia testes. Requer disciplina e monitoramento diário.",
};

export default function GestaoBancaPage() {
  const initial = useMemo(() => loadBankrollState(), []);
  const [config, setConfig] = useState<BankrollConfig>(initial.config);
  const [selected, setSelected] = useState<string[]>(initial.selectedLotteries);
  const [sessions, setSessions] = useState<BankrollSession[]>(initial.sessions);
  const [projMonths, setProjMonths] = useState(12);

  const [entry, setEntry] = useState({
    lotteryId: "lotofacil",
    spent: "",
    won: "",
    note: "",
  });

  const { data: roiData, loading: roiLoading } = useROIByLottery();

  // Persistência automática
  useEffect(() => {
    saveBankrollState({ config, selectedLotteries: selected, sessions });
  }, [config, selected, sessions]);

  const plan = useMemo(
    () => buildBankrollPlan(config, roiData, selected),
    [config, roiData, selected],
  );

  const projection = useMemo(
    () => projectBankroll(
      config.totalBankroll,
      plan.monthlyBudget,
      config.monthlyContribution,
      plan.allocation,
      projMonths,
    ),
    [config.totalBankroll, config.monthlyContribution, plan.monthlyBudget, plan.allocation, projMonths],
  );

  const stats = useMemo(() => computeSessionStats(sessions), [sessions]);
  const currentBankroll = config.totalBankroll + stats.net;
  const drawdownPct = config.totalBankroll > 0 ? Math.max(0, -stats.net / config.totalBankroll) * 100 : 0;
  const stopLossHit = -stats.net >= plan.stopLossAmount && stats.net < 0;
  const stopWinHit = stats.net >= plan.stopWinAmount;

  const updateConfig = <K extends keyof BankrollConfig>(k: K, v: BankrollConfig[K]) => {
    setConfig((prev) => ({ ...prev, [k]: v }));
  };

  const toggleLottery = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const syncRealROI = () => {
    if (!roiData || roiData.length === 0) {
      toast.info("Nenhum dado real de ROI encontrado para sincronizar.");
      return;
    }

    const newSessions: BankrollSession[] = roiData.map(lotROI => ({
      id: `sync-${lotROI.lotteryId}-${Date.now()}`,
      date: new Date().toISOString(),
      lotteryId: lotROI.lotteryId,
      spent: lotROI.totalSpent,
      won: lotROI.totalWon,
      note: "Sincronizado automaticamente do histórico real"
    }));

    // Evita duplicatas simples verificando se já existe uma sessão sincronizada hoje para aquela loteria
    setSessions(prev => {
      const filtered = prev.filter(s => !s.id.startsWith("sync-"));
      return [...newSessions, ...filtered];
    });

    toast.success("ROI real sincronizado com a banca!");
  };

  const addSession = () => {
    const spent = Number(entry.spent);
    const won = Number(entry.won || 0);
    if (!Number.isFinite(spent) || spent <= 0) {
      toast.error("Informe um valor gasto válido.");
      return;
    }
    const s: BankrollSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      lotteryId: entry.lotteryId,
      spent,
      won,
      note: entry.note || undefined,
    };
    setSessions((prev) => [s, ...prev]);
    setEntry({ lotteryId: entry.lotteryId, spent: "", won: "", note: "" });
    toast.success("Sessão registrada.");
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const resetSessions = () => {
    if (!sessions.length) return;
    if (confirm("Zerar todas as sessões registradas?")) {
      setSessions([]);
      toast.success("Histórico de sessões limpo.");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gestão de Banca"
        description="Kelly defensivo, alocação por ROI e stops operacionais — o núcleo profissional do apostador."
        icon={Wallet}
      />

      {/* KPIs de status atual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Banca Atual"
          value={brl(currentBankroll)}
          detail={stats.net >= 0 ? `+${brl(stats.net)}` : brl(stats.net)}
          tone={stats.net >= 0 ? "positive" : "negative"}
          icon={PiggyBank}
        />
        <KpiCard
          label="Budget Mensal"
          value={brl(plan.monthlyBudget)}
          detail={`Kelly ${plan.kellyMaxBetPct}% / concurso`}
          tone="neutral"
          icon={Calculator}
        />
        <KpiCard
          label="EV 30 dias"
          value={brl(plan.ev30d)}
          detail="Perda esperada estatística"
          tone="warning"
          icon={TrendingDown}
        />
        <KpiCard
          label="Drawdown Atual"
          value={`${drawdownPct.toFixed(1)}%`}
          detail={`Stop: ${config.stopLossPct}%`}
          tone={drawdownPct >= config.stopLossPct ? "negative" : drawdownPct >= config.stopLossPct * 0.7 ? "warning" : "neutral"}
          icon={TrendingDown}
        />
      </div>

      {/* Alertas de stop */}
      {stopLossHit && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">STOP-LOSS ATINGIDO</p>
            <p className="text-xs text-muted-foreground mt-1">
              Perda acumulada de {brl(-stats.net)} ultrapassou o limite de {brl(plan.stopLossAmount)}.
              Pause operação, revise estratégia e considere reduzir volume.
            </p>
          </div>
        </div>
      )}
      {stopWinHit && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-500">STOP-WIN ATINGIDO</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ganho de {brl(stats.net)} alcançou o alvo de {brl(plan.stopWinAmount)}. Considere retirar parte do lucro.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Configuração */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black uppercase italic tracking-tighter">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Parâmetros de Banca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] italic">Banca Total</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.totalBankroll}
                  onChange={(e) => updateConfig("totalBankroll", Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] italic">Aporte Mensal</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.monthlyContribution}
                  onChange={(e) => updateConfig("monthlyContribution", Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] italic">Perfil de Risco</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["conservador", "moderado", "agressivo"] as RiskProfile[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      updateConfig("riskProfile", r);
                      updateConfig("reservePct", suggestReserveByRisk(r));
                    }}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      config.riskProfile === r
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-background/40 hover:border-primary/30"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider capitalize">{r}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                      {riskCopy[r]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <SliderRow
              label="Reserva Intocada"
              value={config.reservePct}
              onChange={(v) => updateConfig("reservePct", v)}
              min={0} max={60} suffix="%"
              hint={`${brl((config.totalBankroll * config.reservePct) / 100)} preservados`}
            />
            <SliderRow
              label="Stop-Loss"
              value={config.stopLossPct}
              onChange={(v) => updateConfig("stopLossPct", v)}
              min={5} max={50} suffix="%"
              hint={`Pausa em ${brl(plan.stopLossAmount)} de perda`}
            />
            <SliderRow
              label="Stop-Win"
              value={config.stopWinPct}
              onChange={(v) => updateConfig("stopWinPct", v)}
              min={10} max={200} suffix="%"
              hint={`Retirada em ${brl(plan.stopWinAmount)} de ganho`}
            />

            <Separator />

            <div>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] italic">Modalidades Operadas</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {LOTTERIES.map((l) => {
                  const active = selected.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLottery(l.id)}
                      className={`rounded-lg border p-2 text-left text-xs transition ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/40 bg-background/40 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="mr-1">{l.icon}</span>{l.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {plan.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                {plan.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-200/80">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alocação */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Alocação Recomendada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-background/40 border border-border/40 p-2.5">
                <p className="text-muted-foreground uppercase text-[10px]">Operacional</p>
                <p className="font-mono text-sm font-bold">{brl(plan.operatingBankroll)}</p>
              </div>
              <div className="rounded-lg bg-background/40 border border-border/40 p-2.5">
                <p className="text-muted-foreground uppercase text-[10px]">Reserva</p>
                <p className="font-mono text-sm font-bold">{brl(plan.reserveAmount)}</p>
              </div>
            </div>

            {plan.allocation.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Selecione modalidades para gerar alocação.
              </p>
            )}

            {plan.allocation.map((a) => (
              <div key={a.lotteryId} className="rounded-lg border border-border/40 bg-background/30 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold">{a.lotteryName}</p>
                  <Badge variant="outline" className="font-mono">
                    {brl(a.monthlyBudget)}/mês
                  </Badge>
                </div>
                <Progress value={a.weight * 100} className="h-1.5" />
                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                  <span>{a.gamesPerDraw} jogos × {a.drawsPerMonth} concursos</span>
                  <span className="font-mono">{a.monthlyGames} jogos/mês</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 italic">{a.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Projeção */}
      <Card className="glass-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-4 w-4 text-primary" />
            Projeção de Banca
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{projMonths} meses</span>
            <div className="w-32">
              <Slider min={3} max={36} step={1} value={[projMonths]} onValueChange={(v) => setProjMonths(v[0])} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="p90" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: "Mês", position: "insideBottom", offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <RTooltip
                  formatter={(v: number) => brl(v)}
                  labelFormatter={(m) => `Mês ${m}`}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="p90" stroke="hsl(var(--primary) / 0.5)" fill="url(#p90)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="median" stroke="hsl(var(--primary))" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="p10" stroke="hsl(var(--destructive) / 0.7)" fill="transparent" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Linha sólida: cenário mediano · tracejadas: intervalo p10–p90 (80% de confiança) ·
            Sobrevivência sem aporte: <span className="font-mono text-foreground">
              {Number.isFinite(plan.survivalMonths) ? `${plan.survivalMonths} meses` : "indefinida"}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* ROI Portfolio View */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" />
            Portfólio por Modalidade
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">ROI real baseado no seu histórico de apostas.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {roiData.map((r) => {
              const lot = LOTTERIES.find((l) => l.id === r.lotteryId);
              const roiPct = r.roi * 100;
              return (
                <div key={r.lotteryId} className="rounded-xl border border-border/40 bg-background/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{lot?.icon || "🍀"}</span>
                      <span className="text-sm font-bold">{lot?.name || r.lotteryId}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px]",
                        roiPct > 0 ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" :
                        roiPct < -50 ? "border-destructive/50 text-destructive bg-destructive/10" : ""
                      )}
                    >
                      {roiPct > 0 ? "+" : ""}{roiPct.toFixed(1)}% ROI
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Gasto</p>
                      <p className="font-mono">{brl(r.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Retorno</p>
                      <p className="font-mono">{brl(r.totalWon)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{r.bets} apostas</span>
                    <span>{(r.hitRate * 100).toFixed(1)}% cobertura</span>
                  </div>
                </div>
              );
            })}
            {roiData.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground italic">
                Nenhum dado de ROI disponível. Registre suas sessões no diário abaixo.
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Session Tracking */}
      <Card className="glass-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Diário de Sessões
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{stats.count} sessões</span>
            <Badge variant="outline" className="font-mono">
              ROI {(stats.roi * 100).toFixed(1)}%
            </Badge>
            {sessions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetSessions} className="h-7 text-xs">
                <Trash2 className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Modalidade</Label>
              <select
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={entry.lotteryId}
                onChange={(e) => setEntry({ ...entry, lotteryId: e.target.value })}
              >
                {LOTTERIES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Gasto (R$)</Label>
              <Input type="number" min={0} step="0.5" value={entry.spent}
                onChange={(e) => setEntry({ ...entry, spent: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Prêmio (R$)</Label>
              <Input type="number" min={0} step="0.5" value={entry.won}
                onChange={(e) => setEntry({ ...entry, won: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label className="text-[10px] uppercase">Nota</Label>
              <Input value={entry.note}
                onChange={(e) => setEntry({ ...entry, note: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button
                variant="outline"
                size="sm"
                onClick={syncRealROI}
                disabled={roiLoading || !roiData.length}
                className="flex-1 h-10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              >
                <Zap className="h-4 w-4 mr-2" />
                Sincronizar ROI
              </Button>
              <Button onClick={addSession} className="flex-1 h-10">
                <Plus className="h-4 w-4 mr-1" /> Registrar
              </Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhuma sessão registrada. Comece a rastrear ganhos e perdas para calibrar o Kelly.
            </p>
          ) : (
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Data</th>
                      <th className="px-3 py-2 font-semibold">Modalidade</th>
                      <th className="px-3 py-2 font-semibold text-right">Gasto</th>
                      <th className="px-3 py-2 font-semibold text-right">Prêmio</th>
                      <th className="px-3 py-2 font-semibold text-right">Líquido</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const net = s.won - s.spent;
                      const lot = LOTTERIES.find((l) => l.id === s.lotteryId);
                      return (
                        <tr key={s.id} className="border-t border-border/30 hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-mono text-[11px]">
                            {new Date(s.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-3 py-1.5">{lot?.name ?? s.lotteryId}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{brl(s.spent)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{brl(s.won)}</td>
                          <td className={`px-3 py-1.5 text-right font-mono font-bold ${net >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                            {net >= 0 ? "+" : ""}{brl(net)}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => removeSession(s.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {roiLoading && (
        <p className="text-[10px] text-muted-foreground text-center">Carregando ROI histórico do Cloud...</p>
      )}
    </div>
  );
}

function KpiCard({
  label, value, detail, tone, icon: Icon,
}: {
  label: string; value: string; detail: string;
  tone: "positive" | "negative" | "warning" | "neutral";
  icon: typeof Wallet;
}) {
  const toneClass = {
    positive: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    negative: "text-destructive border-destructive/20 bg-destructive/5",
    warning: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    neutral: "text-primary border-primary/20 bg-primary/5",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 glass-card shadow-premium ${toneClass} relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] italic opacity-80 mb-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="font-mono text-2xl font-black italic tracking-tighter leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">{detail}</p>
    </div>
  );
}

function SliderRow({
  label, value, onChange, min, max, suffix, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; suffix?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">{label}</Label>
        <span className="font-mono text-sm font-black text-primary italic">{value}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} className="py-2" />
      {hint && <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">{hint}</p>}
    </div>
  );
}
