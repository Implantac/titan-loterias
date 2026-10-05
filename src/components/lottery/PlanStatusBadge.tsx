import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { usePlanAccess } from "@/hooks/usePlanAccess";

const LABELS: Record<string, string> = { free: "Sem plano ativo", premium: "Premium", professional: "Profissional", lifetime: "Vitalício" };

/** Mostra o plano atual (lido do perfil no servidor). Apenas exibição — o acesso é validado no backend. */
export function PlanStatusBadge() {
  const { currentPlan, isAdmin, isSuperAdmin } = usePlanAccess();
  const label = isAdmin || isSuperAdmin ? "Administrador" : LABELS[currentPlan] ?? currentPlan;
  return (
    <Link to="/planos" className="inline-flex" aria-label={`Plano atual: ${label}`}>
      <Badge variant={currentPlan === "free" && !isAdmin && !isSuperAdmin ? "destructive" : "secondary"} className="text-[10px]">
        Plano: {label}
      </Badge>
    </Link>
  );
}
