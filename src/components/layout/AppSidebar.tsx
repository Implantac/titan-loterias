import {
  BarChart3, Sparkles, History, Zap, Grid3X3,
  Brain, ShieldCheck, Crown, PieChart, Lock,
  MessageCircle, User, Wallet, Command, FileCode,
  BookOpen, FlaskConical
} from "lucide-react";

import { NavLink } from "@/components/layout/NavLink";
import { prefetchRoute } from "@/lib/routePrefetch";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { Feature } from "@/features/auth/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


const workflowGroups: { label: string; items: { title: string; url: string; icon: any; requiredFeature?: Feature; tooltip: string; badge?: string }[] }[] = [
  {
    label: "Operacional",
    items: [
      { title: "Central de Inteligência", url: "/dashboard", icon: BarChart3, tooltip: "Terminal central de inteligência e resumo de fluxos." },
      { title: "Painel de Comando", url: "/comando", icon: Command, tooltip: "Todos os sinais críticos consolidados para decisão rápida.", badge: "PRO" },
      { title: "Titan AI Center", url: "/ia-chat", icon: MessageCircle, tooltip: "O motor de inteligência central do seu ecossistema.", badge: "NEW" },
      { title: "Gerador Estratégico", url: "/gerador", icon: Sparkles, tooltip: "Geração assistida de coleções inteligentes (Loto Data)." },
      { title: "Análise VIP", url: "/lotofacil-premium", icon: Crown, tooltip: "Ambiente profissional exclusivo.", badge: "PREMIUM" },
      { title: "Central de Estudos", url: "/estudos", icon: BookOpen, tooltip: "Tutoriais, glossário e guias matemáticos do Titan.", badge: "NEW" },
    ],
  },
  {
    label: "Inteligência",
    items: [
        { title: "Estratégias ML", url: "/estrategias", icon: Brain, tooltip: "Painel de modelos e simulações clássicas." },
        { title: "Strategy Lab", url: "/strategy-lab", icon: FlaskConical, tooltip: "Laboratório evolutivo com teste de integridade temporal (Shuffled).", badge: "NEW" },
        { title: "IA Autônoma", url: "/ia-autonoma", icon: Zap, tooltip: "Predição preditiva baseada em redes neurais." },
        { title: "Central Analítica", url: "/analise", icon: PieChart, tooltip: "Estatísticas avançadas, tendências e indicadores." },
        { title: "Fechamentos", url: "/fechamentos", icon: Grid3X3, requiredFeature: "fechamentos", tooltip: "Fechamentos matemáticos de alta performance." },
        { title: "Gestão de Banca", url: "/banca", icon: Wallet, tooltip: "Kelly defensivo, alocação por ROI e stops operacionais.", badge: "PRO" },
        { title: "Histórico Unificado", url: "/historico", icon: History, tooltip: "Seus jogos, resultados e auditoria de apostas." },
    ]
  }
];

const accountItems = [
  { title: "Meu Perfil", url: "/perfil", icon: User },
  { title: "Upgrade Vitalício", url: "/planos", icon: Crown },
];

const adminItems: { title: string; url: string; icon: any }[] = [
  { title: "Painel Admin", url: "/admin", icon: ShieldCheck },
];


