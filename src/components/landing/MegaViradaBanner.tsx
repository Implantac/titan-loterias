import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Sparkles, Users } from 'lucide-react';
import { isMegaViradaCampaignActive, MEGA_VIRADA_2026_SOURCE } from './megaViradaCampaign';

export function MegaViradaBanner() {
  const [active, setActive] = useState(() => isMegaViradaCampaignActive(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setActive(isMegaViradaCampaignActive(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!active) return null;

  return (
    <section aria-labelledby="mega-virada-title" className="relative border-y border-emerald-400/20 bg-gradient-to-br from-emerald-950/70 via-background to-amber-950/20 py-8 md:py-12">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-emerald-400/25 bg-card/60 shadow-2xl shadow-emerald-950/20">
          <div className="grid gap-7 p-6 sm:p-9 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> Especial de fim de ano · 2026
              </p>
              <div>
                <h2 id="mega-virada-title" className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">Mega da Virada 2026</h2>
                <p className="mt-2 text-xl font-bold text-emerald-300 sm:text-2xl">Prêmio inicialmente estimado em mais de R$ 1 bilhão</p>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Organize jogos, confira custos e planeje um bolão com clareza. O valor é uma estimativa divulgada pela Caixa, sujeita a atualização; nenhum método garante acertos.
              </p>
              <p className="text-xs text-muted-foreground">
                Apostas e pagamentos somente pelos canais oficiais da Caixa. O Titan não registra apostas nem vende cotas.
                {' '}<a href={MEGA_VIRADA_2026_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">Fonte: Caixa Notícias, 03/11/2026 <ExternalLink className="h-3 w-3" /></a>
              </p>
            </div>
            <div className="flex flex-col gap-3 md:min-w-52">
              <Link to="/planos" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-center text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-300">
                Conhecer recursos <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/bolao" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 px-5 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-emerald-400/10">
                <Users className="h-4 w-4" /> Acessar bolão
              </Link>
              <span className="text-center text-xs text-muted-foreground">Bolão requer login; escolha Mega-Sena no aplicativo.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
