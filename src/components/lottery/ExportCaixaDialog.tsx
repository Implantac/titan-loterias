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
  Sparkles,
  Zap,
  FileText,
  Bookmark,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatGamesToCologaTxt,
  downloadGamesAsTxt,
  generateCaixaAutomationScript,
  generateBookmarkletUrl,
} from "@/utils/caixaAutomation";

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
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  const txtContent = formatGamesToCologaTxt(games);
  const scriptContent = generateCaixaAutomationScript(games, lotteryName);
  const bookmarkletUrl = generateBookmarkletUrl(games, lotteryName);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopiedScript(true);
    toast.success("Script de automação copiado com sucesso!");
    setTimeout(() => setCopiedScript(false), 2500);
  };

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
            Automatize o preenchimento no site oficial da Caixa ou exporte para softwares lotéricos.
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

          {/* ABA 1: LOTERIAS ONLINE DA CAIXA */}
          <TabsContent value="caixa" className="space-y-4 pt-3">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Sparkles className="w-4 h-4" />
                Preenchedor Automático em 1 Clique (Zero Digitação)
              </div>
              <p>
                Não perca tempo marcando volante por volante. Este script clica nas dezenas e coloca todos os seus{" "}
                <strong>{games.length} jogos</strong> diretamente no carrinho de apostas oficial da Caixa.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Passo a Passo Rápido:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 space-y-1">
                  <div className="font-bold text-primary">1. Abrir a Caixa</div>
                  <p className="text-muted-foreground text-[11px]">
                    Acesse o portal e selecione a modalidade <strong>{lotteryName}</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 space-y-1">
                  <div className="font-bold text-primary">2. Abrir o Console</div>
                  <p className="text-muted-foreground text-[11px]">
                    Aperte <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">F12</kbd> (ou clique com botão direito &gt; Inspecionar &gt; Console).
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 space-y-1">
                  <div className="font-bold text-primary">3. Colar e Executar</div>
                  <p className="text-muted-foreground text-[11px]">
                    Cole o script copiado abaixo e pressione <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Enter</kbd>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button
                onClick={handleCopyScript}
                className="w-full sm:w-auto flex-1 gap-2 bg-primary hover:bg-primary/90 font-bold"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedScript ? "Script Copiado!" : "Copiar Script Automático"}
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full sm:w-auto gap-2 border-border/60"
              >
                <a
                  href="https://www.loteriasonline.caixa.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ir para Loterias Caixa
                </a>
              </Button>
            </div>

            <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Opção Bookmarklet: Arraste o botão para sua barra de favoritos:</span>
              <a
                href={bookmarkletUrl}
                onClick={(e) => e.preventDefault()}
                draggable="true"
                className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border/60 flex items-center gap-1 cursor-grab"
                title="Arraste para a barra de favoritos do navegador"
              >
                <Bookmark className="w-3 h-3 text-primary" />
                Preencher Caixa
              </a>
            </div>
          </TabsContent>

          {/* ABA 2: FORMATO COLOGA TXT */}
          <TabsContent value="cologa" className="space-y-4 pt-3">
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Pré-visualização do Formato Universal TXT:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Compatível com Cologa, LotoFácil Expert e Casas Lotéricas
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Gabarito de Conferência ({games.length} Jogos):
                </span>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Folha
                </Button>
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
