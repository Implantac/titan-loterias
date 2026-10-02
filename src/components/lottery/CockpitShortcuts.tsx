import { useNavigate } from "react-router-dom";
import { Sparkles, BarChart3, Grid3x3, Bookmark, History, PieChart } from "lucide-react";

const SHORTCUTS = [
  { label: "Gerar jogos", desc: "Criar jogos pelo perfil escolhido", to: "/gerador", icon: Sparkles },
  { label: "Analisar resultados", desc: "Conferir concursos oficiais", to: "/analise", icon: BarChart3 },
  { label: "Criar fechamento", desc: "Cobertura com mais dezenas", to: "/fechamento-universal", icon: Grid3x3 },
  { label: "Jogos salvos", desc: "Seus jogos guardados", to: "/jogos-salvos", icon: Bookmark },
  { label: "Histórico", desc: "Gerações e conferências", to: "/historico", icon: History },
  { label: "Estatísticas", desc: "Frequência, atraso, soma", to: "/estatisticas", icon: PieChart },
];

export function CockpitShortcuts() {
  const navigate = useNavigate();
  return (
    <nav aria-label="Atalhos" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {SHORTCUTS.map(({ label, desc, to, icon: Icon }) => (
        <button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          className="min-h-[44px] text-left rounded-lg border border-border bg-card/60 hover:border-primary/50 hover:bg-primary/5 transition-colors p-3 flex flex-col gap-1"
        >
          <Icon className="w-4 h-4 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">{desc}</span>
        </button>
      ))}
    </nav>
  );
}
