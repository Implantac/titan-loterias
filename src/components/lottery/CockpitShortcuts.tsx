import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, BarChart3, Grid3x3, Bookmark, PieChart, Ticket, Users } from "lucide-react";
import { PhysicalTicketCheckerDialog } from "./PhysicalTicketCheckerDialog";

const SHORTCUTS = [
  { label: "Gerar jogos", desc: "Criar jogos pelo perfil escolhido", to: "/gerador", icon: Sparkles },
  { label: "Analisar resultados", desc: "Conferir concursos oficiais", to: "/analise", icon: BarChart3 },
  { label: "Criar fechamento", desc: "Cobertura com mais dezenas", to: "/fechamento-universal", icon: Grid3x3 },
  { label: "Módulo de Bolão", desc: "Cotas PIX e Contrato Blindado", to: "/bolao", icon: Users },
  { label: "Jogos salvos", desc: "Seus jogos guardados", to: "/jogos-salvos", icon: Bookmark },
  { label: "Estatísticas", desc: "Frequência, atraso, soma", to: "/estatisticas", icon: PieChart },
];

export function CockpitShortcuts() {
  const navigate = useNavigate();
  const [ticketCheckerOpen, setTicketCheckerOpen] = useState(false);

  return (
    <>
      <nav aria-label="Atalhos" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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

        {/* Conferidor Rápido de Bilhete Físico */}
        <button
          type="button"
          onClick={() => setTicketCheckerOpen(true)}
          className="min-h-[44px] text-left rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-colors p-3 flex flex-col gap-1"
        >
          <Ticket className="w-4 h-4 text-emerald-400" aria-hidden />
          <span className="text-sm font-semibold text-emerald-400">Conferir Bilhete</span>
          <span className="text-[11px] text-muted-foreground leading-tight">Auditar volante impresso</span>
        </button>
      </nav>

      <PhysicalTicketCheckerDialog
        open={ticketCheckerOpen}
        onOpenChange={setTicketCheckerOpen}
      />
    </>
  );
}
