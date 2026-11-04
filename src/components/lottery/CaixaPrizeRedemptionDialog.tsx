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
import { Label } from "@/components/ui/label";
import {
  Landmark,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Calculator,
  Coins,
  FileCheck2,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import {
  calculateNetPrize,
  calculateBolaoShareSplit,
  getCaixaRedemptionGuidance,
  CAIXA_TAX_RULES,
} from "@/utils/caixaTaxCalculator";

interface CaixaPrizeRedemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrize?: number;
  lotteryName?: string;
  isBolao?: boolean;
  sharesCount?: number;
}

export function CaixaPrizeRedemptionDialog({
  open,
  onOpenChange,
  initialPrize = 50000,
  lotteryName = "Mega-Sena",
  isBolao = false,
  sharesCount = 10,
}: CaixaPrizeRedemptionDialogProps) {
  const [grossInput, setGrossInput] = useState<string>(initialPrize.toString());
  const [quotasInput, setQuotasInput] = useState<string>(sharesCount.toString());

  const grossAmount = useMemo(() => {
    const parsed = parseFloat(grossInput.replace(/\D/g, "")) || 0;
    return parsed;
  }, [grossInput]);

  const totalShares = useMemo(() => {
    return Math.max(1, parseInt(quotasInput, 10) || 1);
  }, [quotasInput]);

  const taxCalculation = useMemo(() => {
    return calculateNetPrize(grossAmount);
  }, [grossAmount]);

  const bolaoSplit = useMemo(() => {
    return calculateBolaoShareSplit(grossAmount, totalShares);
  }, [grossAmount, totalShares]);

  const guidance = useMemo(() => {
    return getCaixaRedemptionGuidance(grossAmount);
  }, [grossAmount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Simulador de Resgate & IRRF Caixa
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {lotteryName}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cálculo oficial de retenção de 30% na fonte e protocolo de resgate bancário na Caixa
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-card border border-border/40">
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-primary" /> Prêmio Bruto Estimado (R$):
              </Label>
              <Input
                type="number"
                value={grossInput}
                onChange={(e) => setGrossInput(e.target.value)}
                placeholder="Ex: 50000"
                className="mt-1 h-9 font-mono text-sm"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Valor divulgado pela Caixa Econômica
              </span>
            </div>

            {isBolao && (
              <div>
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" /> Número de Cotas do Bolão:
                </Label>
                <Input
                  type="number"
                  value={quotasInput}
                  onChange={(e) => setQuotasInput(e.target.value)}
                  placeholder="Ex: 10"
                  className="mt-1 h-9 font-mono text-sm"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Total de participantes para rateio líquido
                </span>
              </div>
            )}
          </div>

          {/* Cards de Resumo Fiscal */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-card border border-border/40">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                Prêmio Bruto
              </span>
              <span className="text-base font-mono font-bold text-foreground block mt-0.5">
                {formatCurrency(taxCalculation.grossAmount)}
              </span>
              <span className="text-[10px] text-muted-foreground">Valor total sorteado</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold block">
                IRRF Retido (30%)
              </span>
              <span className="text-base font-mono font-bold text-rose-400 block mt-0.5">
                {formatCurrency(taxCalculation.taxWithheld)}
              </span>
              <span className="text-[10px] text-rose-400/80">
                {taxCalculation.isExempt
                  ? "Isento de IRRF"
                  : `${formatNumber(taxCalculation.effectiveTaxRatePercent)}% alíquota efetiva`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold block">
                Prêmio Líquido
              </span>
              <span className="text-base font-mono font-bold text-emerald-400 block mt-0.5">
                {formatCurrency(taxCalculation.netAmount)}
              </span>
              <span className="text-[10px] text-emerald-400/80">Direto na sua conta</span>
            </div>
          </div>

          {/* Divisão de Cotas de Bolão */}
          {isBolao && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Rateio Líquido por Cota ({totalShares} cotas):
                </span>
                <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                  {formatCurrency(bolaoSplit.netPerShare)} / cota
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/30">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Bruto por Cota:</span>
                  <span className="font-mono text-muted-foreground">{formatCurrency(bolaoSplit.grossPerShare)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">IRRF por Cota:</span>
                  <span className="font-mono text-rose-400">{formatCurrency(bolaoSplit.taxWithheldPerShare)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Regras e Canal de Resgate */}
          <div className="p-3 rounded-xl bg-card border border-border/40 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> Onde e Como Resgatar:
              </span>
              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                {guidance.channel}
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Prazo de pagamento: <strong className="text-foreground">{guidance.timeframe}</strong>. {guidance.deadlineAlert}
            </p>

            <div className="space-y-1.5 pt-1">
              {guidance.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/20 text-xs">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-foreground text-[11px]">{step.title}</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                    <span className="text-[9px] text-primary/80 font-mono mt-0.5 block">
                      Exigência: {step.requirement}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dica de Segurança de Titularidade */}
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-200/90 leading-relaxed">
              <strong>Importante para Bolões:</strong> A Caixa só paga a quem apresentar o bilhete original ou aos portadores de cotas oficiais da DFL. Em bolões particulares, o organizador deve constar no verso do bilhete e emitir a declaração/contrato de condomínio voluntário com as cotas de cada participante.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-border/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)} className="gap-1.5 font-bold">
            <FileCheck2 className="w-4 h-4" /> Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
