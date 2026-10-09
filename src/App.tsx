import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthProvider";
import { LotteryProvider } from "@/contexts/LotteryContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminGuard } from "@/components/AdminGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazy, Suspense, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { ReferralSystem } from "@/lib/referral-system";
import { AutoInstallPrompt } from "@/components/pwa/AutoInstallPrompt";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { useRoutePerformance } from "@/hooks/useRoutePerformance";
import { useIdlePrefetch } from "@/hooks/useIdlePrefetch";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const GeradorPage = lazy(() => import("@/pages/GeradorPage"));
const FechamentosPage = lazy(() => import("@/pages/FechamentosPage"));
const FechamentoUniversalPage = lazy(() => import("@/pages/FechamentoUniversalPage"));
const AnaliseCentralPage = lazy(() => import("@/pages/AnaliseCentralPage"));
const HistoricoUnificadoPage = lazy(() => import("@/pages/HistoricoUnificadoPage"));
const PerfilPage = lazy(() => import("@/pages/PerfilPage"));
const PlanosPage = lazy(() => import("@/pages/PlanosPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const SuportePage = lazy(() => import("./pages/SuportePage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const PwaOfflineTestPage = lazy(() => import("./pages/PwaOfflineTestPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AIChatPage = lazy(() => import("@/pages/AIChatPage"));
const IAAutonomaPage = lazy(() => import("@/pages/IAAutonomaPage"));
const EstrategiasPage = lazy(() => import("@/pages/EstrategiasPage"));
const LotofacilPremiumPage = lazy(() => import("@/pages/LotofacilPremiumPage"));
const AIAnalystPage = lazy(() => import("@/pages/AIAnalystPage"));
const AffiliatePage = lazy(() => import("@/pages/AffiliatePage"));
const EstatisticasPage = lazy(() => import("@/pages/EstatisticasPage"));
const FarolEstatisticoPage = lazy(() => import("@/pages/FarolEstatisticoPage"));
const HistoricoApostasPage = lazy(() => import("@/pages/HistoricoApostasPage"));
const HistoricoPage = lazy(() => import("@/pages/HistoricoPage"));
const JogosSalvosPage = lazy(() => import("@/pages/JogosSalvosPage"));
const MatrizAnalisePage = lazy(() => import("@/pages/MatrizAnalisePage"));
const PlanilhasMatrizPage = lazy(() => import("@/pages/PlanilhasMatrizPage"));
const ROIDashboardPage = lazy(() => import("@/pages/ROIDashboardPage"));
const SimulacoesPage = lazy(() => import("@/pages/SimulacoesPage"));
const StrategyLabPage = lazy(() => import("@/pages/StrategyLabPage"));
const GestaoBancaPage = lazy(() => import("@/pages/GestaoBancaPage"));
const ComandoApostadorPage = lazy(() => import("@/pages/ComandoApostadorPage"));
const ClosingSharePage = lazy(() => import("@/pages/ClosingSharePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsentPage = lazy(() => import("@/pages/OAuthConsentPage"));
const CentralEstudosPage = lazy(() => import("@/pages/CentralEstudosPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45_000,
      gcTime: 15 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-xl bg-background border border-primary/20 flex items-center justify-center shadow-2xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-xs font-mono text-primary uppercase tracking-[0.3em] animate-pulse">TITAN LOTERIAS</p>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-50">Carregando motor estatístico...</p>
      </div>
    </div>
  </div>
);

const ErrorFallback = ({ error, resetError }: { error: any; resetError: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
      <AlertCircle className="w-8 h-8 text-destructive" />
    </div>
    <h1 className="text-2xl font-bold mb-2">Ops! Algo deu errado.</h1>
    <p className="text-muted-foreground mb-6 max-w-md">
      Ocorreu um erro inesperado no sistema. Nossa equipe técnica já foi notificada automaticamente.
    </p>
    <div className="flex gap-4">
      <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
      <Button variant="outline" onClick={resetError}>Tentar Novamente</Button>
    </div>
    {import.meta.env.DEV && (
      <pre className="mt-8 p-4 bg-muted rounded text-left text-xs overflow-auto max-w-full">
        {error.message}
      </pre>
    )}
  </div>
);

const AppContent = () => {
  const location = useLocation();

  // Métricas de performance por rota (route-initial / route-change).
  useRoutePerformance();

  // Pré-carrega em idle os destinos públicos mais prováveis a partir da landing.
  useIdlePrefetch([
    () => import("@/pages/LoginPage"),
    () => import("@/pages/PlanosPage"),
  ]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      ReferralSystem.trackReferral(ref);
    }
  }, [location]);

  return (
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />}>
      <Suspense fallback={<PageLoader />}>
      <AutoInstallPrompt />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/planos" element={<PlanosPage />} />
        <Route path="/suporte" element={<SuportePage />} />
        <Route path="/termos" element={<LegalPage doc="termos" />} />
        <Route path="/privacidade" element={<LegalPage doc="privacidade" />} />
        <Route path="/seguranca" element={<LegalPage doc="seguranca" />} />
        <Route path="/sobre" element={<LegalPage doc="sobre" />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/pwa-test" element={<PwaOfflineTestPage />} />
        <Route path="/f/:shareId" element={<ClosingSharePage />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
        <Route path="/estudos" element={<CentralEstudosPage />} />
        
        {/* Protected */}
        <Route element={<ProtectedRoute><LotteryProvider><AppLayout /></LotteryProvider></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/comando" element={<ComandoApostadorPage />} />
          <Route path="/gerador" element={<GeradorPage />} />
          <Route path="/fechamentos" element={<FechamentosPage />} />
          <Route path="/fechamento-universal" element={<FechamentoUniversalPage />} />
          <Route path="/analise" element={<AnaliseCentralPage />} />
          <Route path="/historico" element={<HistoricoUnificadoPage />} />
          <Route path="/ia-chat" element={<AIChatPage />} />
          <Route path="/ia-autonoma" element={<IAAutonomaPage />} />
          <Route path="/estrategias" element={<EstrategiasPage />} />
          <Route path="/lotofacil-premium" element={<LotofacilPremiumPage />} />
          <Route path="/ai-analyst" element={<AIAnalystPage />} />
          <Route path="/afiliados" element={<AffiliatePage />} />
          <Route path="/estatisticas" element={<EstatisticasPage />} />
          <Route path="/farol" element={<FarolEstatisticoPage />} />
          <Route path="/historico-apostas" element={<HistoricoApostasPage />} />
          <Route path="/historico-legacy" element={<HistoricoPage />} />
          <Route path="/jogos-salvos" element={<JogosSalvosPage />} />
          <Route path="/matriz" element={<MatrizAnalisePage />} />
          <Route path="/planilhas" element={<PlanilhasMatrizPage />} />
          <Route path="/roi" element={<ROIDashboardPage />} />
          <Route path="/banca" element={<GestaoBancaPage />} />
          <Route path="/simulacoes" element={<SimulacoesPage />} />
          <Route path="/strategy-lab" element={<StrategyLabPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </Sentry.ErrorBoundary>
  );
};

function App() {
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
}

export default App;
