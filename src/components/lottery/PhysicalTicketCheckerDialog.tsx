import { useState, useMemo, useEffect } from "react";
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
  Trophy,
  Bookmark,
  RotateCcw,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useSavedBets } from "@/hooks/useSavedBets";
import { toast } from "sonner";

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
  // Não reaproveitar dezenas/índice de outra modalidade ao trocar de loteria.
  useEffect(() => {
    setSelectedNumbers([]);
    setSelectedConcursoIndex(0);
    setPastedInput("");
  }, [config.id]);

  const activeDraw = draws[selectedConcursoIndex] || draws[0];
  const maxNumbers = config.numbers || 60;
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

  // Apenas interseção de dezenas; não infere faixa de prêmio nem valor de resgate.
  const matchedNumbers = useMemo(() => {
    if (!activeDraw) return [];
    const drawn = new Set(activeDraw.numbers);
    return selectedNumbers.filter((number) => drawn.has(number));
  }, [activeDraw, selectedNumbers]);
  const matchCount = matchedNumbers.length;

  const handleSaveToMyBets = () => {
    if (selectedNumbers.length < standardPick) {
      toast.error(`Selecione ao menos ${standardPick} dezenas para salvar.`);
      return;
    }
    void saveBet({ numbers: selectedNumbers, label: `Jogo informado para conferência #${activeDraw?.concurso || ""}` });
  };

  const handleClear = () => {
    setSelectedNumbers([]);
  };

  // Modalidades com colunas, trevos, meses, times ou bilhetes não podem ser
  // conferidas corretamente por uma simples grade de dezenas.
  if (!["megasena", "lotofacil", "quina"].includes(config.id)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferência não disponível para {config.name}</DialogTitle>
            <DialogDescription>
              Esta modalidade exige regras próprias. Confira o comprovante e o resultado no canal oficial da Caixa.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

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
              <span>Concurso selecionado:</span>
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
                Dezenas do resultado carregado:
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
                  Dezenas selecionadas ({selectedNumbers.length}/{standardPick} mín.)
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

                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Somente conferência de dezenas
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                A contagem não confirma premiação: apostas múltiplas e valores de cada concurso exigem conferência no comprovante e no resultado oficial da Caixa.
              </p>
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


      </DialogContent>
    </Dialog>
  );
}
