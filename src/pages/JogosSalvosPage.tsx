import { useState, useMemo } from "react";
import { LOTTERIES, LotteryConfig } from "@/data/lotteries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bookmark, Loader2, Trash2, Target, Download, FileSpreadsheet, Zap, Ticket, Repeat } from "lucide-react";
import { isSimpleResultLottery, countSavedGameMatches } from "../../supabase/functions/_shared/result-comparison";
import { useSavedBets, SavedBet } from "@/hooks/useSavedBets";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { StatsCard } from "@/components/common/StatsCard";
import { DrawTestDialog } from "@/components/lottery/DrawTestDialog";
import { QuickBacktestDialog } from "@/components/lottery/QuickBacktestDialog";
import { ClosingHistoryPanel } from "@/components/closing/ClosingHistoryPanel";
import { PostDrawAuditPanel } from "@/components/lottery/PostDrawAuditPanel";
import { exportToCsv, exportToExcel } from "@/utils/export";
import { ExportCaixaDialog } from "@/components/lottery/ExportCaixaDialog";
import { PhysicalTicketCheckerDialog } from "@/components/lottery/PhysicalTicketCheckerDialog";
import { TeimosinhaCycleTrackerDialog } from "@/components/lottery/TeimosinhaCycleTrackerDialog";
import { toast } from "sonner";


const DRAW_RANGE_OPTIONS = [
  { value: "10", label: "Últimos 10" },
  { value: "30", label: "Últimos 30" },
  { value: "50", label: "Últimos 50" },
  { value: "100", label: "Últimos 100" },
];

const JogosSalvosPage = () => {
  const { selectedLottery, config } = useLotteryContext();
  const { savedBets, loading, deleteBet } = useSavedBets(selectedLottery);
  const { draws } = useLotteryContext();
  const [drawRange, setDrawRange] = useState("10");
  const [exportCaixaOpen, setExportCaixaOpen] = useState(false);
  const [ticketCheckerOpen, setTicketCheckerOpen] = useState(false);
  const [teimosinhaOpen, setTeimosinhaOpen] = useState(false);

  const rangeNum = parseInt(drawRange);

  // Retrospective numerical comparison only; no ticket, payment or prize proof.
  const computePerformance = (bet: SavedBet) => {
    if (!isSimpleResultLottery(bet.lottery_id)) return { bestHits: null, comparisons: 0 };
    const matches = draws.slice(0, rangeNum)
      .map(draw => countSavedGameMatches(bet.lottery_id as "megasena" | "lotofacil" | "quina", bet.numbers, draw.numbers))
      .filter((hits): hits is number => hits !== null);
    return { bestHits: matches.length ? Math.max(...matches) : null, comparisons: matches.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const buildExportRows = () => {
    const header = ["Loteria", "Criado em", "Estratégia", "Score", "Grade", "Rótulo", "Números", "Comparações retrospectivas", "Maior coincidência retrospectiva"];
    const rows = savedBets.map((bet) => {
      const perf = computePerformance(bet);
      return [
        bet.lottery_id,
        new Date(bet.created_at).toLocaleString("pt-BR"),
        bet.strategy ?? "",
        bet.score ?? "",
        bet.grade ?? "",
        bet.label ?? "",
        bet.numbers.map((n) => String(n).padStart(2, "0")).join(" "),
        perf.comparisons,
        perf.bestHits ?? "",
      ];
    });
    return [header, ...rows];
  };

  const handleExport = (kind: "csv" | "xlsx") => {
    if (!savedBets.length) {
      toast.error("Nenhum jogo salvo para exportar");
      return;
    }
    const rows = buildExportRows();
    const filename = `titan-jogos-salvos-simulacao-${selectedLottery}-${new Date().toISOString().slice(0, 10)}`;
    if (kind === "csv") exportToCsv(filename, rows);
    else exportToExcel(filename, rows);
    toast.success(`Exportado: ${filename}.${kind === "csv" ? "csv" : "xlsx"}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Jogos Salvos" description="Planejamento e comparação retrospectiva; não comprova apostas nem prêmios" icon={Bookmark} />

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Analisar contra:</span>
        <Select value={drawRange} onValueChange={setDrawRange}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DRAW_RANGE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setTicketCheckerOpen(true)}
          >
            <Ticket className="w-3.5 h-3.5" />
            Conferir Bilhete Físico
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            onClick={() => setTeimosinhaOpen(true)}
            disabled={!savedBets.length}
          >
            <Repeat className="w-3.5 h-3.5" />
            Ciclo Teimosinha
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            onClick={() => setExportCaixaOpen(true)}
            disabled={!savedBets.length}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Exportar Caixa / TXT
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("csv")} disabled={!savedBets.length}>
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("xlsx")} disabled={!savedBets.length}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total de Jogos" value={savedBets.length} />
        <StatsCard title="Jogos comparáveis" value={savedBets.filter(b => computePerformance(b).comparisons > 0).length} />
      </div>

      {isSimpleResultLottery(config.id) && <PostDrawAuditPanel bets={savedBets.filter(b =>
        countSavedGameMatches(config.id as "megasena" | "lotofacil" | "quina", b.numbers, draws[0]?.numbers) !== null
      )} draws={draws} config={config} />}

      <div className="space-y-3">
        {savedBets.map((bet) => {
          const perf = computePerformance(bet);
          const hasMatches = perf.bestHits !== null && perf.bestHits > 0;
          return (
            <Card
              key={bet.id}
              className={hasMatches ? "border-primary/30 bg-primary/[0.03]" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex flex-wrap gap-1.5">
                    {bet.numbers.map(n => (
                      <span
                        key={n}
                        className="w-8 h-8 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center text-xs font-mono tabular-nums font-semibold text-foreground"
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-mono tabular-nums font-semibold ${hasMatches ? "text-primary" : "text-foreground"}`}>
                        {perf.bestHits ?? "—"} <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Maior coincidência histórica</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{perf.comparisons} comparações retrospectivas; não comprova bilhete</p>
                    </div>
                    <DrawTestDialog
                      numbers={bet.numbers}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          Testar
                        </Button>
                      }
                    />
                    <QuickBacktestDialog numbers={bet.numbers} lotteryId={bet.lottery_id} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBet(bet.id)}
                      className="text-muted-foreground hover:text-destructive opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ClosingHistoryPanel lotteryId={selectedLottery} />

      <ExportCaixaDialog
        open={exportCaixaOpen}
        onOpenChange={setExportCaixaOpen}
        games={savedBets.map((b) => b.numbers)}
        lotteryName={config.name}
        lotteryId={config.id}
      />

      <PhysicalTicketCheckerDialog
        open={ticketCheckerOpen}
        onOpenChange={setTicketCheckerOpen}
      />

      <TeimosinhaCycleTrackerDialog
        open={teimosinhaOpen}
        onOpenChange={setTeimosinhaOpen}
        games={savedBets.map((b) => b.numbers)}
      />
    </div>
  );
};

export default JogosSalvosPage;