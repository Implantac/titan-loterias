import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, XCircle, Loader2, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import { computeDataHealth } from "@/engine/data-health/dataHealth";
import { fillLotteryGaps } from "@/services/api/lottery";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { cn } from "@/lib/utils";

const STATUS = {
  ok: { label: "🟢 Dados íntegros", cls: "text-primary border-primary/40" },
  warning: { label: "🟡 Atualização pendente", cls: "text-accent-foreground border-accent" },
  critical: { label: "🔴 Dados inconsistentes", cls: "text-destructive border-destructive/50" },
} as const;

export function DataHealthPanel({ draws, lottery }: { draws: DrawResult[]; lottery: LotteryConfig }) {
  const { lastSyncAt, syncDraws, syncing } = useLotteryContext();
  const [filling, setFilling] = useState(false);

  const report = useMemo(() => {
    try {
      return computeDataHealth(draws, lottery);
    } catch {
      return null;
    }
  }, [draws, lottery]);

  const handleFill = async () => {
    setFilling(true);
    try {
      const r = await fillLotteryGaps(lottery.id);
      if (r.inserted > 0) await syncDraws(true);
      if (r.missing === 0) toast.success("Nenhum concurso faltando na base.");
      else if (r.errors > 0) toast.warning(`${r.inserted} concurso(s) baixados; ${r.errors} não estão disponíveis na fonte oficial.`);
      else toast.success(`${r.inserted} concurso(s) baixados da fonte oficial.`);
    } catch (e) {
      toast.error("Não foi possível completar os dados agora. Tente novamente em instantes.");
      console.error("fillLotteryGaps failed", e);
    } finally {
      setFilling(false);
    }
  };

  if (!report) return null;
  const s = STATUS[report.status];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Activity className="w-4 h-4 text-primary" />
          Situação dos dados — {lottery.name}
          <Badge variant="outline" className={cn("text-[10px]", s.cls)}>{s.label}</Badge>
          <span className="text-xs text-muted-foreground font-normal sm:ml-auto break-words">
            Fonte: Caixa (resultados oficiais)
            {report.lastContest !== null && ` · Último: #${report.lastContest}${report.lastDate ? ` (${report.lastDate})` : ""}`}
            {lastSyncAt && ` · Verificado: ${lastSyncAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {report.checks.map((c) => (
          <div key={c.label} className="rounded-md border border-border/50 p-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              {c.passed ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-destructive" />}
              <span className="break-words">{c.label}</span>
            </div>
            <div className="font-mono mt-1">{c.value}</div>
          </div>
        ))}
        {report.missingContests.length > 0 && (
          <div className="col-span-full flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-[11px] text-muted-foreground break-words flex-1">
              Faltando: {report.missingContests.slice(0, 15).map((c) => `#${c}`).join(", ")}
              {report.missingContests.length > 15 ? ` e mais ${report.missingContests.length - 15}` : ""}.
            </p>
            <Button size="sm" variant="outline" onClick={handleFill} disabled={filling || syncing} className="min-h-10">
              {filling ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              Completar dados
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
