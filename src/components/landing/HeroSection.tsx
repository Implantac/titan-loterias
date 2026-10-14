import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
      className="relative min-h-[85vh] md:min-h-[92vh] flex items-center justify-center pt-28 pb-16 overflow-hidden bg-background"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background/80 z-10" />
        <FloatingLotteryBalls count={16} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[80vh] bg-primary/10 rounded-full blur-[140px] opacity-25 z-0" />
      </div>

      <motion.div 
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="container mx-auto px-6 relative z-20"
      >
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <motion.div 
            variants={fadeUp} 
            custom={0}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md shadow-sm"
          >
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide">
              {t('landing.hero.subtitle', 'Análise Estatística • Acesso Vitalício')}
            </span>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={1}
            initial="hidden"
            animate="visible"
            className="space-y-4 sm:space-y-6"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
              Ciência de Dados Real <br className="hidden sm:inline" />
              <span className="gradient-brand-text">Aplicada a Loterias</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
              Análise estatística sobre resultados oficiais da Caixa, fechamentos matemáticos com verificação exaustiva e módulo de bolão. Decisões com base em evidências, nunca em achismo.
            </p>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={2}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 sm:pt-4"
          >
            <Button 
              size="lg" 
              onClick={(e) => handleCtaClick(e, "/login")}
              className="group h-12 sm:h-13 px-8 rounded-xl text-sm sm:text-base font-semibold gradient-brand text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto"
            >
              Entrar na Plataforma
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={(e) => handleCtaClick(e, "/planos")}
              className="h-12 sm:h-13 px-8 rounded-xl text-sm sm:text-base font-semibold border border-primary/25 bg-card/40 hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all w-full sm:w-auto"
            >
              Ver Planos
            </Button>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={3}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-8 sm:pt-12 text-muted-foreground/80 border-t border-white/5"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <span>Resultados Oficiais Caixa</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <span>Verificação Matemática Exaustiva</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Brain className="w-4 h-4 text-primary shrink-0" />
              <span>Metodologia & Scores Transparentes</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Visual Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent z-30 pointer-events-none" />
    </section>
  );
}
