import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Como funciona | Titan Loterias</title>
        <meta name="description" content="Entenda como planejar jogos e cotas, conferir resultados e registrar apostas apenas nos canais oficiais da Caixa." />
      </Helmet>
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Guia de uso responsável</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold mt-3">Como funciona o Titan</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">O Titan ajuda a estudar resultados e organizar jogos. Não prevê sorteios, registra apostas, recebe pagamentos de cotas nem emite comprovante oficial.</p>
        </div>
        <HowItWorksSection />
        <section className="container mx-auto px-6 max-w-4xl space-y-6" aria-labelledby="passos-bolao">
          <h2 id="passos-bolao" className="text-2xl font-bold">Do planejamento ao comprovante</h2>
          <ol className="list-decimal pl-6 space-y-3 text-sm text-muted-foreground">
            <li>Escolha a modalidade e confira o concurso e a data do resultado na Caixa.</li>
            <li>Planeje jogos e custos de referência no Titan; confira preço e regras vigentes antes de apostar.</li>
            <li>Se houver grupo, combine por escrito cotas, taxa privada opcional e responsabilidades. PIX e status no Titan não confirmam transferência.</li>
            <li>Registre os jogos somente nos canais oficiais da Caixa e confira dezenas, concurso, valor e recibo emitido por eles.</li>
            <li>Guarde o comprovante oficial; PDF, ficha, hash e mensagens do Titan são apenas registros internos.</li>
          </ol>
          <p className="text-sm text-muted-foreground">Exemplo ilustrativo: três jogos simples de Mega-Sena a R$ 6,00 de referência somam R$ 18,00; duas cotas iguais seriam R$ 9,00 cada, sem taxa privada. Não é simulação de prêmio nem garantia de aceitação como Bolão Caixa.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="rounded-lg bg-primary text-primary-foreground px-5 py-3 font-semibold" to="/bolao?lottery=megasena">Planejar jogos no Titan</Link>
            <a className="rounded-lg border border-border px-5 py-3 font-semibold" href="https://loterias.caixa.gov.br/Paginas/mega-sena.aspx" target="_blank" rel="noopener noreferrer">Consultar regras da Caixa</a>
            <Link className="rounded-lg border border-border px-5 py-3 font-semibold" to="/planos">Consultar planos</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
