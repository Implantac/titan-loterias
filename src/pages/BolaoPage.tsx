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
  Users, UserPlus, Trash2, Copy, Share2, Save, Shield,
  FileDown, CheckCircle2, AlertTriangle, Coins, Sparkles, Send,
  QrCode, Zap, Repeat
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { isRestorableBolaoDraft } from "@/utils/bolaoDraft";
import { isValidSimpleBolaoGame } from "@/utils/bolaoGameValidation";
import { hasExactShareAmount } from "@/utils/bolaoShares";
import { bolaoWhatsAppUrl } from "@/utils/bolaoWhatsApp";
import { megaBolaoAdvisory } from "@/utils/megaBolaoAdvisory";
import { isRestorableBolaoParticipants, normalizeShareCount } from "@/utils/bolaoParticipants";
import { LOTTERIES, LotteryConfig } from "@/data/lotteries";
import { LOTTERY_BET_COST } from "@/engine/betting-budget";
import { generateWithSplitAvoidance, generateByStrategy } from "@/engine/strategies";
import { WHEELING_MATRICES, WheelingMatrixId, applyWheelingMatrix, validateMatrix, isUsableWheelingMatrix, getMatricesForLottery } from "@/ai/engines/wheelingMatrices";
import { useSavedBets } from "@/hooks/useSavedBets";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Progress } from "@/components/ui/progress";
import {
  generatePixPayload,
  generatePixQrCodeDataUrl,
  formatBolaoWhatsAppMessage,
} from "@/utils/pix";
import { ExportCaixaDialog } from "@/components/lottery/ExportCaixaDialog";
import { CaixaPrizeRedemptionDialog } from "@/components/lottery/CaixaPrizeRedemptionDialog";
import { BolaoContractDialog } from "@/components/lottery/BolaoContractDialog";
import { TeimosinhaCycleTrackerDialog } from "@/components/lottery/TeimosinhaCycleTrackerDialog";

interface Participant {
  id: string;
  name: string;
  shares: number;
  phone?: string;
  paid?: boolean;
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
  const { config: activeConfig, stats, draws, setSelectedLottery } = useLotteryContext();
  const { saveBet, savedBets: savedBetsList, remaining, isAtLimit } = useSavedBets(activeConfig.id);

  // State from location or default
  const locationState = location.state as {
    lotteryId?: string;
    games?: number[][];
    title?: string;
    source?: string;
  } | null;

