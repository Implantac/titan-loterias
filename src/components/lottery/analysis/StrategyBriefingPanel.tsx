import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ClipboardCheck, FlaskConical, Gauge, ShieldCheck, WalletCards } from "lucide-react";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import type { NumberStats } from "@/engine/stats/statistics";
import { buildStrategyBriefing } from "@/engine/strategy-briefing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  config: LotteryConfig;
  stats: NumberStats[];
  draws: DrawResult[];
  compact?: boolean;
}

const toneLabels = {
  conservative: "Conservador",
  balanced: "Balanceado",
  aggressive: "Agressivo",
};

const toneClasses = {
  conservative: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
  balanced: "border-primary/25 bg-primary/10 text-primary",
  aggressive: "border-amber-500/25 bg-amber-500/10 text-amber-500",
};

export function StrategyBriefingPanel({ config, stats, draws, compact = false }: Props) {
  const briefing = useMemo(() => buildStrategyBriefing(config, stats, draws), [config, stats, draws]);

  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <CardHeader className="pb-5 relative">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-6 transition-transform duration-500">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground italic">
                Briefing Estratégico
              </CardTitle>
              <p className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Análise Estatística • {config.name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`rounded-full px-3 py-1 font-black uppercase tracking-widest text-[9px] border-2 shadow-sm ${toneClasses[briefing.recommendedTone]}`}>
              {toneLabels[briefing.recommendedTone]}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 font-black uppercase tracking-widest text-[9px] bg-secondary/50 border-border/40 text-muted-foreground">
              {briefing.dataDepthLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 group/headline transition-all hover:border-primary/20">
              <p className="text-xl font-black text-foreground tracking-tight italic group-hover:text-primary transition-colors">{briefing.headline}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">{briefing.summary}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-background/50 p-4 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  Confiança
                </div>
                <p className="text-2xl font-black font-mono text-primary italic">{briefing.confidenceScore}%</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/50 p-4 transition-all hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                  Risco
                </div>
                <p className="text-base font-black text-foreground uppercase tracking-tight italic">{briefing.riskLabel}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/50 p-4 transition-all hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  <WalletCards className="h-3.5 w-3.5 text-accent" />
                  Operação
                </div>
                <p className="text-base font-black text-foreground uppercase tracking-tight italic">Controlada</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/50 p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Mix Recomendado
            </p>
            <div className="space-y-4">
              {briefing.strategyMix.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{item.label}</span>
                    <span className="text-[11px] font-black font-mono text-primary">{item.weight}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden border border-border/40">
                    <div className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] transition-all duration-1000" style={{ width: `${item.weight}%` }} />
                  </div>
                  {!compact && <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">{item.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {!compact && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(var(--primary),0.05),transparent)] pointer-events-none" />
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary relative">Plano de Execução</p>
            <div className="grid gap-4 md:grid-cols-3 relative">
              {briefing.operatingPlan.map((step, index) => (
                <div key={step} className="flex gap-3 text-xs text-muted-foreground leading-relaxed font-medium group/step">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black text-primary transition-all group-hover/step:scale-110">
                    {index + 1}
                  </span>
                  <span className="group-hover/step:text-foreground transition-colors">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5 border-t border-border/40 pt-6 md:flex-row md:items-center md:justify-between relative">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-primary/5 border border-primary/10 rounded-full px-4 py-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span className="italic">{briefing.commercialSignal}</span>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="h-10 px-6 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95">
              <Link to="/simulacoes">
                <FlaskConical className="h-4 w-4 mr-2" />
                Validar
              </Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-6 rounded-xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Link to="/gerador">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Gerar Matrizes
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}