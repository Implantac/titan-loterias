import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { syncSubscription } from "@/modules/subscriptions/application/subscriptionService";
import { motion } from "framer-motion";
import type { PlanType } from "@/features/auth/types";

const PLAN_LABELS: Record<PlanType, string> = {
  free: "Gratuito", premium: "Premium", professional: "Profissional", lifetime: "Vitalício",
};

type Verification = { status: "checking" | "verified" | "pending"; plan?: PlanType };

/** Stripe return URL is not proof of payment: only a verified server response may confirm access. */
export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const requested = params.get("plan");
  const [verification, setVerification] = useState<Verification>({ status: "checking" });
  const verify = useCallback(async () => {
    setVerification({ status: "checking" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setVerification({ status: "pending" }); return; }
      const result = await syncSubscription(session.access_token);
      // The URL is not proof; use it only to avoid confirming a different,
      // already-active plan as the newly purchased one.
      const expectedPlan = requested === "annual" || requested === "premium_annual" ? "premium" : requested;
      setVerification(result?.subscribed && result.plan !== "free" && result.plan === expectedPlan
        ? { status: "verified", plan: result.plan } : { status: "pending" });
    } catch {
      setVerification({ status: "pending" });
    }
  }, [requested]);

  useEffect(() => { void verify(); }, [verify]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Card className="max-w-md w-full glass-card border-primary/30">
          <CardContent className="flex flex-col items-center text-center py-12 gap-6" role="status" aria-live="polite">
            {verification.status === "checking" ? <>
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <h1 className="text-2xl font-bold text-foreground">Verificando seu plano...</h1>
              <p className="text-muted-foreground">O retorno do checkout não confirma pagamento. Aguarde a verificação.</p>
            </> : verification.status === "verified" ? <>
              <CheckCircle className="w-16 h-16 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Acesso verificado</h1>
              <p className="text-muted-foreground">Plano {PLAN_LABELS[verification.plan!]} informado pela verificação da conta.</p>
              <Link to="/"><Button className="gap-2 gradient-brand text-primary-foreground">Ir para o Dashboard <ArrowRight className="w-4 h-4" /></Button></Link>
            </> : <>
              <AlertCircle className="w-16 h-16 text-amber-500" />
              <h1 className="text-2xl font-bold text-foreground">Ativação ainda não confirmada</h1>
              <p className="text-muted-foreground">O pagamento pode estar pendente ou a verificação indisponível. Confira o status no provedor de pagamento; não refaça a compra sem verificar. Se já pagou, contate o suporte.</p>
              <div className="flex gap-2 flex-wrap justify-center"><Button onClick={() => void verify()}>Verificar novamente</Button>
                <Link to="/suporte"><Button variant="outline">Falar com suporte</Button></Link></div>
            </>}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
