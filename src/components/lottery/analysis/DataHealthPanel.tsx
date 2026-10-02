import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import { computeDataHealth } from "@/engine/data-health/dataHealth";
import { cn } from "@/lib/utils";

const STATUS = {
  ok: { label: "Base íntegra", cls: "text-primary border-primary/40" },
  warning: { label: "Atenção", cls: "text-accent-foreground border-accent" },
  critical: { label: "Problema", cls: "text-destructive border-destructive/50" },
} as const;

export function DataHealthPanel({ draws, lottery }: { draws: DrawResult[]; lottery: LotteryConfig }) {
  const report = useMemo(() => {
    try {
      return computeDataHealth(draws, lottery);
    } catch {
      return null;
    }
  }, [draws, lottery]);

  if (!report) return null;
  const s = STATUS[report.status];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Activity className="w-4 h-4 text-primary" />
          Saúde dos dados — {lottery.name}
          <Badge variant="outline" className={cn("text-[10px]", s.cls)}>{s.label}</Badge>
          {report.lastContest !== null && (
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              Último: #{report.lastContest}{report.lastDate ? ` · ${report.lastDate}` : ""}
            </span>
          )}
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
          <p className="col-span-full text-[11px] text-muted-foreground break-words">
            Faltando: {report.missingContests.slice(0, 15).map((c) => `#${c}`).join(", ")}
            {report.missingContests.length > 15 ? ` e mais ${report.missingContests.length - 15}` : ""}. Use "Sincronizar" para completar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
