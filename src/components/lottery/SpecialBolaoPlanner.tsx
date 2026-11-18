import { useState } from "react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatters";
import { allocateBolaoCents } from "@/utils/bolaoAllocation";
import { formatSpecialBolaoGame, isValidSpecialBolaoGame, SPECIAL_GAME_SOURCE,
  specialBolaoInternalTxt, type SpecialBolaoGame } from "@/utils/specialBolaoGames";

type Kind = SpecialBolaoGame["kind"];
const validNumber = (value: string) => /^\d+$/.test(value) ? Number(value) : NaN;

export function SpecialBolaoPlanner({ kind }: { kind: Kind }) {
  const [games, setGames] = useState<SpecialBolaoGame[]>([]);
  const [columns, setColumns] = useState<string[]>(Array(7).fill(""));
  const [numbers, setNumbers] = useState<string[]>(Array(6).fill(""));
  const [trevos, setTrevos] = useState<string[]>(Array(2).fill(""));
  const [shares, setShares] = useState(2);
  const [priceInput, setPriceInput] = useState("");
  const [priceSource, setPriceSource] = useState("");
  const name = kind === "supersete" ? "Super Sete" : "+Milionária";
  const internalPrice = kind === "supersete" ? 3 : 6;
  const manualPriceValid = !priceInput || (/^\d+(?:[.,]\d{1,2})?$/.test(priceInput) && Number(priceInput.replace(",", ".")) >= 0.01 && Number(priceInput.replace(",", ".")) <= 1000);
  const customPrice = priceInput && manualPriceValid ? Number(priceInput.replace(",", ".")) : null;
  const price = customPrice ?? internalPrice;
  const selectedGames = games.filter(g => g.kind === kind);
  const total = selectedGames.length * price;
  const allocation = allocateBolaoCents(total, Array(shares).fill(1));
  const canExport = selectedGames.length > 0 && selectedGames.every(isValidSpecialBolaoGame) &&
    !!allocation && manualPriceValid && (!priceInput || !!priceSource.trim());

  const addGame = () => {
    const game: SpecialBolaoGame = kind === "supersete"
      ? { kind, columns: columns.map(validNumber) }
      : { kind, numbers: numbers.map(validNumber), trevos: trevos.map(validNumber) };
    if (!isValidSpecialBolaoGame(game)) {
      toast.error(kind === "supersete" ? "Escolha um dígito de 0 a 9 para cada uma das 7 colunas." : "Informe 6 dezenas distintas de 1 a 50 e 2 trevos distintos de 1 a 6.");
      return;
    }
    if (games.length >= 100) { toast.error("Limite de 100 jogos por planejamento; remova um jogo antes de continuar."); return; }
    setGames(prev => [...prev, game]);
    setColumns(Array(7).fill("")); setNumbers(Array(6).fill("")); setTrevos(Array(2).fill(""));
  };
  const exportText = () => {
    if (!canExport) return;
    const text = `${specialBolaoInternalTxt(selectedGames)}\nPREÇO/JOGO=${formatCurrency(price)} (${customPrice === null ? "referência interna" : `manual: ${priceSource}`}; confirmar na Caixa)\nTOTAL PLANEJADO=${formatCurrency(total)}\nCOTAS PRIVADAS=${shares}\nVALORES INDIVIDUAIS=${allocation?.map(c => formatCurrency(c / 100)).join("; ")}\nNÃO COMPROVA PARTICIPAÇÃO OU PAGAMENTO`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `planejamento-${kind}.txt`; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportPdf = () => {
    if (!canExport) return;
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text(`Titan | Planejamento interno ${name}`, 14, 18);
    doc.setFontSize(9);
    const lines = ["Não é bilhete, recibo nem arquivo oficial da Caixa.", `Fonte das regras: ${SPECIAL_GAME_SOURCE[kind]}`,
      `Preço de referência: ${formatCurrency(price)} por jogo (${customPrice === null ? "tabela interna" : `manual: ${priceSource}`})`,
      `Total planejado: ${formatCurrency(total)} | Cotas privadas: ${shares}`,
      `Valores individuais: ${allocation?.map(c => formatCurrency(c / 100)).join("; ")}`,
      "Confirme preços, limites e jogos nos canais oficiais antes de apostar."];
    let y = 28;
    for (const line of [...lines, ...selectedGames.map((g, i) => `Jogo ${i + 1}: ${formatSpecialBolaoGame(g)}`)]) {
      if (y > 275) { doc.addPage(); y = 18; }
      for (const part of doc.splitTextToSize(line, 180)) { doc.text(part, 14, y); y += 5; }
      y += 2;
    }
    doc.save(`planejamento-${kind}.pdf`);
  };

  return <section className="space-y-5 rounded-xl border border-border p-4 sm:p-6" aria-label={`Planejamento interno ${name}`}>
    <div><h2 className="text-xl font-bold">Planejamento privado — {name}</h2>
      <p className="text-sm text-muted-foreground">Jogo simples estruturado. O Titan não registra aposta, vende cotas ou verifica pagamento. TXT/PDF são apenas para conferência humana; não há formato de importação Caixa homologado.</p>
      <a href={SPECIAL_GAME_SOURCE[kind]} target="_blank" rel="noopener noreferrer" className="text-sm underline text-primary">Regras atuais da modalidade na Caixa</a>
    </div>
    {kind === "supersete" ? <div className="space-y-2">
      <p className="text-sm">Escolha um dígito por coluna (repetições entre colunas são válidas).</p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">{columns.map((value, i) => <label key={i} className="text-xs">Coluna {i + 1}
        <select aria-label={`Coluna ${i + 1}`} value={value} onChange={e => setColumns(prev => prev.map((v, j) => j === i ? e.target.value : v))}
          className="w-full rounded border border-border bg-background p-2"><option value="">—</option>
          {Array.from({ length: 10 }, (_, n) => <option value={n} key={n}>{n}</option>)}</select></label>)}</div>
      <p className="text-xs text-amber-400">A página da Caixa informa que jogo simples de 7 dígitos não é permitido como Bolão Caixa. Este é apenas planejamento privado.</p>
    </div> : <div className="space-y-3">
      <p className="text-sm">Selecione 6 dezenas distintas e 2 trevos distintos.</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{numbers.map((value, i) => <label key={i} className="text-xs">Dezena {i + 1}
        <Input type="number" min={1} max={50} step={1} value={value} onChange={e => setNumbers(prev => prev.map((v, j) => j === i ? e.target.value : v))} /></label>)}</div>
      <div className="grid grid-cols-2 gap-2 max-w-xs">{trevos.map((value, i) => <label key={i} className="text-xs">Trevo {i + 1}
        <Input type="number" min={1} max={6} step={1} value={value} onChange={e => setTrevos(prev => prev.map((v, j) => j === i ? e.target.value : v))} /></label>)}</div>
    </div>}
    <Button type="button" onClick={addGame}>Adicionar jogo ao planejamento</Button>
    <div className="space-y-1 text-sm"><h3 className="font-semibold">Jogos planejados ({selectedGames.length})</h3>
      {selectedGames.map((game, i) => <div key={i} className="flex items-center gap-3 rounded border border-border p-2">
        <span className="font-mono flex-1 break-all">#{i + 1} {formatSpecialBolaoGame(game)}</span>
        <Button size="sm" variant="outline" onClick={() => setGames(prev => prev.filter((_, index) => index !== i))}>Remover</Button>
      </div>)}</div>
    <div className="grid sm:grid-cols-3 gap-3">
      <label className="text-xs">Cotas privadas de planejamento (2 a 100)
        <Input type="number" min={2} max={100} step={1} value={shares} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 2 && n <= 100) setShares(n); }} /></label>
      <label className="text-xs">Preço manual por jogo (R$; opcional)
        <Input type="number" min="0.01" max="1000" step="0.01" value={priceInput} placeholder={String(internalPrice)}
          onChange={e => setPriceInput(e.target.value)} /></label>
      <label className="text-xs">Fonte/data do preço manual
        <Input maxLength={120} value={priceSource} placeholder="Ex.: Caixa em DD/MM/AAAA" onChange={e => setPriceSource(e.target.value)} /></label>
    </div>
    <p className="text-sm">Custo estimado: {formatCurrency(total)} · cota aproximada: {formatCurrency(total / shares)}. Valores de referência sujeitos a conferência na Caixa.</p>
    {allocation && <div className="text-sm"><p className="font-semibold">Rateio interno exato, por cota (não comprova pagamento):</p>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-1 max-h-32 overflow-auto">{allocation.map((cents, i) => <li key={i}>Cota {i + 1}: {formatCurrency(cents / 100)}</li>)}</ol></div>}
    {!!priceInput && !manualPriceValid && <p role="alert" className="text-xs text-destructive">Preço inválido: informe de R$ 0,01 a R$ 1.000,00 com até duas casas decimais.</p>}
    {!!priceInput && manualPriceValid && !priceSource.trim() && <p role="alert" className="text-xs text-destructive">Informe a fonte/data do preço manual antes de exportar.</p>}
    <div className="flex gap-2 flex-wrap"><Button disabled={!canExport} onClick={exportText}>Baixar TXT interno</Button>
      <Button disabled={!canExport} variant="outline" onClick={exportPdf}>Baixar PDF interno</Button></div>
    <p className="text-xs text-muted-foreground">Arquivos internos não comprovam registro, pagamento ou aceitação do bolão pela Caixa. Confirme tudo no recibo oficial.</p>
  </section>;
}
