import { useState, useMemo } from "react";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useBetGenerator } from "@/hooks/logic/useBetGenerator";
import { AnimatePresence, motion } from "framer-motion";
import { AIAnalystBriefing } from "@/components/lottery/AIAnalystBriefing";
import { TitanCommandCenter } from "@/components/common/TitanCommandCenter";
import { DashboardHeader } from "@/components/layout/dashboard/DashboardHeader";
import { RecommendationCard } from "@/components/lottery/RecommendationCard";
import { TitanAIModule } from "@/components/lottery/TitanAIModule";
import { TitanStatsModule } from "@/components/lottery/TitanStatsModule";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BrainCircuit, Target, History, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";
import { LotterySyncStatus } from "@/components/lottery/LotterySyncStatus";
import { GamificationCard } from "@/components/GamificationCard";
import { NeuralMissionCenter } from "@/components/NeuralMissionCenter";
import { useNavigate } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DashboardPage = () => {
  const { 
    stats, 
    draws, 
    selectedLottery, 
    timeRange, 
    setTimeRange, 
    customInterval, 
    setCustomInterval 
  } = useLotteryContext();
  const { luckyGame, generating, generateGame } = useBetGenerator();
  const [showBriefing, setShowBriefing] = useState(false);
  const navigate = useNavigate();

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case "today": return "Hoje";
      case "week": return "Esta Semana";
      case "month": return "Este Mês";
      case "custom": return "Personalizado";
      case "all": return "Todo Período";
      default: return "Filtrar";
    }
  }, [timeRange]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-primary/30 text-primary bg-primary/5">
            Command Center
          </Badge>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Sincronizado</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Central de <span className="gradient-brand-text">Inteligência</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Terminal quantitativo de análise e otimização de apostas baseado em evidências matemáticas e rigor estatístico.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">{timeRangeLabel}</span>
                  <Filter className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-card border-primary/20">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Filtro Temporal</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem onClick={() => setTimeRange("all")} className="gap-2 text-xs">
                  Todo o Período
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeRange("today")} className="gap-2 text-xs">
                  Hoje
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeRange("week")} className="gap-2 text-xs">
                  Esta Semana
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeRange("month")} className="gap-2 text-xs">
                  Este Mês
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-8 bg-border/40 mx-1 hidden sm:block" />

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/analise")}
              onMouseEnter={() => prefetchRoute("/analise")}
              onFocus={() => prefetchRoute("/analise")}
              onTouchStart={() => prefetchRoute("/analise")}
            >
              <History className="w-4 h-4" />
              Análise Histórica
            </Button>
            <Button
              variant="premium"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/gerador")}
              onMouseEnter={() => prefetchRoute("/gerador")}
              onFocus={() => prefetchRoute("/gerador")}
              onTouchStart={() => prefetchRoute("/gerador")}
            >
              <Target className="w-4 h-4" />
              Gerar Apostas
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <LotterySyncStatus />
        <TitanStatsModule />
      </div>

      <RecommendationCard
        luckyGame={luckyGame}
        generating={generating}
        onGenerate={(p) => generateGame(p)}
        onShowBriefing={() => setShowBriefing(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TitanAIModule />
          <TitanCommandCenter />
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-foreground/90">
              <Sparkles className="w-4 h-4 text-primary" />
              Insights do Dia
            </h4>

            <div className="space-y-3">
              {[
                { title: "Tendência de Pares", value: "Premium", desc: "Titan Score 91/100 detectado." },
                { title: "Soma Ideal", value: "Faixa histórica", desc: "Intervalo de soma mais comum nos sorteios." },
                { title: "Alerta de Ciclo", value: "Ativo", desc: "Dezenas em convergência estatística." },
              ].map((insight, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{insight.title}</span>
                    <span className="text-[11px] font-semibold text-primary">{insight.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">{insight.desc}</p>
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="w-full gap-2 group">
              Ver Relatório Completo
              <BrainCircuit className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </Button>
          </Card>

          <GamificationCard />
          <NeuralMissionCenter />

        </div>
      </div>

      <AnimatePresence>
        {showBriefing && luckyGame && (
          <AIAnalystBriefing
            game={luckyGame.numbers}
            score={luckyGame.score}
            strategy={luckyGame.strategy}
            reasons={luckyGame.reasons}
            onClose={() => setShowBriefing(false)}
          />
        )}
      </AnimatePresence>
      <div className="pt-8 border-t border-border/40">
        <ComplianceDisclaimer />
      </div>
    </div>
  );
};

export default DashboardPage;
