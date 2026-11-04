import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Trophy,
  Bookmark,
  RotateCcw,
  Sparkles,
  Ticket,
  Landmark,
} from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { calculateNetPrize } from "@/utils/caixaTaxCalculator";
import { CaixaPrizeRedemptionDialog } from "@/components/lottery/CaixaPrizeRedemptionDialog";

interface PhysicalTicketCheckerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhysicalTicketCheckerDialog({
  open,
  onOpenChange,
}: PhysicalTicketCheckerDialogProps) {
  const { config, draws } = useLotteryContext();
  const { saveBet } = useSavedBets(config.id);

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pastedInput, setPastedInput] = useState("");
  const [selectedConcursoIndex, setSelectedConcursoIndex] = useState(0);
  const [redemptionOpen, setRedemptionOpen] = useState(false);

  const activeDraw = draws[selectedConcursoIndex] || draws[0];
  const maxNumbers = config.maxNumber || 60;
  const standardPick = config.pick || 6;

  // Toggle or select number
  const toggleNumber = (num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  // Parse pasted numbers
  const handleApplyPasted = () => {
    const parsed = pastedInput
      .split(/[\s,;.-]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= maxNumbers);

    const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);
    if (unique.length === 0) {
      toast.error("Nenhum número válido encontrado.");
      return;
    }

    setSelectedNumbers(unique);
    setPastedInput("");
    toast.success(`${unique.length} dezenas carregadas com sucesso!`);
  };

  // Calculate matches
  const { matchedNumbers, matchCount, prizeTier } = useMemo(() => {
    if (!activeDraw || selectedNumbers.length === 0) {
      return { matchedNumbers: [], matchCount: 0, prizeTier: null };
    }

    const drawSet = new Set(activeDraw.numbers);
    const matched = selectedNumbers.filter((n) => drawSet.has(n));
    const count = matched.length;

    // Estimate prize tier
    let tier = null;
    if (config.id === "megasena") {
      if (count === 6) tier = { name: "Sena (Prêmio Principal)", value: 50000000 };
      else if (count === 5) tier = { name: "Quina", value: 45000 };
      else if (count === 4) tier = { name: "Quadra", value: 950 };
    } else if (config.id === "lotofacil") {
      if (count === 15) tier = { name: "15 Pontos (Máximo)", value: 1800000 };
      else if (count === 14) tier = { name: "14 Pontos", value: 1600 };
      else if (count === 13) tier = { name: "13 Pontos (Fixo)", value: 35 };
      else if (count === 12) tier = { name: "12 Pontos (Fixo)", value: 14 };
      else if (count === 11) tier = { name: "11 Pontos (Fixo)", value: 7 };
    } else if (config.id === "quina") {
      if (count === 5) tier = { name: "Quina (Máximo)", value: 12000000 };
      else if (count === 4) tier = { name: "Quadra", value: 7500 };
      else if (count === 3) tier = { name: "Terno", value: 90 };
      else if (count === 2) tier = { name: "Duque", value: 4.5 };
    } else {
      if (count >= standardPick) tier = { name: "Prêmio Máximo", value: 1000000 };
      else if (count >= standardPick - 1) tier = { name: "Faixa Secundária", value: 1500 };
    }

    return { matchedNumbers: matched, matchCount: count, prizeTier: tier };
  }, [activeDraw, selectedNumbers, config.id, standardPick]);

  const netCalculation = useMemo(() => {
    return prizeTier ? calculateNetPrize(prizeTier.value) : null;
  }, [prizeTier]);

  const handleSaveToMyBets = () => {
    if (selectedNumbers.length < standardPick) {
      toast.error(`Selecione ao menos ${standardPick} dezenas para salvar.`);
      return;
    }
    saveBet(selectedNumbers, `Bilhete Lotérica #${activeDraw?.concurso || ""}`);
    toast.success("Bilhete salvo em Meus Jogos!");
  };

  const handleClear = () => {
    setSelectedNumbers([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Conferidor de Bilhete Físico
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {config.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Marque ou cole as dezenas do seu comprovante impresso para conferir o resultado oficial
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Seletor de Concurso */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/30 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span>Concurso Auditado:</span>
              <strong className="text-foreground">#{activeDraw?.concurso || "---"}</strong>
              <span className="text-[10px] text-muted-foreground">({activeDraw?.date || ""})</span>
            </span>

            {draws.length > 1 && (
              <select
                aria-label="Selecionar concurso para conferência"
                value={selectedConcursoIndex}
                onChange={(e) => setSelectedConcursoIndex(Number(e.target.value))}
                className="bg-background text-foreground border border-border/50 rounded px-2 py-1 text-xs"
              >
                {draws.slice(0, 10).map((d, idx) => (
                  <option key={d.concurso} value={idx}>
                    Concurso #{d.concurso} ({d.date})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Resultado Oficial deste concurso */}
          {activeDraw && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                Dezenas Sorteadas pela Caixa:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeDraw.numbers.map((n) => {
                  const isHit = selectedNumbers.includes(n);
                  return (
                    <span
                      key={n}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                        isHit
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String(n).padStart(2, "0")}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input de Colar Dezenas */}
          <div className="flex gap-2">
            <Input
              value={pastedInput}
              onChange={(e) => setPastedInput(e.target.value)}
              placeholder="Cole os números do comprovante (ex: 04 12 23 31 42 58)"
              className="text-xs h-9 font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleApplyPasted()}
            />
            <Button size="sm" onClick={handleApplyPasted} className="h-9 text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Carregar
            </Button>
            {selectedNumbers.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClear} className="h-9 text-xs text-destructive">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>

          {/* Grade Tátil Rápida */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Selecione as dezenas marcadas no bilhete ({selectedNumbers.length} marcadas):
              </span>
              {selectedNumbers.length >= standardPick && (
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  Aposta Válida ({selectedNumbers.length}/{standardPick})
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-10 gap-1 p-2 rounded-xl bg-card border border-border/30 max-h-52 overflow-y-auto">
              {Array.from({ length: maxNumbers }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                const isDrawn = activeDraw?.numbers.includes(num);
                const isHit = isSelected && isDrawn;

                let btnCls = "bg-muted/30 text-muted-foreground hover:bg-muted";
                if (isHit) {
                  btnCls = "bg-emerald-500 text-white font-bold ring-2 ring-emerald-400 shadow-md";
                } else if (isSelected) {
                  btnCls = "bg-primary text-primary-foreground font-bold";
                }

                return (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    className={`h-7 rounded text-[11px] font-mono transition-colors ${btnCls}`}
                  >
                    {String(num).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Painel de Auditoria de Acertos e Premiação */}
          {selectedNumbers.length > 0 && (
            <div className="p-3.5 rounded-xl bg-card border border-border/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className={`w-5 h-5 ${matchCount >= 4 ? "text-emerald-400" : "text-muted-foreground"}`} />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {matchCount} {matchCount === 1 ? "Acerto" : "Acertos"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Dezenas acertadas:{" "}
                      {matchedNumbers.length > 0
                        ? matchedNumbers.map((n) => String(n).padStart(2, "0")).join(", ")
                        : "Nenhum acerto neste concurso"}
                    </p>
                  </div>
                </div>

                {prizeTier ? (
                  <Badge className="bg-emerald-600 text-white text-xs font-bold gap-1 px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {prizeTier.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Sem Premiação
                  </Badge>
                )}
              </div>

              {/* Caixa Tributação Info */}
              {prizeTier && netCalculation && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                      Estimativa Líquida de Resgate:
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(netCalculation.netAmount)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Bruto: {formatCurrency(netCalculation.grossAmount)}
                      {!netCalculation.isExempt && ` • IRRF retido: ${formatCurrency(netCalculation.taxWithheld)}`}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRedemptionOpen(true)}
                    className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Landmark className="w-3 h-3" /> Guia de Resgate
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-border/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            size="sm"
            onClick={handleSaveToMyBets}
            disabled={selectedNumbers.length < standardPick}
            className="gap-1.5 font-bold"
          >
            <Bookmark className="w-4 h-4" /> Salvar em Meus Jogos
          </Button>
        </div>

        <CaixaPrizeRedemptionDialog
          open={redemptionOpen}
          onOpenChange={setRedemptionOpen}
          initialPrize={prizeTier?.value || 50000}
          lotteryName={config.name}
        />
      </DialogContent>
    </Dialog>
  );
}
