import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  Printer,
  Zap,
  FileText,
  Info,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatGamesToCologaTxt,
  downloadGamesAsTxt,
} from "@/utils/caixaAutomation";
import { generateVolantesGabaritoPdf } from "@/utils/printableVolantesPdf";

interface ExportCaixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: number[][];
  lotteryName: string;
  lotteryId: string;
}

export function ExportCaixaDialog({
  open,
  onOpenChange,
  games,
  lotteryName,
  lotteryId,
}: ExportCaixaDialogProps) {
  const [copiedTxt, setCopiedTxt] = useState(false);

  const txtContent = formatGamesToCologaTxt(games);

  const handleCopyTxt = () => {
    navigator.clipboard.writeText(txtContent);
    setCopiedTxt(true);
    toast.success("Dezenas no formato Cologa copiadas!");
    setTimeout(() => setCopiedTxt(false), 2500);
  };

  const handleDownloadTxt = () => {
    const filename = `titan_${lotteryId}_${games.length}_jogos`;
    downloadGamesAsTxt(filename, games);
    toast.success(`Arquivo ${filename}.txt baixado!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              {games.length} {games.length === 1 ? "Volante" : "Volantes"}
            </Badge>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Exportar Jogos — {lotteryName}
            </DialogTitle>
          </div>
          <DialogDescription>
            Exporte jogos planejados para conferência. O Titan não envia jogos à Caixa nem confirma registro de apostas.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="caixa" className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="caixa" className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Loterias Caixa
            </TabsTrigger>
            <TabsTrigger value="cologa" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              TXT / Cologa
            </TabsTrigger>
            <TabsTrigger value="print" className="gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              Gabarito / Imprimir
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: CONFERÊNCIA EM CANAL OFICIAL */}
          <TabsContent value="caixa" className="space-y-4 pt-3">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <p className="font-bold">Confira e registre manualmente nos canais oficiais</p>
              <p>O Titan não preenche carrinho, executa scripts no portal da Caixa, vende cotas ou emite recibo de aposta. Compare as dezenas, o concurso, o preço e as regras no canal oficial antes de qualquer pagamento.</p>
              <p>Não cole códigos no console do navegador de um site bancário ou de apostas.</p>
            </div>
            <Button variant="outline" asChild className="w-full gap-2">
              <a href="https://www.loteriasonline.caixa.gov.br/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Abrir portal Loterias Caixa
              </a>
            </Button>
          </TabsContent>

          {/* ABA 2: FORMATO COLOGA TXT */}
          <TabsContent value="cologa" className="space-y-4 pt-3">
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Pré-visualização do Formato Universal TXT:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Formato de texto para conferência; compatibilidade externa não verificada
                </span>
              </div>
              <textarea
                readOnly
                value={txtContent}
                rows={6}
                className="w-full font-mono text-xs p-3 rounded-lg bg-background/80 border border-border/40 resize-none text-foreground select-all"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleDownloadTxt}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="w-4 h-4" />
                Baixar Arquivo .TXT
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyTxt}
                className="gap-2"
              >
                {copiedTxt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedTxt ? "Copiado!" : "Copiar Todas as Dezenas"}
              </Button>
            </div>
          </TabsContent>

          {/* ABA 3: IMPRESSÃO & GABARITO */}
          <TabsContent value="print" className="space-y-4 pt-3">
            <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-foreground">
                  Gabarito de Conferência ({games.length} Jogos):
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      generateVolantesGabaritoPdf({ games, lotteryName, lotteryId });
                      toast.success("Gabarito de marcação em PDF gerado!");
                    }}
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-bold"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Baixar Gabarito em PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Direto
                  </Button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {games.map((game, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/30 text-xs"
                  >
                    <span className="font-bold text-muted-foreground w-16">
                      Jogo #{idx + 1}:
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1 justify-end">
                      {[...game]
                        .sort((a, b) => a - b)
                        .map((n) => (
                          <span
                            key={n}
                            className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold bg-primary/10 text-primary border border-primary/20 text-[11px]"
                          >
                            {String(n).padStart(2, "0")}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
