import { lazy, Suspense } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PlanGate } from "@/components/PlanGate";
import { EmptyState } from "@/components/common/EmptyState";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { Brain, Loader2, Sparkles, Target, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const StrategySimulatorPanel = lazy(() => import("@/components/lottery/simulators/StrategySimulatorPanel").then(m => ({ default: m.StrategySimulatorPanel })));
const StrategyComparatorPanel = lazy(() => import("@/components/lottery/simulators/StrategyComparatorPanel").then(m => ({ default: m.StrategyComparatorPanel })));
const PatternDetectorPanel = lazy(() => import("@/components/lottery/analysis/PatternDetectorPanel").then(m => ({ default: m.PatternDetectorPanel })));
const OptimizationPanel = lazy(() => import("@/components/OptimizationPanel").then(m => ({ default: m.OptimizationPanel })));
const MLPanel = lazy(() => import("@/components/lottery/analysis/MLPanel").then(m => ({ default: m.MLPanel })));
const AdvancedAnalyticsPanel = lazy(() => import("@/components/lottery/analysis/AdvancedAnalyticsPanel").then(m => ({ default: m.AdvancedAnalyticsPanel })));
const ConditionalProbabilityPanel = lazy(() => import("@/components/ConditionalProbabilityPanel").then(m => ({ default: m.ConditionalProbabilityPanel })));
const HPEnginePanel = lazy(() => import("@/components/HPEnginePanel").then(m => ({ default: m.HPEnginePanel })));

const LazyFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
    <span className="text-sm font-black uppercase tracking-widest italic">Carregando análise...</span>
  </div>
);

const EstrategiasPage = () => {
  const { config, draws, stats } = useLotteryContext();

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20 px-4 animate-in fade-in duration-1000">
      <div className="text-center space-y-6 pt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary shadow-[0_0_20px_rgba(234,179,8,0.15)]">
          <Brain className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Lab v9.0</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
              LABORATÓRIO DE <span className="gradient-brand-text">ESTRATÉGIAS</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto font-medium">
              Explore nossa biblioteca profissional de fechamentos, modelos preditivos e algoritmos de 
              Inteligência Artificial para otimizar sua tomada de decisão estratégica.
            </p>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-[2rem] blur-3xl opacity-10 group-hover:opacity-30 transition-opacity duration-1000 pointer-events-none" />
        <LotteryContextBanner />
      </div>

      {draws.length === 0 ? (
        <EmptyState description="Importe os sorteios primeiro no Dashboard para ativar os motores de estratégia." />
      ) : (
        <Tabs defaultValue="simuladores" className="w-full space-y-12">
          <div className="flex justify-center sticky top-0 z-30 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-border/10">
            <TabsList className="bg-secondary/40 border border-border/40 p-1.5 rounded-2xl h-auto flex gap-1 shadow-xl">
              <TabsTrigger value="simuladores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2 italic">
                <Target className="h-4 w-4" /> Simuladores
              </TabsTrigger>
              <TabsTrigger value="otimizadores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2 italic">
                <Zap className="h-4 w-4" /> Otimizadores
              </TabsTrigger>
              <TabsTrigger value="preditivos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2 italic">
                <Sparkles className="h-4 w-4" /> Tendências
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="simuladores" className="m-0 focus-visible:ring-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <PlanGate feature="estrategias_basicas" fallbackMessage="Simulador de Estratégias">
              <Suspense fallback={<LazyFallback />}>
                <StrategySimulatorPanel stats={stats} config={config} draws={draws} />
              </Suspense>
            </PlanGate>

            <PlanGate feature="estrategias_basicas" fallbackMessage="Comparador de Estratégias">
              <Suspense fallback={<LazyFallback />}>
                <StrategyComparatorPanel stats={stats} config={config} draws={draws} />
              </Suspense>
            </PlanGate>
            
            <PlanGate feature="estrategias_basicas" fallbackMessage="Probabilidade Condicional">
              <Suspense fallback={<LazyFallback />}>
                <ConditionalProbabilityPanel draws={draws} config={config} />
              </Suspense>
            </PlanGate>
          </TabsContent>

          <TabsContent value="otimizadores" className="m-0 focus-visible:ring-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <PlanGate feature="otimizacao" fallbackMessage="Otimização com Algoritmo Genético + SA">
              <Suspense fallback={<LazyFallback />}>
                <OptimizationPanel stats={stats} config={config} draws={draws} />
              </Suspense>
            </PlanGate>
            
            <PlanGate feature="estrategias_hp" fallbackMessage="Motor HP Matemático">
              <Suspense fallback={<LazyFallback />}>
                <HPEnginePanel stats={stats} config={config} draws={draws} />
              </Suspense>
            </PlanGate>
          </TabsContent>

          <TabsContent value="preditivos" className="m-0 focus-visible:ring-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <PlanGate feature="estrategias_ml" fallbackMessage="Estratégias Avançadas">
              <Suspense fallback={<LazyFallback />}>
                <MLPanel stats={stats} config={config} draws={draws} />
              </Suspense>
            </PlanGate>

            <PlanGate feature="estrategias_basicas" fallbackMessage="Detector de Padrões">
              <Suspense fallback={<LazyFallback />}>
                <PatternDetectorPanel config={config} draws={draws} stats={stats} />
              </Suspense>
            </PlanGate>

            <PlanGate feature="estrategias_analytics" fallbackMessage="Analytics Avançado">
              <Suspense fallback={<LazyFallback />}>
                <AdvancedAnalyticsPanel stats={stats} draws={draws} config={config} />
              </Suspense>
            </PlanGate>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EstrategiasPage;
