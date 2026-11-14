/**
 * ClosingTicketPanel — ficha interna imprimível; não é aposta registrada.
 * Layout tipo volante com QR Code por jogo (numeração + valor + resumo).
 */
import { useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Printer, Loader2, QrCode } from "lucide-react";
import type { ClosingResult } from "@/engine/closing";
import { toast } from "sonner";

interface Props {
  result: ClosingResult;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function ClosingTicketPanel({ result }: Props) {
  const [generating, setGenerating] = useState(false);
  const lottery = result.request.lottery;
  const total = result.games.length * lottery.ticketPrice;

  const buildAndPrint = async () => {
    setGenerating(true);
    try {
      const qrs = await Promise.all(
        result.games.map((g, i) => {
          const payload = `TITAN|${lottery.id}|${i + 1}|${g.join(",")}`;
          return QRCode.toDataURL(payload, { margin: 0, width: 120, errorCorrectionLevel: "M" });
        }),
      );

      const cards = result.games.map((g, i) => `
        <div class="ticket">
          <div class="ticket-head">
            <div class="ticket-idx">J${String(i + 1).padStart(3, "0")}</div>
            <div class="ticket-code">${escapeHtml(lottery.id.toUpperCase())} · ${g.length}D</div>
          </div>
          <div class="ticket-nums">
            ${g.map(n => `<span class="ball">${String(n).padStart(2, "0")}</span>`).join("")}
          </div>
          <div class="ticket-foot">
            <img src="${qrs[i]}" alt="QR ${i + 1}" width="80" height="80" />
            <div class="ticket-meta">
              <div>Valor: <b>R$ ${lottery.ticketPrice.toFixed(2)}</b></div>
              <div class="ticket-strat">${escapeHtml(result.strategy)}</div>
              <div class="ticket-sequence">#${(i + 1).toString(36).padStart(4, "0").toUpperCase()}</div>
            </div>
          </div>
        </div>
      `).join("");

      const now = new Date().toLocaleString("pt-BR");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fichas internas — ${escapeHtml(lottery.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#f4f4f5;color:#111;padding:20px}
  .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #22c55e}
  .header h1{font-size:18px;font-weight:800}
  .header h1 span{color:#22c55e}
  .header .meta{font-size:11px;color:#6b7280;text-align:right}
  .summary{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;gap:24px;flex-wrap:wrap;font-size:12px}
  .summary b{color:#111;font-size:14px;display:block;margin-top:2px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .ticket{background:#fff;border:2px dashed #d4d4d8;border-radius:10px;padding:12px;page-break-inside:avoid}
  .ticket-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:10px}
  .ticket-idx{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;color:#22c55e}
  .ticket-code{font-size:10px;color:#6b7280;font-weight:600;letter-spacing:.05em}
  .ticket-nums{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;min-height:60px;align-content:flex-start}
  .ball{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.15)}
  .ticket-foot{display:flex;gap:10px;align-items:center;padding-top:8px;border-top:1px solid #e5e7eb}
  .ticket-foot img{border-radius:4px}
  .ticket-meta{flex:1;font-size:10px;color:#6b7280}
  .ticket-meta b{color:#111;font-size:12px}
  .ticket-strat{margin-top:2px;font-style:italic}
  .ticket-sequence{font-family:'JetBrains Mono',monospace;color:#a1a1aa;margin-top:2px}
  .footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center}
  .no-print{text-align:center;margin-top:20px}
  .no-print button{background:#22c55e;color:#fff;border:0;padding:10px 24px;border-radius:6px;font-weight:600;cursor:pointer}
  @media print{body{background:#fff;padding:0}.no-print{display:none}@page{margin:10mm}}
</style></head><body>
<div class="header">
  <h1>⚡ Titan <span>Loterias</span> — Fichas para conferência</h1>
  <div class="meta">${escapeHtml(lottery.name)}<br/>${now}</div>
</div>
<div class="summary">
  <div>Total de jogos<b>${result.games.length}</b></div>
  <div>Custo total<b>R$ ${total.toFixed(2)}</b></div>
  <div>Estratégia<b>${escapeHtml(result.strategy)}</b></div>
  <div>Meta condicional<b>${result.request.guarantee.minHits} acertos se ${result.request.guarantee.hitsInBase} sorteadas estiverem na base</b></div>
  <div>Verificação<b>${result.validation.exhaustive && result.validation.meetsGuarantee ? "Meta comprovada" : result.validation.exhaustive ? "Meta não atingida" : "Amostral — sem prova"}</b></div>
  <div>Base<b>${result.request.baseNumbers.length} dezenas</b></div>
</div>
<div class="grid">${cards}</div>
<div class="footer">
  QR Code interno: TITAN|modalidade|sequência|dezenas. Não é código oficial da Caixa.
  Ficha interna de conferência: não comprova aposta, pagamento, registro ou prêmio. Confira preço e regras na Caixa.
</div>
<div class="no-print"><button onclick="window.print()">🖨️ Imprimir fichas</button></div>
</body></html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) w.onload = () => URL.revokeObjectURL(url);
      else toast.error("Habilite pop-ups para abrir as fichas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar fichas.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Fichas internas imprimíveis (QR + Código)
          <Badge variant="secondary" className="ml-auto">
            <QrCode className="h-3 w-3 mr-1" /> {result.games.length} fichas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Gera fichas internas, uma por jogo, com QR Code de uso interno, identificador sequencial
          e resumo do fechamento. Não são volantes ou comprovantes oficiais de apostas.
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border bg-muted/10 p-2">
            <div className="text-muted-foreground">Total</div>
            <div className="font-mono font-bold">R$ {total.toFixed(2)}</div>
          </div>
          <div className="rounded border bg-muted/10 p-2">
            <div className="text-muted-foreground">Por jogo</div>
            <div className="font-mono font-bold">R$ {lottery.ticketPrice.toFixed(2)}</div>
          </div>
          <div className="rounded border bg-muted/10 p-2">
            <div className="text-muted-foreground">Fichas</div>
            <div className="font-mono font-bold">{result.games.length}</div>
          </div>
        </div>
        <Button className="w-full" onClick={buildAndPrint} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
          Gerar fichas para impressão
        </Button>
      </CardContent>
    </Card>
  );
}
