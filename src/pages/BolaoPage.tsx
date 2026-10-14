import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Users, UserPlus, Trash2, Copy, Share2, Download, Save, Shield,
  FileDown, CheckCircle2, AlertTriangle, Coins, Sparkles, RefreshCw, Send, ArrowRight
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { LOTTERIES, LotteryConfig } from "@/data/lotteries";
import { LOTTERY_BET_COST } from "@/engine/betting-budget";
import { generateWithSplitAvoidance, generateByStrategy } from "@/engine/strategies";
import { WHEELING_MATRICES, WheelingMatrixId, applyWheelingMatrix, validateMatrix } from "@/ai/engines/wheelingMatrices";
import { useSavedBets } from "@/hooks/useSavedBets";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Participant {
  id: string;
  name: string;
  shares: number;
  phone?: string;
}

interface CotaAssignment {
  participant: Participant;
  gameIndices: number[];
  cost: number;
  percentage: number;
}

const STORAGE_KEY = "titan_bolao_draft_v1";

export default function BolaoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config: activeConfig, stats, draws } = useLotteryContext();
  const { saveBet, bets: savedBetsList, remaining, isAtLimit } = useSavedBets(activeConfig.id);

  // State from location or default
  const locationState = location.state as {
    lotteryId?: string;
    games?: number[][];
    title?: string;
    source?: string;
  } | null;

  const [bolaoTitle, setBolaoTitle] = useState(
    locationState?.title ?? `Bolão ${activeConfig.name} #${draws?.[0]?.concurso ? draws[0].concurso + 1 : 1}`
  );

  const [adminFeePercent, setAdminFeePercent] = useState<number>(0);
  const [games, setGames] = useState<number[][]>(locationState?.games ?? []);

  // Creation mode
  const [creationMode, setCreationMode] = useState<"closing" | "split_avoidance" | "saved">("closing");
  const [selectedMatrixId, setSelectedMatrixId] = useState<WheelingMatrixId | "">("lf_18_15_14_24");
  const [quickGameCount, setQuickGameCount] = useState<number>(10);

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", name: "Organizador (Você)", shares: 2 },
    { id: "2", name: "Participante 2", shares: 1 },
    { id: "3", name: "Participante 3", shares: 1 },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingBets, setSavingBets] = useState(false);

  // Ticket price from official Caixa pricing table
  const ticketPrice = LOTTERY_BET_COST[activeConfig.id] ?? 3.0;

  // Restore from storage if no games passed via route
  useEffect(() => {
    if (!locationState?.games || locationState.games.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.games) && parsed.games.length > 0) {
            setGames(parsed.games);
            if (parsed.title) setBolaoTitle(parsed.title);
            if (Array.isArray(parsed.participants) && parsed.participants.length > 0) {
              setParticipants(parsed.participants);
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [locationState]);

  // Persist draft to storage
  useEffect(() => {
    if (games.length > 0) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            title: bolaoTitle,
            lotteryId: activeConfig.id,
            games,
            participants,
          })
        );
      } catch {
        /* ignore */
      }
    }
  }, [bolaoTitle, activeConfig.id, games, participants]);

  // Total numbers / Cotas metrics
  const totalShares = useMemo(
    () => participants.reduce((acc, p) => acc + (Number(p.shares) || 1), 0),
    [participants]
  );

  const baseCost = games.length * ticketPrice;
  const adminFeeAmount = (baseCost * adminFeePercent) / 100;
  const totalCost = baseCost + adminFeeAmount;
  const costPerShare = totalShares > 0 ? totalCost / totalShares : 0;

  // Split games among participants
  const cotas = useMemo<CotaAssignment[]>(() => {
    const gameCount = games.length;
    if (totalShares <= 0 || gameCount === 0) {
      return participants.map((p) => ({
        participant: p,
        gameIndices: [],
        cost: 0,
        percentage: 0,
      }));
    }

    const rawSizes = participants.map((p) => (p.shares / totalShares) * gameCount);
    const sizes = rawSizes.map(Math.floor);
    let assigned = sizes.reduce((a, b) => a + b, 0);

    const remainders = rawSizes
      .map((v, i) => ({ i, r: v - Math.floor(v) }))
      .sort((a, b) => b.r - a.r);

    let k = 0;
    while (assigned < gameCount && k < remainders.length) {
      sizes[remainders[k].i]++;
      assigned++;
      k++;
    }

    const out: CotaAssignment[] = [];
    let cursor = 0;
    participants.forEach((p, i) => {
      const idxs: number[] = [];
      for (let j = 0; j < sizes[i] && cursor < gameCount; j++) {
        idxs.push(cursor++);
      }
      const participantCost = (p.shares / totalShares) * totalCost;
      const percentage = (p.shares / totalShares) * 100;
      out.push({
        participant: p,
        gameIndices: idxs,
        cost: participantCost,
        percentage,
      });
    });
    return out;
  }, [participants, games.length, totalShares, totalCost]);

  // Participant manipulation
  const addParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Participante ${prev.length + 1}`, shares: 1 },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) {
      toast.warning("Um bolão colaborativo requer no mínimo 2 participantes.");
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParticipant = (id: string, patch: Partial<Participant>) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  // Quick presets
  const applyPresetShares = (count: number) => {
    const defaultNames = ["Organizador (Você)"];
    for (let i = 2; i <= count; i++) defaultNames.push(`Participante ${i}`);
    setParticipants(
      defaultNames.map((name) => ({
        id: crypto.randomUUID(),
        name,
        shares: 1,
      }))
    );
    toast.success(`Bolão configurado para ${count} cotas iguais.`);
  };

  // Generation actions
  const handleGenerateFromMatrix = () => {
    if (!selectedMatrixId || !WHEELING_MATRICES[selectedMatrixId]) {
      toast.error("Selecione uma matriz de fechamento válida.");
      return;
    }
    const matrix = WHEELING_MATRICES[selectedMatrixId];
    // Pegar as melhores dezenas ordenadas por score estatístico
    const sortedStats = [...(stats || [])].sort((a, b) => (b.frequency + b.trend) - (a.frequency + a.trend));
    const baseNums = sortedStats.slice(0, matrix.baseSize).map((s) => s.number).sort((a, b) => a - b);
    
    // Fallback if stats empty
    const finalBase = baseNums.length >= matrix.baseSize
      ? baseNums
      : Array.from({ length: matrix.baseSize }, (_, i) => i + 1);

    const res = applyWheelingMatrix(selectedMatrixId, finalBase);
    if (res.error) {
      toast.error(res.error);
    } else {
      setGames(res.games);
      toast.success(`${res.games.length} jogos gerados via fechamento "${matrix.name}"!`);
    }
  };

  const handleGenerateSplitAvoidance = () => {
    const newGames: number[][] = [];
    const lastDraw = draws?.[0]?.numbers;
    for (let i = 0; i < quickGameCount; i++) {
      const res = generateWithSplitAvoidance("hot", stats || [], activeConfig, {
        seed: Date.now() + i * 997,
        lastDraw,
      });
      newGames.push(res.bet);
    }
    setGames(newGames);
    toast.success(`${quickGameCount} jogos gerados com filtro anti-divisão de prêmio!`);
  };

  const handleImportSaved = () => {
    const valid = savedBetsList.filter((b) => b.numbers.length === activeConfig.pick);
    if (valid.length === 0) {
      toast.warning("Nenhum jogo salvo compatível com esta loteria.");
      return;
    }
    setGames(valid.map((b) => b.numbers));
    toast.success(`${valid.length} jogos salvos importados para o bolão!`);
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

  // WhatsApp individual message
  const makeParticipantMessage = (cota: CotaAssignment) => {
    const lines: string[] = [];
    lines.push(`🎯 *${bolaoTitle.toUpperCase()}*`);
    lines.push(`Modalidade: *${activeConfig.name}*`);
    lines.push(`Participante: *${cota.participant.name}*`);
    lines.push(`Cotas: *${cota.participant.shares}* de *${totalShares}* (${cota.percentage.toFixed(1)}% do bolão)`);
    lines.push(`Valor da Cota: *${formatCurrency(cota.cost)}*`);
    lines.push(`Total de jogos no bolão: *${games.length} jogos*`);
    lines.push("");
    lines.push(`📋 *Seus Jogos Atribuídos (${cota.gameIndices.length}):*`);
    cota.gameIndices.forEach((idx) => {
      const g = games[idx];
      lines.push(`#${String(idx + 1).padStart(3, "0")}: ${g.map(pad).join(" ")}`);
    });
    lines.push("");
    lines.push("⚖️ *Regra de Premiação:* Todos os prêmios conquistados pelo bolão são divididos rigorosamente na proporção das cotas adquiridas.");
    lines.push("Titan Loterias • Gestão Profissional de Bolões");
    return lines.join("\n");
  };

  // WhatsApp group summary
  const makeGroupMessage = () => {
    const lines: string[] = [];
    lines.push(`🎯 *BOLÃO OFICIAL — ${bolaoTitle.toUpperCase()}*`);
    lines.push(`Modalidade: *${activeConfig.name}*`);
    lines.push(`Total de Jogos: *${games.length} apostas*`);
    lines.push(`Investimento Total: *${formatCurrency(totalCost)}*`);
    lines.push(`Total de Cotas: *${totalShares}*`);
    lines.push(`Valor por Cota: *${formatCurrency(costPerShare)}*`);
    lines.push("");
    lines.push("👥 *Participantes & Quotas:*");
    cotas.forEach((c) => {
      lines.push(`• ${c.participant.name}: ${c.participant.shares} cota(s) — ${formatCurrency(c.cost)}`);
    });
    lines.push("");
    lines.push("🔒 *Segurança:* Todos os volantes serão autenticados nas lotéricas Caixa. Comprovantes e conferência centralizados.");
    lines.push("Titan Loterias • Inteligência Estatística");
    return lines.join("\n");
  };

  const sendParticipantWhatsApp = (cota: CotaAssignment) => {
    const msg = encodeURIComponent(makeParticipantMessage(cota));
    const phone = cota.participant.phone?.replace(/\D/g, "") || "";
    const url = phone ? `https://wa.me/55${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  const sendGroupWhatsApp = () => {
    const msg = encodeURIComponent(makeGroupMessage());
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const copyText = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  // PDF Export
  const downloadBolaoPDF = () => {
    if (games.length === 0) {
      toast.error("Adicione ou gere jogos antes de exportar o comprovante.");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(bolaoTitle, 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);

    const info = [
      `Loteria: ${activeConfig.name}   |   Concurso Referencia: #${draws?.[0]?.concurso ? draws[0].concurso + 1 : "Proximo"}`,
      `Investimento Total: ${formatCurrency(totalCost)}   |   Total de Apostas: ${games.length} jogos   |   Preco unitario: ${formatCurrency(ticketPrice)}`,
      `Total de Cotas: ${totalShares}   |   Valor por Cota: ${formatCurrency(costPerShare)}`,
      `Regra de Rateio: Rateio estritamente proporcional ao numero de cotas de cada participante.`,
      `Documento gerado em ${new Date().toLocaleString("pt-BR")} via Titan Loterias`,
    ];
    info.forEach((t, i) => doc.text(t, 40, 75 + i * 14));

    // Participants Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("Quadro de Cotas e Participantes", 40, 160);

    const participantRows = cotas.map((c, i) => [
      String(i + 1),
      c.participant.name,
      String(c.participant.shares),
      `${c.percentage.toFixed(1)}%`,
      formatCurrency(c.cost),
      c.gameIndices.length > 0 ? `#${c.gameIndices[0] + 1} a #${c.gameIndices[c.gameIndices.length - 1] + 1} (${c.gameIndices.length})` : "Todas",
    ]);

    autoTable(doc, {
      startY: 170,
      head: [["#", "Participante", "Cotas", "% Bolao", "Valor Devido", "Jogos Atribuidos"]],
      body: participantRows,
      styles: { font: "helvetica", fontSize: 9, halign: "center", cellPadding: 3 },
      headStyles: { fillColor: [40, 45, 55], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      margin: { left: 40, right: 40 },
    });

    // Games Table
    const nextY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(`Relacao de Jogos Registrados (${games.length})`, 40, nextY);

    const gameRows = games.map((g, i) => [
      `Jogo #${String(i + 1).padStart(3, "0")}`,
      ...g.map(pad),
    ]);

    autoTable(doc, {
      startY: nextY + 10,
      head: [["Aposta", ...Array.from({ length: activeConfig.pick }, (_, i) => `D${i + 1}`)]],
      body: gameRows,
      styles: { font: "helvetica", fontSize: 8, halign: "center", cellPadding: 2.5 },
      headStyles: { fillColor: [20, 25, 35], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: 40, right: 40 },
    });

    // Footer notice
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Titan Loterias • Comprovante de Gestao de Bolao Colaborativo", 40, doc.internal.pageSize.getHeight() - 15);
      doc.text(`Pagina ${p} de ${pageCount}`, w - 70, doc.internal.pageSize.getHeight() - 15);
    }

    doc.save(`bolao-${activeConfig.id}-${games.length}jogos-${totalShares}cotas.pdf`);
    toast.success("Comprovante PDF do Bolão exportado!");
  };

  // Save to saved_bets
  const handleSaveToMyBets = async () => {
    if (games.length === 0) {
      toast.error("Nenhum jogo no bolão para salvar.");
      return;
    }
    if (isAtLimit) {
      toast.error("Limite de jogos salvos atingido no seu plano.");
      return;
    }
    setSavingBets(true);
    let ok = 0;
    const toSave = games.slice(0, remaining);
    for (let i = 0; i < toSave.length; i++) {
      const success = await saveBet({
        numbers: toSave[i],
        strategy: `bolao:${bolaoTitle}`,
        label: `${bolaoTitle} — Jogo #${i + 1}/${games.length}`,
      });
      if (success) ok++;
    }
    setSavingBets(false);
    if (ok > 0) toast.success(`${ok} jogo(s) do bolão salvos em Meus Jogos!`);
    if (ok < games.length) {
      toast.warning(`${games.length - ok} jogo(s) não foram salvos devido ao limite do plano.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">
              Módulo de Gestão Coletiva
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-tight">
            Bolão <span className="gradient-brand-text not-italic">Colaborativo</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Organize bolões com rigor estatístico: rateio automático de cotas, desdobramentos matemáticos,
            mensagens individuais para WhatsApp e comprovantes em PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={downloadBolaoPDF}
            disabled={games.length === 0}
            className="gap-2 font-bold"
          >
            <FileDown className="w-4 h-4 text-primary" /> Exportar PDF
          </Button>
          <Button
            onClick={sendGroupWhatsApp}
            disabled={games.length === 0}
            className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
          >
            <Send className="w-4 h-4" /> WhatsApp Grupo
          </Button>
        </div>
      </div>

      <LotteryContextBanner />

      {/* KPI Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Coins className="w-3.5 h-3.5 text-accent" /> Custo Total
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-foreground">
              {formatCurrency(totalCost)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {games.length} jogos × {formatCurrency(ticketPrice)}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Users className="w-3.5 h-3.5 text-primary" /> Total de Cotas
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-primary">
              {totalShares} cotas
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {participants.length} participantes
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Valor por Cota
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-emerald-400">
              {formatCurrency(costPerShare)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Rateio rigoroso 100%
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Jogos por Cota
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-foreground">
              {totalShares > 0 ? (games.length / totalShares).toFixed(1) : 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Média atribuída
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Config & Games Generation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Configurações do Bolão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bolao-title" className="text-xs text-muted-foreground">Nome do Bolão</Label>
                <Input
                  id="bolao-title"
                  value={bolaoTitle}
                  onChange={(e) => setBolaoTitle(e.target.value)}
                  placeholder="Ex: Bolão da Firma Mega da Virada"
                  className="font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Loteria Ativa</Label>
                  <div className="p-2.5 rounded-lg border bg-muted/20 text-xs font-bold flex items-center gap-2">
                    <span>{activeConfig.icon}</span>
                    <span className="truncate">{activeConfig.name}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Preço por Jogo</Label>
                  <div className="p-2.5 rounded-lg border bg-muted/20 text-xs font-mono font-bold text-emerald-400">
                    {formatCurrency(ticketPrice)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Taxa do Organizador (Opcional)</Label>
                  <span className="text-xs font-mono font-bold text-primary">{adminFeePercent}%</span>
                </div>
                <div className="flex gap-2">
                  {[0, 5, 10, 15].map((pct) => (
                    <Button
                      key={pct}
                      size="sm"
                      variant={adminFeePercent === pct ? "default" : "outline"}
                      onClick={() => setAdminFeePercent(pct)}
                      className="flex-1 text-xs"
                    >
                      {pct === 0 ? "Sem taxa" : `${pct}%`}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jogos do Bolão */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Jogos do Bolão ({games.length})
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatCurrency(baseCost)}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Gere com fechamento, split-avoidance ou use jogos salvos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as any)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="closing" className="text-xs">Fechamento</TabsTrigger>
                  <TabsTrigger value="split_avoidance" className="text-xs">Split-Avoid</TabsTrigger>
                  <TabsTrigger value="saved" className="text-xs">Salvos</TabsTrigger>
                </TabsList>

                <TabsContent value="closing" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Matriz Matemática</Label>
                    <select
                      className="w-full bg-background border border-border/40 rounded-lg p-2 text-xs font-medium"
                      value={selectedMatrixId}
                      onChange={(e) => setSelectedMatrixId(e.target.value as any)}
                    >
                      <option value="lf_18_15_14_24">Lotofácil: 18 dezenas → 24 jogos (garante 14 se 15)</option>
                      <option value="lf_16_15_14_16">Lotofácil: 16 dezenas → 16 jogos (garante 14 se 15)</option>
                      <option value="lf_17_15_14_8">Lotofácil: 17 dezenas → 8 jogos (garante 13 se 15)</option>
                      <option value="lf_20_15_14_356">Lotofácil: 20 dezenas → 356 jogos (profissional)</option>
                    </select>
                  </div>
                  <Button onClick={handleGenerateFromMatrix} className="w-full text-xs font-bold">
                    Gerar Fechamento para o Bolão
                  </Button>
                </TabsContent>

                <TabsContent value="split_avoidance" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs text-muted-foreground">Quantidade de Apostas</Label>
                      <span className="font-mono font-bold text-primary">{quickGameCount} jogos</span>
                    </div>
                    <div className="flex gap-2">
                      {[5, 10, 20, 50].map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant={quickGameCount === n ? "default" : "outline"}
                          onClick={() => setQuickGameCount(n)}
                          className="flex-1 text-xs"
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                      Filtro que penaliza sequências e padrões populares para não dividir o prêmio caso seja premiado.
                    </p>
                  </div>
                  <Button onClick={handleGenerateSplitAvoidance} className="w-full text-xs font-bold">
                    Gerar {quickGameCount} Jogos Anti-Divisão
                  </Button>
                </TabsContent>

                <TabsContent value="saved" className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Importa seus jogos salvos em <strong>Meus Jogos</strong> para esta modalidade.
                  </p>
                  <Button onClick={handleImportSaved} variant="outline" className="w-full text-xs font-bold">
                    Importar Jogos Salvos ({savedBetsList.length} disponíveis)
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Games Scrollable Preview */}
              {games.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/20">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Volantes do Bolão</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveToMyBets}
                      disabled={savingBets || isAtLimit}
                      className="h-6 text-[11px] text-primary"
                    >
                      <Save className="w-3 h-3 mr-1" /> Salvar em Meus Jogos
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
                    {games.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 text-xs border border-border/20">
                        <span className="font-mono text-muted-foreground w-9 shrink-0">#{String(i + 1).padStart(3, "0")}</span>
                        <div className="flex flex-wrap gap-1">
                          {g.map((n) => (
                            <span key={n} className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold">
                              {pad(n)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Participants & Cotas & WhatsApp (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Participantes & Cotas
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Presets:</span>
                  {[5, 10, 20].map((num) => (
                    <Button
                      key={num}
                      size="sm"
                      variant="outline"
                      onClick={() => applyPresetShares(num)}
                      className="h-6 px-2 text-[10px]"
                    >
                      {num} cotas
                    </Button>
                  ))}
                </div>
              </div>
              <CardDescription className="text-xs">
                Defina o número de cotas de cada participante para rateio proporcional dos prêmios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Participant Input List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                {participants.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/10">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <Input
                      value={p.name}
                      onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                      placeholder="Nome do participante"
                      className="flex-1 h-9 text-xs"
                    />
                    <Input
                      value={p.phone || ""}
                      onChange={(e) => updateParticipant(p.id, { phone: e.target.value })}
                      placeholder="DDD + WhatsApp"
                      className="w-32 h-9 text-xs"
                    />
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground">Cotas:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={p.shares}
                        onChange={(e) =>
                          updateParticipant(p.id, {
                            shares: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-16 h-9 text-xs text-center font-bold font-mono"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeParticipant(p.id)}
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button size="sm" variant="outline" onClick={addParticipant} className="gap-1.5 text-xs">
                  <UserPlus className="w-4 h-4" /> Adicionar Participante
                </Button>
                <div className="text-xs text-muted-foreground font-mono">
                  Total: <strong className="text-foreground">{totalShares} cotas</strong> · {formatCurrency(costPerShare)}/cota
                </div>
              </div>

              <Separator />

              {/* Demonstrativo Individual por Cota com Envio WhatsApp */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Demonstrativo Individual por Participante
                  </h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyText(makeGroupMessage(), "group", "Resumo do grupo")}
                    className="h-7 text-[11px] gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedId === "group" ? "Copiado!" : "Copiar Resumo do Grupo"}
                  </Button>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                  {cotas.map((cota) => (
                    <div
                      key={cota.participant.id}
                      className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2.5 transition-all hover:border-primary/30"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{cota.participant.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {cota.participant.shares} cota{cota.participant.shares > 1 ? "s" : ""} ({cota.percentage.toFixed(1)}%)
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                            {formatCurrency(cota.cost)}
                            <span className="text-muted-foreground text-[10px] font-normal ml-2">
                              ({cota.gameIndices.length} jogos atribuídos)
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copyText(
                                makeParticipantMessage(cota),
                                cota.participant.id,
                                `Cota de ${cota.participant.name}`
                              )
                            }
                            className="h-8 text-xs gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedId === cota.participant.id ? "Copiado" : "Copiar"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => sendParticipantWhatsApp(cota)}
                            className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Share2 className="w-3.5 h-3.5" /> WhatsApp
                          </Button>
                        </div>
                      </div>

                      {/* Expansor de jogos */}
                      <details className="text-xs group">
                        <summary className="text-muted-foreground hover:text-foreground cursor-pointer font-medium select-none">
                          Ver jogos atribuídos a esta cota ({cota.gameIndices.length})
                        </summary>
                        <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pt-1">
                          {cota.gameIndices.map((idx) => (
                            <div key={idx} className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                              <span className="w-8">#{String(idx + 1).padStart(3, "0")}</span>
                              <span>{games[idx]?.map(pad).join(" ")}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