  // Respeita a modalidade de um link de campanha, inclusive após login.
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("lottery");
    if (requested && LOTTERIES.some(l => l.id === requested) && requested !== activeConfig.id) {
      setSelectedLottery(requested);
    }
  }, [location.search, activeConfig.id, setSelectedLottery]);

  const [bolaoTitle, setBolaoTitle] = useState(
    locationState?.title ?? `Bolão ${activeConfig.name} #${draws?.[0]?.concurso ? draws[0].concurso + 1 : 1}`
  );

  const [adminFeePercent, setAdminFeePercent] = useState<number>(0);
  const [games, setGames] = useState<number[][]>(locationState?.games ?? []);

  // Creation mode
  const [creationMode, setCreationMode] = useState<"closing" | "split_avoidance" | "saved">("closing");
  const [selectedMatrixId, setSelectedMatrixId] = useState<WheelingMatrixId | "">("lotofacil_16_16");
  const availableMatrices = getMatricesForLottery(activeConfig.id).filter(m => isUsableWheelingMatrix(m.id));
  const effectiveMatrixId = availableMatrices.some(m => m.id === selectedMatrixId)
    ? selectedMatrixId : (availableMatrices[0]?.id ?? "");
  const [quickGameCount, setQuickGameCount] = useState<number>(10);

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", name: "Organizador (Você)", shares: 2, paid: false },
    { id: "2", name: "Participante 2", shares: 1, paid: false },
    { id: "3", name: "Participante 3", shares: 1, paid: false },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingBets, setSavingBets] = useState(false);

  // PIX e Automação Caixa
  const [pixKey, setPixKey] = useState<string>(() => localStorage.getItem("titan_bolao_pix_key") || "");
  const [pixName, setPixName] = useState<string>(() => localStorage.getItem("titan_bolao_pix_name") || "");
  const [pixCity, setPixCity] = useState<string>(() => localStorage.getItem("titan_bolao_pix_city") || "SAO PAULO");
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string>("");
  const [exportCaixaOpen, setExportCaixaOpen] = useState(false);
  const [redemptionOpen, setRedemptionOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [teimosinhaOpen, setTeimosinhaOpen] = useState(false);

  // Referência interna por jogo simples; preço vigente precisa ser conferido nos canais Caixa
  const ticketPrice = LOTTERY_BET_COST[activeConfig.id] ?? 3.0;

  // Persistir configs de PIX
  useEffect(() => {
    try {
      localStorage.setItem("titan_bolao_pix_key", pixKey);
      localStorage.setItem("titan_bolao_pix_name", pixName);
      localStorage.setItem("titan_bolao_pix_city", pixCity);
    } catch {
      /* ignore */
    }
  }, [pixKey, pixName, pixCity]);

  // Restore from storage if no games passed via route
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("lottery");
    if (requested && requested !== activeConfig.id) return;
    if (!locationState?.games || locationState.games.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isRestorableBolaoDraft(parsed, activeConfig.id, activeConfig.pick, activeConfig.numbers)) {
            setGames(parsed.games);
            if (parsed.title) setBolaoTitle(parsed.title);
            if (isRestorableBolaoParticipants(parsed.participants)) {
              setParticipants(parsed.participants as Participant[]);
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [locationState, location.search, activeConfig.id]);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("lottery");
    if (requested === activeConfig.id && !locationState?.title && games.length === 0) {
      setBolaoTitle(prev => prev.startsWith("Bolão Lotofácil #")
        ? `Bolão ${activeConfig.name} #${draws?.[0]?.concurso ? draws[0].concurso + 1 : 1}` : prev);
    }
  }, [location.search, locationState?.title, activeConfig.id, activeConfig.name, draws, games.length]);

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
    () => participants.reduce((acc, p) => acc + normalizeShareCount(p.shares), 0),
    [participants]
  );

  const baseCost = games.length * ticketPrice;
  const adminFeeAmount = (baseCost * adminFeePercent) / 100;
  const totalCost = baseCost + adminFeeAmount;
  const costPerShare = totalShares > 0 ? totalCost / totalShares : 0;
  const exactShareAmount = hasExactShareAmount(totalCost, totalShares);
  const megaAdvisories = activeConfig.id === "megasena"
    ? megaBolaoAdvisory(games.length, totalShares, baseCost) : [];

  // Cotas representam a proporção proposta sobre o grupo inteiro, não jogos exclusivos.
  const cotas = useMemo<CotaAssignment[]>(() => participants.map((p) => ({
    participant: p,
    gameIndices: games.map((_, index) => index),
    cost: totalShares > 0 ? (p.shares / totalShares) * totalCost : 0,
    percentage: totalShares > 0 ? (p.shares / totalShares) * 100 : 0,
  })), [participants, games, totalShares, totalCost]);

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
    if (!effectiveMatrixId || !isUsableWheelingMatrix(effectiveMatrixId)) {
      toast.error("Selecione uma matriz de fechamento válida.");
      return;
    }
    const matrix = WHEELING_MATRICES[effectiveMatrixId];
    // Pegar as melhores dezenas ordenadas por score estatístico
    const sortedStats = [...(stats || [])].sort((a, b) => (b.frequency + b.trend) - (a.frequency + a.trend));
    const baseNums = sortedStats.slice(0, matrix.baseSize).map((s) => s.number).sort((a, b) => a - b);
    
    // Fallback if stats empty
    const finalBase = baseNums.length >= matrix.baseSize
      ? baseNums
      : Array.from({ length: matrix.baseSize }, (_, i) => i + 1);

    const res = applyWheelingMatrix(effectiveMatrixId, finalBase);
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
    toast.success(`${quickGameCount} jogos gerados com filtro de padrões populares. Isso não garante prêmio nem evita divisão.`);
  };

  const handleImportSaved = () => {
    const valid = savedBetsList.filter((b) => isValidSimpleBolaoGame(b.numbers, activeConfig));
    if (valid.length === 0) {
      toast.warning("Nenhum jogo simples válido para esta modalidade. Federal e Super Sete exigem regras próprias.");
      return;
    }
    setGames(valid.map((b) => b.numbers));
    toast.success(`${valid.length} jogos simples válidos importados; confira as regras oficiais antes de apostar.`);
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

  // Payload PIX gerado localmente (não confirma transação)
  const pixPayload = useMemo(() => {
    if (!pixKey.trim() || !exactShareAmount) return "";
    return generatePixPayload({
      key: pixKey.trim(),
      name: pixName.trim() || "ORGANIZADOR BOLAO",
      city: pixCity.trim() || "SAO PAULO",
      amount: Number(costPerShare.toFixed(2)),
      txid: "BOLAO",
      description: `COTA ${activeConfig.name.toUpperCase()}`,
    });
  }, [pixKey, pixName, pixCity, costPerShare, exactShareAmount, activeConfig.name]);

  useEffect(() => {
    let active = true;
    setPixQrCodeUrl("");
    if (pixPayload) {
      generatePixQrCodeDataUrl(pixPayload).then((url) => {
        if (active) setPixQrCodeUrl(url);
      });
    }
    return () => { active = false; };
  }, [pixPayload]);

  // Estatísticas de pagamentos marcados manualmente
  const paidStats = useMemo(() => {
    const paidParticipants = participants.filter((p) => p.paid);
    const paidShares = paidParticipants.reduce((acc, p) => acc + (p.shares || 1), 0);
    const paidAmount = totalShares > 0 ? (paidShares / totalShares) * totalCost : 0;
    const progressPercent = totalCost > 0 ? Math.min(100, Math.round((paidAmount / totalCost) * 100)) : 0;
    return {
      paidCount: paidParticipants.length,
      paidShares,
      paidAmount,
      progressPercent,
    };
  }, [participants, totalShares, totalCost]);

  // WhatsApp individual message
  const makeParticipantMessage = (cota: CotaAssignment) => {
    const lines: string[] = [];
    lines.push(`🎯 *${bolaoTitle.toUpperCase()}*`);
    lines.push(`Modalidade: *${activeConfig.name}*`);
    lines.push(`Participante: *${cota.participant.name}*`);
    lines.push(`Cotas: *${cota.participant.shares}* de *${totalShares}* (${cota.percentage.toFixed(1)}% do bolão)`);
    lines.push(`Valor planejado: *${formatCurrency(cota.cost)}*`);
    lines.push(`Inclui taxa privada do organizador (não é tarifa Caixa): *${formatCurrency(totalShares > 0 ? adminFeeAmount * cota.participant.shares / totalShares : 0)}*`);
    lines.push(`Jogos planejados no grupo: *${games.length}* (confirme registro oficial)`);
    if (pixKey.trim()) {
      lines.push("");
      lines.push(`⚡ *DADOS PARA PAGAMENTO PIX:*`);
      lines.push(`• Chave PIX: \`${pixKey.trim()}\``);
      if (pixName.trim()) lines.push(`• Titular: *${pixName.trim()}*`);
      lines.push(`• Confira o valor individual de ${formatCurrency(cota.cost)} antes de transferir; o QR da tela representa apenas UMA cota.`);
    }
    lines.push("");
    lines.push(`📋 *Jogos planejados do grupo (${cota.gameIndices.length}):*`);
    cota.gameIndices.forEach((idx) => {
      const g = games[idx];
      lines.push(`#${String(idx + 1).padStart(3, "0")}: ${g.map(pad).join(" ")}`);
    });
    lines.push("");
    lines.push("⚖️ *Proposta de rateio:* Confirme com todos os participantes as cotas e condições antes de registrar a aposta na Caixa.");
    lines.push("Titan Loterias • Gestão Profissional de Bolões");
    return lines.join("\n");
  };

  // WhatsApp group summary
  const makeGroupMessage = () => {
    return formatBolaoWhatsAppMessage({
      bolaoTitle,
      lotteryName: activeConfig.name,
      concurso: draws?.[0]?.concurso ? draws[0].concurso + 1 : undefined,
      gamesCount: games.length,
      totalCost,
      organizerFeeAmount: adminFeeAmount,
      costPerShare,
      totalShares,
      pixKey: pixKey.trim(),
      pixPayload,
      organizerName: pixName.trim(),
      strategySummary: creationMode === "closing" ? "Fechamento Matemático com Matrizes Titan" : "Filtro Anti-Divisão & Alta Entropia",
    });
  };

  const sendParticipantWhatsApp = (cota: CotaAssignment) => {
    window.open(bolaoWhatsAppUrl(cota.participant.phone, makeParticipantMessage(cota)), "_blank");
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
      toast.error("Adicione ou gere jogos antes de exportar o registro interno.");
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
      `Custo Planejado: ${formatCurrency(totalCost)}   |   Jogos: ${games.length}   |   Referencia/jogo: ${formatCurrency(ticketPrice)}`,
      `Taxa privada do organizador (nao Caixa): ${formatCurrency(adminFeeAmount)}   |   ${totalShares} cotas: ${formatCurrency(costPerShare)}/cota`,
      `Proposta de rateio: confirmar por escrito com todos os participantes.`,
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
      games.length > 0 ? `Todos os ${games.length} planejados` : "Nenhum",
    ]);

    autoTable(doc, {
      startY: 170,
      head: [["#", "Participante", "Cotas", "% Bolao", "Valor Devido", "Jogos do Grupo"]],
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
    doc.text(`Relacao de Jogos Planejados (${games.length})`, 40, nextY);

    const gameRows = games.map((g, i) => [
      `Jogo #${String(i + 1).padStart(3, "0")}`,
      ...g.map(pad),
    ]);

    autoTable(doc, {
      startY: nextY + 10,
      head: [["Jogo planejado", ...Array.from({ length: activeConfig.pick }, (_, i) => `D${i + 1}`)]],
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
      doc.text("Titan Loterias • Registro interno; nao comprova aposta, cota ou pagamento", 40, doc.internal.pageSize.getHeight() - 15);
      doc.text(`Pagina ${p} de ${pageCount}`, w - 70, doc.internal.pageSize.getHeight() - 15);
    }

    doc.save(`bolao-${activeConfig.id}-${games.length}jogos-${totalShares}cotas.pdf`);
    toast.success("Registro interno do bolão exportado.");
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
            mensagens individuais para WhatsApp e registros internos em PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setContractOpen(true)}
            disabled={games.length === 0}
            className="gap-1.5 font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs h-9"
          >
            <Shield className="w-3.5 h-3.5" /> Registro interno (SHA-256)
          </Button>
          <Button
            variant="outline"
            onClick={() => setRedemptionOpen(true)}
            className="gap-1.5 font-bold border-primary/30 text-primary hover:bg-primary/10 text-xs h-9"
          >
            <Coins className="w-3.5 h-3.5" /> Resgate & IRRF Caixa
          </Button>
          <Button
            variant="outline"
            onClick={() => setTeimosinhaOpen(true)}
            disabled={games.length === 0}
            className="gap-1.5 font-bold border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs h-9"
          >
            <Repeat className="w-3.5 h-3.5" /> Ciclo Teimosinha
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportCaixaOpen(true)}
            disabled={games.length === 0}
            className="gap-1.5 font-bold border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs h-9"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Exportar Caixa / TXT
          </Button>
          <Button
            variant="outline"
            onClick={downloadBolaoPDF}
            disabled={games.length === 0}
            className="gap-1.5 font-bold text-xs h-9"
          >
            <FileDown className="w-3.5 h-3.5 text-primary" /> Registro PDF
          </Button>
          <Button
            onClick={sendGroupWhatsApp}
            disabled={games.length === 0}
            className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 text-xs h-9"
          >
            <Send className="w-3.5 h-3.5" /> WhatsApp Grupo
          </Button>
        </div>
      </div>

      <LotteryContextBanner />

      {/* KPI Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/40">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Coins className="w-3.5 h-3.5 text-accent" /> Custo planejado
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-foreground">
              {formatCurrency(totalCost)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {games.length} jogos × {formatCurrency(ticketPrice)} + {formatCurrency(adminFeeAmount)} de taxa opcional
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
              {activeConfig.id === "megasena" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                  <p className="font-semibold">Planejamento privado ≠ Bolão Caixa</p>
                  <p>Os limites do recibo oficial variam conforme dezenas e composição dos jogos. Confirme as regras e o registro no canal oficial antes de compartilhar cotas.</p>
                  {megaAdvisories.map((notice) => <p key={notice} role="status">⚠ {notice}</p>)}
                  <a href="https://loterias.caixa.gov.br/Paginas/mega-sena.aspx" target="_blank" rel="noopener noreferrer" className="underline">Consultar regras atuais da Mega-Sena na Caixa</a>
                </div>
              )}
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
                  <Label className="text-xs text-muted-foreground">Referência interna por jogo simples</Label>
                  <div className="p-2.5 rounded-lg border bg-muted/20 text-xs font-mono font-bold text-emerald-400">
                    {formatCurrency(ticketPrice)}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Valor de referência configurado no Titan; confirme preço e regras atuais nos canais oficiais da Caixa antes de apostar. O Titan não registra jogos.</p>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Taxa privada do organizador (não é tarifa Caixa)</Label>
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
                <p className="text-xs text-muted-foreground">Taxa opcional calculada sobre o custo de referência dos jogos: {formatCurrency(adminFeeAmount)}. Combine-a previamente com os participantes.</p>
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
                      value={effectiveMatrixId}
                      onChange={(e) => setSelectedMatrixId(e.target.value as WheelingMatrixId)}
                    >
                      {availableMatrices.length === 0 && <option value="">Sem matrizes válidas nesta modalidade</option>}
                      {availableMatrices.map(m => <option key={m.id} value={m.id}>{m.name} · {m.baseSize} dezenas · {m.games.length} jogos · meta {m.guarantee}</option>)}
                    </select>
                  </div>
                  {effectiveMatrixId && (() => {
                    const v = validateMatrix(effectiveMatrixId);
                    return (
                      <div className={cn(
                        "p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2",
                        v.valid ? "bg-emerald-500/5 border-emerald-500/30" : "bg-amber-500/5 border-amber-500/30"
                      )}>
                        <div className="flex items-center gap-2">
                          {v.valid ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className={cn("text-[11px] font-medium", v.valid ? "text-emerald-400" : "text-amber-400")}>
                            {v.valid ? "Meta comprovada por verificação exaustiva" : "Meta não comprovada"}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-mono",
                            v.exhaustive
                              ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                              : "text-amber-400 border-amber-500/40 bg-amber-500/10"
                          )}
                        >
                          {v.exhaustive ? `${formatNumber(v.totalDraws)} cenários testados` : `${formatNumber(v.totalDraws)} amostras`}
                        </Badge>
                      </div>
                    );
                  })()}
                  <Button onClick={handleGenerateFromMatrix} disabled={!effectiveMatrixId} className="w-full text-xs font-bold">
                    Gerar Fechamento para o Bolão
                  </Button>
                </TabsContent>

                <TabsContent value="split_avoidance" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs text-muted-foreground">Quantidade de jogos planejados</Label>
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
                      Filtro que reduz padrões populares em comparação com a geração sem filtro. Não aumenta a chance de acerto nem garante que um eventual prêmio não seja dividido.
                    </p>
                  </div>
                  <Button onClick={handleGenerateSplitAvoidance} className="w-full text-xs font-bold">
                    Gerar {quickGameCount} Jogos com Filtro de Padrões
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
                Defina uma proposta de divisão entre participantes. As cotas se referem ao grupo inteiro de jogos, não a jogos exclusivos. Confirme as condições e o comprovante oficial fora do Titan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Painel de Cobrança PIX e Arrecadação */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-foreground">
                      QR PIX do organizador (uma cota)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Código gerado localmente
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Sua Chave PIX (CPF, Celular, E-mail ou Aleatória):</Label>
                    <Input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Ex: 11999998888 ou chave@pix.com"
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Nome do Titular da Conta (Organizador):</Label>
                    <Input
                      value={pixName}
                      onChange={(e) => setPixName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Status da Arrecadação */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pagamentos marcados manualmente:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(paidStats.paidAmount)} de {formatCurrency(totalCost)} ({paidStats.progressPercent}%)
                    </span>
                  </div>
                  <Progress value={paidStats.progressPercent} className="h-2 bg-secondary" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{paidStats.paidCount} de {participants.length} participantes marcados como pagos</span>
                    <span>Ainda não marcado: {formatCurrency(Math.max(0, totalCost - paidStats.paidAmount))}</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">O Titan não consulta o banco e não confirma transferências. Confira destinatário, valor e comprovante no aplicativo bancário antes de marcar como pago. O QR abaixo representa uma cota; participantes com várias cotas devem conferir o total individual.</p>

                {!exactShareAmount && games.length > 0 && (
                  <p role="alert" className="text-xs text-amber-400">O custo planejado não pode ser dividido igualmente em centavos entre as cotas. Ajuste jogos, taxa ou cotas e combine os valores individualmente antes de gerar um QR de valor fixo.</p>
                )}
                {pixKey.trim() && exactShareAmount && !pixPayload && (
                  <p role="alert" className="text-xs text-destructive">Chave PIX inválida ou valor da cota indisponível. Confira a chave (CPF, CNPJ, e-mail, celular com +55 ou chave aleatória) e o custo antes de compartilhar.</p>
                )}

                {/* Exibição do QR Code e Código Copia e Cola */}
                {pixKey.trim() && pixPayload && (
                  <div className="pt-2 border-t border-border/30 flex flex-col sm:flex-row items-center gap-4">
                    {pixQrCodeUrl && (
                      <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">
                        <img src={pixQrCodeUrl} alt="QR Code PIX Cota" className="w-24 h-24" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2 w-full text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground">
                          PIX Copia e Cola da Cota ({formatCurrency(costPerShare)}):
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyText(pixPayload, "pix", "PIX Copia e Cola")}
                          className="h-7 px-2.5 text-[11px] gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedId === "pix" ? "Copiado!" : "Copiar Código"}
                        </Button>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground bg-background/80 p-2 rounded border border-border/30 truncate select-all">
                        {pixPayload}
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                      className="w-28 h-9 text-xs"
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
                            shares: normalizeShareCount(e.target.value),
                          })
                        }
                        className="w-14 h-9 text-xs text-center font-bold font-mono"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateParticipant(p.id, { paid: !p.paid })}
                      className={cn(
                        "h-9 px-2 text-[11px] font-bold gap-1 rounded-md shrink-0 transition-colors",
                        p.paid
                          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                      )}
                      title="Alternar status de pagamento da cota"
                    >
                      {p.paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {p.paid ? "Marcado pago" : "Pendente"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeParticipant(p.id)}
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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
                              ({cota.gameIndices.length} jogos planejados no grupo)
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
                          Ver jogos planejados do grupo ({cota.gameIndices.length})
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

      <ExportCaixaDialog
        open={exportCaixaOpen}
        onOpenChange={setExportCaixaOpen}
        games={games}
        lotteryName={activeConfig.name}
        lotteryId={activeConfig.id}
      />

      <CaixaPrizeRedemptionDialog
        open={redemptionOpen}
        onOpenChange={setRedemptionOpen}
        initialPrize={50000}
        lotteryName={activeConfig.name}
        isBolao={true}
        sharesCount={totalShares}
      />

      <BolaoContractDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        config={{
          lotteryId: activeConfig.id,
          lotteryName: activeConfig.name,
          concurso: draws?.[0]?.concurso ? draws[0].concurso + 1 : undefined,
          organizerName: pixName.trim() || "ORGANIZADOR DO BOLÃO",
          organizerPixKey: pixKey.trim(),
          organizerCity: pixCity.trim() || "SAO PAULO",
          totalCost,
          organizerFeeAmount: adminFeeAmount,
          totalShares,
          costPerShare,
          participants: participants.map((p) => ({
            name: p.name,
            shares: p.shares,
            cost: p.shares * costPerShare,
            paid: !!p.paid,
          })),
          games,
        }}
      />

      <TeimosinhaCycleTrackerDialog
        open={teimosinhaOpen}
        onOpenChange={setTeimosinhaOpen}
        games={games}
      />
    </div>
  );
}
