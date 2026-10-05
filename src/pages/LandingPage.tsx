import { useScroll, useTransform, motion } from "framer-motion";
import { useRef, useCallback, lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";
import { LOTTERIES } from "@/data/lotteries";

import { burstConfetti } from "@/lib/confetti";
import { prefetchRoute } from "@/lib/routePrefetch";

// Below-the-fold sections – code-split to keep the initial landing chunk tiny
const LotteryLogosCarousel = lazy(() =>
  import("@/components/lottery/LotteryLogosCarousel").then((m) => ({ default: m.LotteryLogosCarousel }))
);
const SocialProofBar = lazy(() =>
  import("@/components/common/SocialProofBar").then((m) => ({ default: m.SocialProofBar }))
);
const FeaturesSection = lazy(() =>
  import("@/components/landing/FeaturesSection").then((m) => ({ default: m.FeaturesSection }))
);
const ScreensShowcase = lazy(() =>
  import("@/components/landing/ScreensShowcase").then((m) => ({ default: m.ScreensShowcase }))
);
const TitanCommandCenter = lazy(() =>
  import("@/components/common/TitanCommandCenter").then((m) => ({ default: m.TitanCommandCenter }))
);
const HowItWorksSection = lazy(() =>
  import("@/components/landing/HowItWorksSection").then((m) => ({ default: m.HowItWorksSection }))
);
const SupportedLotteries = lazy(() =>
  import("@/components/landing/SupportedLotteries").then((m) => ({ default: m.SupportedLotteries }))
);
const PricingSection = lazy(() =>
  import("@/components/common/PricingSection").then((m) => ({ default: m.PricingSection }))
);
const FAQSection = lazy(() =>
  import("@/components/landing/FAQSection").then((m) => ({ default: m.FAQSection }))
);
const FloatingCTA = lazy(() =>
  import("@/components/common/FloatingCTA").then((m) => ({ default: m.FloatingCTA }))
);
const WhatsAppButton = lazy(() =>
  import("@/components/common/WhatsAppButton").then((m) => ({ default: m.WhatsAppButton }))
);

const SectionFallback = () => <div className="min-h-[280px]" aria-hidden />;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [deferredReady, setDeferredReady] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const handleCtaClick = useCallback((e: React.MouseEvent, to: string) => {
    e.preventDefault();
    burstConfetti(e);
    setTimeout(() => navigate(to), 500);
  }, [navigate]);

  // Defer non-critical overlays (floating CTA / WhatsApp) until after paint
  useEffect(() => {
    const idle = (cb: () => void) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb);
      else setTimeout(cb, 1200);
    };
    idle(() => setDeferredReady(true));
  }, []);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: featuresProgress } = useScroll({
    target: featuresRef,
    offset: ["start end", "end start"],
  });

  const heroY = useTransform(heroProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 0.6], [1, 0.92]);
  const featuresRotateX = useTransform(featuresProgress, [0, 0.5], [4, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden antialiased selection:bg-primary selection:text-white">
      <Helmet>
        <title>Titan Loterias | Inteligência Artificial e Ciência de Dados Aplicada</title>
        <meta name="description" content="Titan Loterias é uma plataforma de inteligência aplicada às loterias brasileiras que analisa históricos oficiais, identifica padrões estatísticos e utiliza IA para gerar apostas mais estratégicas." />
        <meta property="og:title" content="Titan Loterias | Inteligência Artificial para Loterias" />
        <meta property="og:description" content="Analise históricos oficiais, identifique padrões estatísticos e utilize IA para gerar apostas estratégicas." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="Mega-Sena, Lotofácil, Quina, Inteligência Artificial, Loterias, Gerador de Apostas, Probabilidade, Estatística, Análise de Dados" />
      </Helmet>

      {deferredReady && (
        <Suspense fallback={null}>
          <FloatingCTA />
        </Suspense>
      )}
      <Navbar />

      <HeroSection
        heroRef={heroRef}
        heroY={heroY}
        heroOpacity={heroOpacity}
        heroScale={heroScale}
        handleCtaClick={handleCtaClick}
        fadeUp={fadeUp}
      />

      <section className="py-32 md:py-64 border-y border-white/5 bg-black/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center mb-24">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 text-primary border border-primary/20 mb-8 italic drop-shadow-md"
            >
              Análise estatística completa
            </motion.div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12 mb-32">
            {[
              { label: "Loterias Suportadas", value: String(LOTTERIES.length).padStart(2, "0") },
              { label: "Fonte dos Resultados", value: "Caixa" },
              { label: "Verificação de Dados", value: "Lacunas e duplicados" },
              { label: "Score", value: "Explicado" },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-10 rounded-[3rem] glass-card border-white/5 group hover:border-primary/40 transition-all duration-500 shadow-premium hover:shadow-premium-hover relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <p className="text-4xl md:text-6xl font-black tracking-tighter italic gradient-brand-text mb-4 drop-shadow-2xl relative z-10">{stat.value}</p>
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 italic relative z-10">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <Suspense fallback={<SectionFallback />}>
            <div className="py-12 border-t border-white/5">
              <LotteryLogosCarousel />
            </div>
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<SectionFallback />}>
        <SocialProofBar />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <FeaturesSection
          featuresRef={featuresRef}
          featuresRotateX={featuresRotateX}
          fadeUp={fadeUp}
        />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <ScreensShowcase />
      </Suspense>

      <section className="py-32 md:py-64 relative overflow-hidden bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[800px] bg-primary/10 rounded-full blur-[140px] opacity-20 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-32">
            <div className="inline-flex items-center px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 text-primary border border-primary/20 mb-8 italic drop-shadow-md">
              Sincronização em Tempo Real
            </div>
            <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase italic leading-[1] mb-10 drop-shadow-2xl text-white">
              Central <span className="gradient-brand-text drop-shadow-[0_0_20px_rgba(201,168,76,0.3)]">de Análise Titan</span>
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto font-medium text-xl opacity-70 italic leading-relaxed px-4">
              Acompanhe em tempo real o processamento dos concursos oficiais e a detecção de padrões estatísticos pela nossa inteligência de elite.
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<SectionFallback />}>
              <div className="shadow-2xl shadow-primary/10 rounded-[3rem]">
                <TitanCommandCenter />
              </div>
            </Suspense>
          </div>
        </div>
      </section>

      <Suspense fallback={<SectionFallback />}>
        <HowItWorksSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <SupportedLotteries />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <PricingSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <FAQSection />
      </Suspense>

      <footer className="py-24 border-t border-white/5 bg-black/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-20" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-2 space-y-8">
              <div className="flex items-center gap-4 group">
                <img src="/logo.png" alt="Titan Loterias" className="w-12 h-12 grayscale opacity-50" loading="lazy" decoding="async" />
                <span className="text-2xl font-black uppercase tracking-tighter italic leading-none">
                  Titan<span className="text-primary/70">Loterias</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed font-medium">
                Plataforma brasileira de inteligência estatística e IA aplicada às loterias oficiais. Analise, simule e monte apostas com base em dados — nunca no achismo.
              </p>
            </div>
            <div>
              <h4 className="font-black uppercase tracking-[0.3em] text-[10px] text-primary mb-8 italic">Plataforma</h4>
              <ul className="space-y-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <li><Link to="/gerador" onMouseEnter={() => prefetchRoute("/gerador")} onFocus={() => prefetchRoute("/gerador")} onTouchStart={() => prefetchRoute("/gerador")} className="hover:text-primary transition-colors">Gerador de Apostas</Link></li>
                <li><Link to="/analise" onMouseEnter={() => prefetchRoute("/analise")} onFocus={() => prefetchRoute("/analise")} onTouchStart={() => prefetchRoute("/analise")} className="hover:text-primary transition-colors">Central de Análise</Link></li>
                <li><Link to="/fechamentos" onMouseEnter={() => prefetchRoute("/fechamentos")} onFocus={() => prefetchRoute("/fechamentos")} onTouchStart={() => prefetchRoute("/fechamentos")} className="hover:text-primary transition-colors">Fechamentos</Link></li>
                <li><Link to="/planos" onMouseEnter={() => prefetchRoute("/planos")} onFocus={() => prefetchRoute("/planos")} onTouchStart={() => prefetchRoute("/planos")} className="hover:text-primary transition-colors">Planos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black uppercase tracking-[0.3em] text-[10px] text-primary mb-8 italic">Empresa</h4>
              <ul className="space-y-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <li><Link to="/about" className="hover:text-primary transition-colors">Sobre Nós</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>
          <div className="mb-12">
            <ComplianceDisclaimer />
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">
              © {new Date().getFullYear()} Titan Loterias. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-8">
              {deferredReady && (
                <Suspense fallback={null}>
                  <WhatsAppButton />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