const PLAN_LABELS: Record<string, string> = {
  free: "Sem acesso",
  premium: "Premium",
  professional: "Profissional",
  lifetime: "Vitalício",
};


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, isSuperAdmin, trialDaysLeft } = useAuth();
  const { currentPlan, hasAccess, getMinPlan } = usePlanAccess();
  const { config } = useLotteryContext();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-4 border-b border-border/10 bg-sidebar/50 backdrop-blur-sm">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xl shadow-primary/20 group-hover:shadow-primary/20 group-hover:scale-105 transition-all duration-700 overflow-hidden border border-white/10 bg-black">
            <span className="text-sm font-black text-white italic tracking-tighter">TL</span>
          </div>
          {!collapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-500">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tighter text-sidebar-foreground uppercase italic leading-none">
                  TITAN<span className="gradient-brand-text ml-0.5">LOTERIAS</span>
                </h1>
                {isAdmin && (
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border animate-pulse ${
                    isSuperAdmin 
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>
                    {isSuperAdmin ? "GOD" : "ADMIN"}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground font-black tracking-[0.3em] uppercase opacity-40 mt-0.5">
                Motor Estatístico • v7.5
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-6 scrollbar-hide space-y-2">

        {/* Active lottery indicator — refined */}
        <div className={`mx-2 mb-6 rounded-xl bg-gradient-to-br from-primary/12 via-primary/5 to-transparent border border-primary/20 transition-all duration-300 hover:border-primary/40 ${collapsed ? "p-2.5 flex justify-center" : "p-3.5"}`}>
          {collapsed ? (
            <span className="text-xl" title={config?.name || "Loto"}>{config?.icon || "🍀"}</span>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-background/60 border border-primary/15 flex items-center justify-center shrink-0">
                <span className="text-2xl">{config?.icon || "🍀"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary truncate leading-tight">{config?.name || "Loteria"}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[10px] text-muted-foreground font-medium">Ativa</p>
                </div>
              </div>
            </div>
          )}
        </div>


        {workflowGroups.map((group) => (
          <SidebarGroup key={group.label} className="px-2">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/50 mb-3 px-4">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const locked = item.requiredFeature ? !hasAccess(item.requiredFeature) : false;
                  const minPlan = item.requiredFeature ? getMinPlan(item.requiredFeature) : null;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild className="h-auto p-0">
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              onMouseEnter={() => prefetchRoute(item.url)}
                              onFocus={() => prefetchRoute(item.url)}
                              onTouchStart={() => prefetchRoute(item.url)}
                              className={`flex items-center w-full rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:bg-primary/8 relative ${locked ? "text-muted-foreground/40" : "text-sidebar-foreground font-medium"}`}
                              activeClassName="bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                            >
                              <item.icon className="mr-3 h-4 w-4 shrink-0" />
                              {!collapsed && (
                                <>
                                  <span className="flex-1 truncate">{item.title}</span>
                                  {item.badge && (
                                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-primary/15 text-primary border border-primary/25 rounded-md">
                                      {item.badge}
                                    </span>
                                  )}
                                  {locked && <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0 ml-1" />}
                                </>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[260px] text-xs rounded-xl border-border/40 backdrop-blur-md">
                          <p className="font-semibold mb-0.5">{item.title}</p>
                          <p className="text-muted-foreground">{item.tooltip}</p>
                          {locked && (
                            <p className="text-amber-400 mt-1 text-[10px] font-bold">
                              REQUER PLANO {PLAN_LABELS[minPlan!]?.toUpperCase() || "PREMIUM"}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/50 mb-3 px-4">
            Sistema & Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto p-0">
                    <NavLink
                      to={item.url}
                      onMouseEnter={() => prefetchRoute(item.url)}
                      onFocus={() => prefetchRoute(item.url)}
                      onTouchStart={() => prefetchRoute(item.url)}
                      className="flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-primary/8 text-sidebar-foreground"
                      activeClassName="bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                    >
                      <item.icon className="mr-3 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isSuperAdmin) && adminItems.length > 0 && (
          <SidebarGroup className="px-2">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/50 mb-3 px-4">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink
                        to={item.url}
                        onMouseEnter={() => prefetchRoute(item.url)}
                        onFocus={() => prefetchRoute(item.url)}
                        onTouchStart={() => prefetchRoute(item.url)}
                        className="flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-primary/8 text-sidebar-foreground"
                        activeClassName="bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                      >
                        <item.icon className="mr-3 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>


      {!collapsed && (
        <SidebarFooter className="p-4 border-t border-border/10 bg-secondary/10 space-y-4">
            {currentPlan === "free" && trialDaysLeft > 0 && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-500">
                    ⏱ {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} restantes
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold">Período de teste</p>
                </div>
            )}
            
            <Link
                to="/planos"
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-4 hover:border-primary/40 transition-all group shadow-xl shadow-primary/5"
            >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 group-hover:rotate-12 transition-transform">
                    <Crown className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground uppercase tracking-tighter">
                    {currentPlan === "free" ? "Upgrade VIP" : "Membro Elite"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tight">
                    {currentPlan === "free" ? "Acesso Vitalício" : "Acesso Permanente"}
                    </p>
                </div>
            </Link>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
