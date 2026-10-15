import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Shield, Zap, Sparkles, Users } from "lucide-react";
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
            className="flex flex-col items-center gap-4"
          >
            {/* Heroic Brand Emblem */}
            <div className="relative group cursor-pointer" onClick={(e) => handleCtaClick(e, "/planos")}>
              <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/60 via-amber-500/30 to-primary/60 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-primary/60 bg-black/80 shadow-2xl shadow-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                <img 
                  src="/logo.png" 
                  alt="Titan Loterias" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide">
                Lote Fundador Liberado • Acesso Vitalício por R$ 99,90
              </span>
            </div>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={1}
            initial="hidden"
            animate="visible"
            className="space-y-4 sm:space-y-6"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
              A Plataforma Inteligente de Apostas e Bolões nas <br className="hidden sm:inline" />
              <span className="gradient-brand-text">Loterias Caixa</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
              Análise estatística oficial, fechamentos matemáticos com garantia comprovada e gestão profissional de cotas para bolão. Pague uma única vez, sem mensalidades.
            </p>
          </motion.div>

          <motion.div 
            variants={fadeUp} 
            custom={2}
            initial="hidden"
            animate="visible"
            className="space-y-3 pt-2 sm:pt-4"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={(e) => handleCtaClick(e, "/planos")}
                className="group h-12 sm:h-13 px-8 rounded-xl text-sm sm:text-base font-bold gradient-brand text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Garantir Acesso Vitalício (R$ 99,90)
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={(e) => handleCtaClick(e, "/planos")}
                className="h-12 sm:h-13 px-8 rounded-xl text-sm sm:text-base font-semibold border border-primary/25 bg-card/40 hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all w-full sm:w-auto"
              >
                Comparar Planos
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Liberação imediata no Pix
              </span>
              <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                <Shield className="w-3.5 h-3.5 text-primary" /> Sem mensalidades
              </span>
              <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> 7 dias de garantia
              </span>
            </div>
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
              <span>Garantia Matemática Comprovada</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span>Módulo de Bolão com Recibo WhatsApp</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Visual Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent z-30 pointer-events-none" />
    </section>
  );
}
