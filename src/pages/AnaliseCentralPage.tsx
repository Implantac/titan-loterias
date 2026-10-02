import { useState, lazy, Suspense } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PieChart, Zap, Grid3X3, Brain, Bot, 
  BarChart3, Activity, TrendingUp, Search, Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, AnimatePresence } from "framer-motion";
import { LotterySyncStatus } from "@/components/lottery/LotterySyncStatus";

// Lazy imports for sub-pages components
const EstatisticasView = lazy(() => import("@/pages/EstatisticasPage"));
const FarolView = lazy(() => import("@/pages/FarolEstatisticoPage"));
const MatrizView = lazy(() => import("@/pages/MatrizAnalisePage"));
const IAAutonomaView = lazy(() => import("@/pages/IAAutonomaPage"));
const AIAnalystView = lazy(() => import("@/pages/AIAnalystPage"));

const LazyFallback = () => (
  <div className="space-y-6 animate-pulse">
    <Skeleton className="h-[200px] w-full rounded-2xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Skeleton className="h-[100px] rounded-xl" />
      <Skeleton className="h-[100px] rounded-xl" />
      <Skeleton className="h-[100px] rounded-xl" />
      <Skeleton className="h-[100px] rounded-xl" />
    </div>
    <Skeleton className="h-[400px] w-full rounded-2xl" />
  </div>
);

const AnaliseCentralPage = () => {
  const { config } = useLotteryContext();
  const [activeTab, setActiveTab] = useState("farol");

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto px-1">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Titan Analysis v4.0</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-tight">
            Módulo de <span className="gradient-brand-text">Análise</span> Histórica
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-lg leading-relaxed">
            Exploração dimensional profunda. O Titan utiliza heurísticas avançadas para detectar anomalias estatísticas em milhares de concursos.
          </p>
        </div>
      </div>

      
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
        <LotteryContextBanner />
      </div>

      <LotterySyncStatus />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-6 scrollbar-hide sticky top-20 z-30 bg-background/40 backdrop-blur-xl px-1 -mx-1 pt-2">
          <TabsList>
            <TabsTrigger value="farol" className="gap-2.5">
              <Zap className="w-4 h-4" />
              Farol Estatístico
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="gap-2.5">
              <PieChart className="w-4 h-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="matriz" className="gap-2.5">
              <Grid3X3 className="w-4 h-4" />
              Matriz HP
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-2.5">
              <Bot className="w-4 h-4" />
              Sinais IA
            </TabsTrigger>
          </TabsList>
        </div>


        <div className="mt-6">
          <AnimatePresence mode="wait">
            <m.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<LazyFallback />}>
                <TabsContent value="farol" className="m-0 border-none p-0 focus-visible:ring-0">
                  <FarolView />
                </TabsContent>
                <TabsContent value="estatisticas" className="m-0 border-none p-0 focus-visible:ring-0">
                  <EstatisticasView />
                </TabsContent>
                <TabsContent value="matriz" className="m-0 border-none p-0 focus-visible:ring-0">
                  <MatrizView />
                </TabsContent>
                <TabsContent value="ia" className="m-0 border-none p-0 focus-visible:ring-0">
                  <div className="space-y-8">
                    <AIAnalystView />
                    <div className="pt-10 border-t border-border/40">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tighter">Análise Automática</h3>
                          <p className="text-xs text-muted-foreground">Detecção de anomalias e padrões de alta frequência</p>
                        </div>
                      </div>
                      <IAAutonomaView />
                    </div>
                  </div>
                </TabsContent>
              </Suspense>
            </m.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
};

export default AnaliseCentralPage;