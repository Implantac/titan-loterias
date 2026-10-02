import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Sparkles, 
  Target, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLotteryContext } from '@/contexts/LotteryContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  description: string;
  icon: any;
  actionLabel: string;
}

export function GuidedOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { config } = useLotteryContext();
  const navigate = useNavigate();

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('titan_onboarding_completed');
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: Step[] = [
    {
      title: "Bem-vindo ao Titan Loterias",
      description: `Vou te guiar para gerar seus primeiros jogos com análise estatística na ${config.name} em menos de 60 segundos.`,
      icon: Brain,
      actionLabel: "Começar Agora"
    },
    {
      title: `Análise da ${config.name}`,
      description: `Nossos algoritmos processaram os últimos sorteios da ${config.name} e calcularam frequência e atraso de cada dezena desta modalidade.`,
      icon: Zap,
      actionLabel: "Ver Recomendação"
    },
    {
      title: "Escolha sua estratégia",
      description: `Combinamos tendências quentes e dezenas atrasadas da ${config.name} para montar jogos dentro dos critérios que você escolher. Estatística não garante prêmio: sorteios são aleatórios.`,
      icon: Target,
      actionLabel: "Gerar Aposta Elite"
    },
    {
      title: "Sua Aposta Está Pronta",
      description: `Clique abaixo para ir ao Gerador e montar seus jogos para o próximo concurso da ${config.name}.`,
      icon: Trophy,
      actionLabel: "Ir para o Gerador"
    }
  ];


  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('titan_onboarding_completed', 'true');
    setIsOpen(false);
    navigate('/gerador', { state: { fromOnboarding: true, lotteryId: config.id } });
  };



  const handleSkip = () => {
    localStorage.setItem('titan_onboarding_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <m.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-card border border-border/40 rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary/20">
          <m.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <button 
          onClick={handleSkip}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/20 text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 space-y-8 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                <StepIcon className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-card">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-tight">
              {steps[currentStep].title}
            </h2>
            <p className="text-muted-foreground font-medium leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <Button 
              size="lg" 
              onClick={handleNext}
              className="h-16 rounded-2xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 group"
            >
              {steps[currentStep].actionLabel}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="flex justify-center gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i === currentStep ? "bg-primary w-6" : "bg-primary/20"
                  )} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-10 py-6 bg-secondary/20 border-t border-border/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dados oficiais da Caixa</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Passo {currentStep + 1} de {steps.length}</span>
        </div>
      </m.div>
    </div>
  );
}
