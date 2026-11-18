import { AffiliateDashboard } from "@/components/AffiliateDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Users } from "lucide-react";

export default function AffiliatePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Programa de Afiliados" 
        description="Consulte indicações e valores registrados; confirme condições de comissão e pagamento com o suporte."
        icon={Users}
      />
      <AffiliateDashboard />
    </div>
  );
}
