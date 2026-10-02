import { useLotteryContext } from "@/contexts/LotteryContext";
import { AIAutonomousDashboard } from "@/components/AIAutonomousDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { PlanGate } from "@/components/PlanGate";
import { Brain } from "lucide-react";

const IAAutonomaPage = () => {
  const { config, draws, stats } = useLotteryContext();

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Motor estatístico</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter italic uppercase leading-tight">
            IA <span className="gradient-brand-text not-italic">Autônoma</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Redes neurais em regime de aprendizado contínuo para detecção de anomalias estatísticas e padrões ocultos em tempo real.
          </p>
        </div>
      </div>
      
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
        <LotteryContextBanner />
      </div>

      {draws.length === 0 ? (
        <EmptyState description="Importe os sorteios primeiro no Dashboard para ativar a IA Autônoma." />
      ) : (
        <PlanGate feature="ia_autonoma" fallbackMessage="IA Autônoma com aprendizado contínuo para usuários de elite">
          <AIAutonomousDashboard config={config} draws={draws} stats={stats} />
        </PlanGate>
      )}
    </div>
  );
};

export default IAAutonomaPage;
