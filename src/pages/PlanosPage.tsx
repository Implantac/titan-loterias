import { Crown, Zap, Sparkles, Infinity, Settings, Loader2, CheckCircle2, Star, ShieldCheck, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { createCheckoutSession } from "@/modules/subscriptions/application/subscriptionService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PlanFAQ } from "@/components/plans/PlanFAQ";
import { PlanTrustBar } from "@/components/plans/PlanTrustBar";
import { usePlanAccess } from "@/hooks/usePlanAccess";

export default function PlanosPage() {
  const { session } = useAuth();
  const { currentPlan, isAdmin, isSuperAdmin } = usePlanAccess();
  const [loadingPlan, setLoadingPlan] = useState(false);
  const navigate = useNavigate();

  const LAUNCH_PRICE = "R$ 99,90";
  const ORIGINAL_PRICE = "R$ 297";

  const handleCheckout = async () => {
    if (!session) {
      navigate("/login");
      return;
    }

    setLoadingPlan(true);
    try {
      const result = await createCheckoutSession("lifetime", session.access_token);
      if (result?.url) window.open(result.url, "_blank");
    } catch (e: any) {
      toast.error("Erro ao iniciar checkout: " + (e.message || "Tente novamente"));
    } finally {
      setLoadingPlan(false);
    }
  };

  const isLifetime = currentPlan === "lifetime" || isAdmin || isSuperAdmin;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pt-8 pb-10"
      >
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-neon-amber/10 border-2 border-neon-amber/30 text-neon-amber text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-neon-amber/5 backdrop-blur-md mb-8">
          <div className="w-2 h-2 rounded-full bg-neon-amber animate-pulse shadow-[0_0_8px_rgba(var(--neon-amber),1)]" />
          Limited Access Protocol • {LAUNCH_PRICE} Final Offer
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter uppercase italic leading-[0.9] mb-6">
          Acesso Vitalício <span className="gradient-brand-text block mt-2">Zero Mensalidade</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-medium opacity-70">
          Trave seu acesso permanente às ferramentas de análise estatística Titan hoje mesmo por um investimento único e irrepetível.
        </p>

      </motion.div>

      {/* Main Promo Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`relative rounded-[2.5rem] border-4 p-1 overflow-hidden shadow-2xl transition-all duration-700 ${
          isLifetime ? "border-primary/40 shadow-primary/20" : "border-neon-amber/40 shadow-neon-amber/20 hover:scale-[1.01]"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--neon-amber),0.15),transparent)] pointer-events-none opacity-50" />
        
        <div className="relative bg-black/60 backdrop-blur-2xl rounded-[2.2rem] p-8 md:p-14">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-neon-amber/20 flex items-center justify-center border border-neon-amber/30">
                    <Gem className="w-5 h-5 text-neon-amber" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-amber opacity-80">Titan Professional Network</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">Titan <span className="text-neon-amber">Full Node</span></h2>
                <p className="text-muted-foreground text-sm mt-3 font-medium leading-relaxed opacity-70">
                  Infraestrutura completa de processamento estatístico para quem opera com seriedade e volume de dados institucional.
                </p>
              </div>


              <ul className="space-y-3">
                {[
                  "Acesso vitalício sem renovação",
                  "Todas as 8 Loterias integradas",
                  "Inteligência Artificial e ML",
                  "Geradores e Otimizadores Pro",
                  "Backtests e Simulações massivas",
                  "Atualizações futuras inclusas",
                  "Suporte VIP prioritário",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/[0.03] border-2 border-white/10 rounded-[2rem] p-10 flex flex-col items-center text-center relative overflow-hidden group/price">
              <div className="absolute inset-0 bg-gradient-to-b from-neon-amber/5 via-transparent to-transparent opacity-0 group-hover/price:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50 mb-4 relative z-10">Unique Node Activation</p>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <span className="text-muted-foreground line-through text-xl font-mono font-bold opacity-40">{ORIGINAL_PRICE}</span>
                <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/30 shadow-lg shadow-primary/10">-70% DISCOUNT</span>
              </div>
              <div className="flex items-baseline gap-1 mb-8 relative z-10 group-hover:scale-105 transition-transform duration-500">
                <span className="text-6xl font-black font-mono tracking-tighter italic text-foreground">{LAUNCH_PRICE}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1">Paid Once</span>
              </div>


              {isLifetime ? (
                <div className="w-full space-y-4">
                  <div className="w-full py-5 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/10 italic">
                    <ShieldCheck className="w-5 h-5" />
                    Acesso ativo
                  </div>

                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Agradecemos pela confiança!
                  </p>
                </div>
              ) : (
                <Button 
                  size="lg" 
                  onClick={handleCheckout} 
                  disabled={loadingPlan}
                  className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest gradient-brand text-primary-foreground shadow-2xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all relative z-10"
                >
                  {loadingPlan ? <Loader2 className="w-6 h-6 animate-spin" /> : "Ativar Network"}
                </Button>

              )}
              
              {!isLifetime && (
                <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-widest">
                  Cartão, Pix ou Boleto • 7 Dias de Garantia
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <PlanTrustBar />
      <PlanFAQ />
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
