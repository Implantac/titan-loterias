import { useState, useMemo } from "react";
import { LOTTERIES, LotteryConfig } from "@/data/lotteries";
import { getPrizeTiers } from "@/services/api/lottery";;
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bookmark, Trophy, TrendingUp, BarChart3, ChevronDown, ChevronUp, Loader2, Calendar, Star, Trash2, Target, Download, FileSpreadsheet, Zap } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useSavedBets, SavedBet } from "@/hooks/useSavedBets";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { StatsCard } from "@/components/common/StatsCard";
import { DrawTestDialog } from "@/components/lottery/DrawTestDialog";
import { QuickBacktestDialog } from "@/components/lottery/QuickBacktestDialog";
import { ClosingHistoryPanel } from "@/components/closing/ClosingHistoryPanel";
import { PostDrawAuditPanel } from "@/components/lottery/PostDrawAuditPanel";
import { exportToCsv, exportToExcel } from "@/utils/export";
import { ExportCaixaDialog } from "@/components/lottery/ExportCaixaDialog";
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
  const { draws, drawsWithPrizes } = useLotteryContext();
  const [drawRange, setDrawRange] = useState("10");
  const [expandedBet, setExpandedBet] = useState<string | null>(null);
  const [exportCaixaOpen, setExportCaixaOpen] = useState(false);

  const rangeNum = parseInt(drawRange);

  const computePerformance = (bet: SavedBet) => {
    const recentDraws = draws.slice(0, rangeNum);
    const prizeTiers = getPrizeTiers(bet.lottery_id);

    const results = recentDraws.map(draw => {
      const drawSet = new Set(draw.numbers);
      const matched = bet.numbers.filter(n => drawSet.has(n));
      const tier = prizeTiers.find(t => t.hits === matched.length);
      return {
        concurso: draw.concurso,
        hits: matched.length,
        isPrize: !!tier,
        tierLabel: tier?.label,
      };
    });

    const bestHits = results.reduce((max, r) => Math.max(max, r.hits), 0);
    const totalPrizes = results.filter(r => r.isPrize).length;

    return { results, bestHits, totalPrizes };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const buildExportRows = () => {
    const header = ["Loteria", "Criado em", "Estratégia", "Score", "Grade", "Rótulo", "Números", "Premiações Recentes", "Melhor Acerto"];
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
        perf.totalPrizes,
        perf.bestHits,
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
    const filename = `titan-jogos-salvos-${selectedLottery}-${new Date().toISOString().slice(0, 10)}`;
    if (kind === "csv") exportToCsv(filename, rows);
    else exportToExcel(filename, rows);
    toast.success(`Exportado: ${filename}.${kind === "csv" ? "csv" : "xls"}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Jogos Salvos" description="Desempenho dos seus jogos salvos" icon={Bookmark} />

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
        <StatsCard title="Premiações Recentes" value={savedBets.reduce((s, b) => s + computePerformance(b).totalPrizes, 0)} />
      </div>

      <PostDrawAuditPanel bets={savedBets} draws={draws} config={config} />

      <div className="space-y-3">
        {savedBets.map((bet) => {
          const perf = computePerformance(bet);
          const hasPrize = perf.totalPrizes > 0;
          return (
            <Card
              key={bet.id}
              className={hasPrize ? "border-primary/30 bg-primary/[0.03]" : ""}
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
                      <p className={`text-sm font-mono tabular-nums font-semibold ${hasPrize ? "text-primary" : "text-foreground"}`}>
                        {perf.totalPrizes} <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Premiações</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Melhor: {perf.bestHits} acertos</p>
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
    </div>
  );
};

export default JogosSalvosPage;