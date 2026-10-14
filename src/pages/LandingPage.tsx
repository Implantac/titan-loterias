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
        <title>Titan Loterias | Estatística Avançada, Fechamentos Matemáticos e Bolão</title>
        <meta name="description" content="Plataforma de inteligência quantitativa aplicada às loterias brasileiras: fechamentos matemáticos com garantia exaustiva, split-avoidance, análise estatística oficial e gestão profissional de bolão." />
        <meta property="og:title" content="Titan Loterias | Estatística Avançada e Fechamentos" />
        <meta property="og:description" content="Fechamentos matemáticos com garantia comprovada, split-avoidance e gestão profissional de bolão para loterias da Caixa." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="Mega-Sena, Lotofácil, Quina, Fechamento Matemático, Bolão, Gerador de Apostas, Probabilidade, Estatística, Análise de Dados" />
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

      {/* Stats Section */}
      <section className="py-16 md:py-24 border-y border-border/40 bg-card/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20"
            >
              Rigor e Transparência dos Dados
            </motion.div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Estatística Séria, <span className="gradient-brand-text">Sem Promessas Falsas</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Infraestrutura orientada a dados históricos para apostadores e organizadores de bolão.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
            {[
              { 
                value: String(LOTTERIES.length).padStart(2, "0"), 
                label: "Loterias Suportadas", 
                detail: "Modalidades ativas da Caixa" 
              },
              { 
                value: "API Caixa", 
                label: "Fonte dos Resultados", 
                detail: "Sincronização oficial em tempo real" 
              },
              { 
                value: "100%", 
                label: "Integridade de Base", 
                detail: "Zero lacunas ou duplicados" 
              },
              { 
                value: "Auditável", 
                label: "Metodologia & Scores", 
                detail: "Modelos com cálculo transparente" 
              },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-left p-5 sm:p-6 rounded-2xl glass-card border border-white/5 hover:border-primary/40 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-mono gradient-brand-text mb-2">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground mb-1 leading-snug">
                    {stat.label}
                  </p>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground relative z-10 mt-2">
                  {stat.detail}
                </p>
              </motion.div>
            ))}
          </div>

          <Suspense fallback={<SectionFallback />}>
            <div className="pt-8 border-t border-white/5">
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

      {/* Command Center Section */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[600px] bg-primary/10 rounded-full blur-[140px] opacity-20 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20">
              Sincronização em Tempo Real
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Central <span className="gradient-brand-text">de Análise Titan</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
              Acompanhe em tempo real o processamento dos concursos oficiais e o cálculo de indicadores estatísticos pelo motor Titan.
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<SectionFallback />}>
              <div className="shadow-2xl shadow-primary/10 rounded-2xl">
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

      <footer className="py-16 border-t border-white/5 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-20 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-12 mb-12">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3 group">
                <img src="/logo.png" alt="Titan Loterias" className="w-9 h-9 object-contain opacity-80" loading="lazy" decoding="async" />
                <span className="text-xl font-bold tracking-tight text-white">
                  Titan<span className="text-primary">Loterias</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Plataforma de inteligência estatística e combinatória aplicada às loterias oficiais da Caixa. Analise, simule e monte apostas com base em dados empíricos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-primary uppercase tracking-wider mb-4">Plataforma</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/gerador" onMouseEnter={() => prefetchRoute("/gerador")} className="hover:text-foreground transition-colors">Gerador de Apostas</Link></li>
                <li><Link to="/fechamentos" onMouseEnter={() => prefetchRoute("/fechamentos")} className="hover:text-foreground transition-colors">Fechamentos Matemáticos</Link></li>
                <li><Link to="/bolao" onMouseEnter={() => prefetchRoute("/bolao")} className="hover:text-foreground transition-colors">Módulo de Bolão</Link></li>
                <li><Link to="/analise" onMouseEnter={() => prefetchRoute("/analise")} className="hover:text-foreground transition-colors">Central de Análise</Link></li>
                <li><Link to="/planos" onMouseEnter={() => prefetchRoute("/planos")} className="hover:text-foreground transition-colors">Planos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-primary uppercase tracking-wider mb-4">Institucional</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/sobre" className="hover:text-foreground transition-colors">Sobre Nós</Link></li>
                <li><Link to="/seguranca" className="hover:text-foreground transition-colors">Segurança</Link></li>
                <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
                <li><Link to="/suporte" className="hover:text-foreground transition-colors">Suporte</Link></li>
              </ul>
            </div>
          </div>
          <div className="mb-8">
            <ComplianceDisclaimer />
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Titan Loterias. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
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
