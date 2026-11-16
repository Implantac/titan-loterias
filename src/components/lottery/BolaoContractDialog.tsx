import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  FileDown,
  Copy,
  Check,
  Scale,
  Users,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  BolaoContractConfig,
  BolaoContractData,
  createBolaoContract,
  generateBolaoContractPdf,
} from "@/utils/bolaoContract";

interface BolaoContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BolaoContractConfig;
}

export function BolaoContractDialog({
  open,
  onOpenChange,
  config,
}: BolaoContractDialogProps) {
  const [contractData, setContractData] = useState<BolaoContractData | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (open && config.games.length > 0) {
      createBolaoContract(config).then(setContractData);
    }
  }, [open, config]);

  const handleCopyHash = () => {
    if (!contractData) return;
    navigator.clipboard.writeText(contractData.sha256Seal);
    setCopiedHash(true);
    toast.success("Hash SHA-256 copiado.");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      await generateBolaoContractPdf(config);
      toast.success("Registro interno em PDF baixado.");
    } catch {
      toast.error("Erro ao gerar registro interno em PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Registro interno do bolão

              </DialogTitle>
              <DialogDescription className="text-xs">
                Resumo de organização e hash de conteúdo SHA-256; não é documento oficial da Caixa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Hash de conteúdo SHA-256 */}
          {contractData && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Lock className="w-3.5 h-3.5" /> Hash do conteúdo (SHA-256):
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-300 border-emerald-500/30">
                  {contractData.contractId}
                </Badge>
              </div>

              <div className="p-2 rounded bg-black/40 border border-emerald-500/20 font-mono text-[10px] text-emerald-300 break-all select-all flex items-center justify-between gap-2">
                <span>{contractData.sha256Seal}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyHash}
                  className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300 shrink-0"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <span className="text-[10px] text-emerald-300/80 block">
                Emitido em: {contractData.formattedDate}. O hash detecta alterações entre cópias; não prova autoria, pagamento ou data anterior ao sorteio.
              </span>
            </div>
          )}

          {/* Dados e Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block">Modalidade:</span>
              <span className="font-bold text-foreground">{config.lotteryName}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block">Organizador:</span>
              <span className="font-bold text-foreground truncate block">{config.organizerName}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block">Apostas:</span>
              <span className="font-bold text-foreground">{config.games.length} Jogos</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block">Cotas:</span>
              <span className="font-bold text-foreground">{config.totalShares} Cotas</span>
            </div>
          </div>

          {/* Limitações do registro interno */}
          <div className="p-3 rounded-xl bg-card border border-border/40 space-y-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-primary" /> Avisos do registro interno:
            </span>

            <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <p>Jogos e cotas são informações declaradas pelo organizador. Confirme pagamento e acordos com cada participante.</p>
              <p>Somente o comprovante emitido pelos canais oficiais da Caixa demonstra uma aposta registrada. Este PDF não substitui orientação jurídica para um acordo formal.</p>
            </div>
          </div>

          {/* Participantes */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> Lista de Cotistas Vinculados ({config.participants.length}):
            </span>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {config.participants.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/20 text-xs">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">{p.shares} cota(s)</span>
                    <Badge variant={p.paid ? "default" : "outline"} className="text-[10px] h-4">
                      {p.paid ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-border/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileDown className="w-4 h-4" />
            {generatingPdf ? "Gerando PDF..." : "Exportar registro interno em PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
