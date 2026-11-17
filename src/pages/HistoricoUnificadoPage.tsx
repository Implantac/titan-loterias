import { useState, lazy, Suspense } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, ClipboardCheck, Star, 
  Calendar, Trophy, Search, FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { m, AnimatePresence } from "framer-motion";

// Lazy imports for sub-pages components
const ResultadosView = lazy(() => import("@/pages/HistoricoPage"));
const MinhasApostasView = lazy(() => import("@/pages/HistoricoApostasPage"));
const JogosSalvosView = lazy(() => import("@/pages/JogosSalvosPage"));

const LazyFallback = () => (
  <div className="space-y-6 animate-pulse">
    <Skeleton className="h-[100px] w-full rounded-xl" />
    <Skeleton className="h-[400px] w-full rounded-2xl" />
  </div>
);

const HistoricoUnificadoPage = () => {
  const { config } = useLotteryContext();
  const [activeTab, setActiveTab] = useState("resultados");

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Records Center v6.0</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Histórico e <span className="gradient-brand-text">Registros</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-lg leading-relaxed">
            Consulte registros internos e resultados disponíveis; confirme concurso e data nos canais oficiais da Caixa.
          </p>
        </div>
      </div>

      
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
        <LotteryContextBanner />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-6 scrollbar-hide sticky top-20 z-30 bg-background/40 backdrop-blur-xl px-1 -mx-1 pt-2">
          <TabsList>
            <TabsTrigger value="resultados" className="gap-2.5">
              <Calendar className="w-4 h-4" />
              Sorteios Oficiais
            </TabsTrigger>
            <TabsTrigger value="apostas" className="gap-2.5">
              <ClipboardCheck className="w-4 h-4" />
              Conferidor
            </TabsTrigger>
            <TabsTrigger value="salvos" className="gap-2.5">
              <Star className="w-4 h-4" />
              Jogos Salvos
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
                <TabsContent value="resultados" className="m-0 border-none p-0 focus-visible:ring-0">
                  <ResultadosView />
                </TabsContent>
                <TabsContent value="apostas" className="m-0 border-none p-0 focus-visible:ring-0">
                  <MinhasApostasView />
                </TabsContent>
                <TabsContent value="salvos" className="m-0 border-none p-0 focus-visible:ring-0">
                  <JogosSalvosView />
                </TabsContent>
              </Suspense>
            </m.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
};

export default HistoricoUnificadoPage;