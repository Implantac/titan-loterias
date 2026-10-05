import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Shield, Zap } from "lucide-react";
import { FloatingLotteryBalls } from "@/components/lottery/FloatingLotteryBalls";

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement>;
  heroY: any;
  heroOpacity: any;
  heroScale: any;
  handleCtaClick: (e: React.MouseEvent, to: string) => void;
  fadeUp: any;
}

export function HeroSection({
  heroRef,
  heroY,
  heroOpacity,
  heroScale,
  handleCtaClick,
  fadeUp,
}: HeroSectionProps) {
  const { t } = useTranslation();
  return (
    <section 
      ref={heroRef} 
      className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center pt-24 pb-12 overflow-hidden bg-background"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background z-10" />
        <FloatingLotteryBalls count={20} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[100vh] bg-primary/10 rounded-full blur-[160px] opacity-20 z-0 animate-pulse" />
      </div>

      <motion.div 
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="container mx-auto px-6 relative z-20"
      >
        <div className="max-w-6xl mx-auto text-center space-y-10 md:space-y-16">
          <motion.div 
            variants={fadeUp} 
            custom={0}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md shadow-premium"
          >
            <Brain className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary italic drop-shadow-sm">
              {t('landing.hero.subtitle')}
            </span>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={1}
            initial="hidden"
            animate="visible"
            className="space-y-6 md:space-y-10"
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter uppercase italic leading-[0.9] drop-shadow-2xl text-white break-words">
              {t('landing.hero.title')}
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium italic opacity-70 leading-relaxed px-4 md:px-0">
              Análise estatística dos resultados oficiais das loterias. Decisões baseadas em evidências históricas, não em palpites.
            </p>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={2}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 md:pt-10"
          >
            <Button 
              size="lg" 
              onClick={(e) => handleCtaClick(e, "/login")}
              className="group h-16 md:h-20 px-10 md:px-16 rounded-[2rem] text-lg md:text-xl font-black uppercase tracking-widest gradient-brand text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-[1.05] active:scale-[0.98] transition-all duration-500 w-full sm:w-auto"
            >
              Entrar na Plataforma
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={(e) => handleCtaClick(e, "/planos")}
              className="h-16 md:h-20 px-10 md:px-16 rounded-[2rem] text-lg md:text-xl font-black uppercase tracking-widest border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 italic transition-all duration-500 w-full sm:w-auto"
            >
              Ver Planos
            </Button>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={3}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-16 md:pt-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-700"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Acesso Protegido</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-primary" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Dados Oficiais</span>
            </div>
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-primary" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Score Explicado</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Visual Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-30" />
    </section>
  );
}
