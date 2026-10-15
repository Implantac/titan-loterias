/**
 * routePrefetch — mapa de rotas para import() dinâmico dos chunks das páginas.
 * Usado por hover/focus nos itens da sidebar para pré-carregar o chunk antes do clique,
 * tornando a navegação praticamente instantânea sem custo no TTI inicial.
 */

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/DashboardPage"),
  "/gerador": () => import("@/pages/GeradorPage"),
  "/fechamentos": () => import("@/pages/FechamentosPage"),
  "/fechamento-universal": () => import("@/pages/FechamentoUniversalPage"),
  "/analise": () => import("@/pages/AnaliseCentralPage"),
  "/historico": () => import("@/pages/HistoricoUnificadoPage"),
  "/ia-chat": () => import("@/pages/AIChatPage"),
  "/ia-autonoma": () => import("@/pages/IAAutonomaPage"),
  "/estrategias": () => import("@/pages/EstrategiasPage"),
  "/lotofacil-premium": () => import("@/pages/LotofacilPremiumPage"),
  "/ai-analyst": () => import("@/pages/AIAnalystPage"),
  "/afiliados": () => import("@/pages/AffiliatePage"),
  "/estatisticas": () => import("@/pages/EstatisticasPage"),
  "/farol": () => import("@/pages/FarolEstatisticoPage"),
  "/historico-apostas": () => import("@/pages/HistoricoApostasPage"),
  "/historico-legacy": () => import("@/pages/HistoricoPage"),
  "/jogos-salvos": () => import("@/pages/JogosSalvosPage"),
  "/matriz": () => import("@/pages/MatrizAnalisePage"),
  "/matrizes": () => import("@/pages/PlanilhasMatrizPage"),
  "/planilhas": () => import("@/pages/PlanilhasMatrizPage"),
  "/roi": () => import("@/pages/ROIDashboardPage"),
  "/simulacoes": () => import("@/pages/SimulacoesPage"),
  "/strategy-lab": () => import("@/pages/StrategyLabPage"),
  "/perfil": () => import("@/pages/PerfilPage"),
  "/planos": () => import("@/pages/PlanosPage"),
  "/suporte": () => import("@/pages/SuportePage"),
  "/admin": () => import("@/pages/AdminPage"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const loader = loaders[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire and forget; ignore errors (offline, chunk gone after deploy, etc.)
  loader().catch(() => prefetched.delete(path));
}

export function prefetchRouteOnIdle(path: string): void {
  const run = () => prefetchRoute(path);
  const w = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run);
  else setTimeout(run, 200);
}
