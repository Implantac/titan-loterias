import { Link } from "react-router-dom";
import { LOTTERIES } from "@/data/lotteries";

const simple = new Set(["megasena", "lotofacil", "quina", "lotomania", "duplasena"]);
const conditionalClosing = new Set(["megasena", "lotofacil", "quina"]);

/** Public, static preview: no account, API calls, results or checkout. */
export function TransparentDemo() {
  return <section className="py-14 border-y border-border/50 bg-card/20" aria-labelledby="demo-title">
    <div className="container mx-auto px-6 max-w-5xl space-y-7">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Antes do cadastro</p>
        <h2 id="demo-title" className="text-3xl font-bold mt-2">Veja um exemplo do que você organiza</h2>
        <p className="text-muted-foreground mt-3">Prévia estática e ilustrativa de um planejamento Mega-Sena. Não é resultado de sorteio, recomendação, aposta registrada ou bolão oficial.</p>
      </div>
      <div className="rounded-xl border border-primary/30 bg-background p-5 sm:p-7 space-y-4">
        <h3 className="font-semibold">Exemplo: 3 jogos simples, 2 participantes</h3>
        <div className="grid sm:grid-cols-3 gap-3 font-mono text-sm" aria-label="Jogos fictícios">
          {["04 · 12 · 23 · 35 · 44 · 58", "07 · 16 · 28 · 32 · 49 · 55", "03 · 18 · 25 · 39 · 46 · 60"].map((jogo, i) => <div className="rounded-lg border border-border p-3" key={jogo}>Jogo {i + 1}<br />{jogo}</div>)}
        </div>
        <p className="text-sm">A R$ 6,00 por jogo <strong>apenas como referência ilustrativa</strong>: R$ 18,00 no total e R$ 9,00 por participante, sem taxa privada. Confirme valores e regras atuais na Caixa.</p>
        <p className="text-xs text-muted-foreground">O Titan organiza a lista e as cotas; o registro, pagamento da aposta e comprovante dependem exclusivamente dos canais oficiais. Nenhum jogo tem chance maior por aparecer aqui.</p>
        <Link to="/como-funciona" className="inline-block text-primary underline underline-offset-4">Entenda o fluxo e os limites antes de comprar</Link>
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-bold">O que muda conforme a modalidade?</h3>
        <p className="text-sm text-muted-foreground">Recursos de planejamento não equivalem a aposta registrada. A disponibilidade no aplicativo pode depender de login, plano e dados atualizados.</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-sm text-left">
            <caption className="sr-only">Recursos de planejamento por modalidade</caption>
            <thead className="bg-muted/40"><tr><th scope="col" className="p-3">Modalidade</th><th scope="col" className="p-3">Jogo simples no gerador</th><th scope="col" className="p-3">Fechamento condicional</th><th scope="col" className="p-3">Planejamento</th></tr></thead>
            <tbody>{LOTTERIES.map(l => <tr key={l.id} className="border-t border-border/60"><th scope="row" className="p-3 font-medium">{l.name}</th><td className="p-3">{simple.has(l.id) ? "Sim, com validação" : "Não neste gerador"}</td><td className="p-3">{conditionalClosing.has(l.id) ? "Conforme matriz e condições" : "Não anunciado"}</td><td className="p-3">{l.id === "supersete" || l.id === "maismilionaria" ? "Fluxo específico; não salva no formato genérico" : l.id === "federal" ? "Consulte recursos no app" : "Recursos variam no aplicativo"}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <Link to="/planos" className="inline-block rounded-lg bg-primary text-primary-foreground px-5 py-3 font-semibold">Comparar planos e condições</Link>
    </div>
  </section>;
}
