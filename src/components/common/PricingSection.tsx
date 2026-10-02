import { Crown, CheckCircle2, Loader2, ShieldCheck, Gem, TrendingUp, Zap, Users, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { prefetchRoute } from "@/lib/routePrefetch";

export function PricingSection() {
  const { session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const LAUNCH_PRICE = "R$ 99,90";
  const ORIGINAL_PRICE = "R$ 397";

  const handleCheckout = async () => {
    if (!session) {
      navigate("/login");
      return;
    }

    setLoadingPlan(true);
    try {
      toast.info("Processando seu acesso ELITE...");
      setTimeout(() => {
        toast.success("Redirecionando para checkout seguro...");
      }, 1500);
    } catch (e: any) {
      toast.error("Erro ao iniciar checkout: " + (e.message || "Tente novamente"));
    } finally {
      setLoadingPlan(false);
    }
  };

  const plans = [
    {
      name: "Acesso Vitalício",
      price: LAUNCH_PRICE,
      description: "O ecossistema Titan completo — pagamento único.",
      features: [
        "Pagamento único · sem mensalidade · sem renovação",
        "Jogos e simulações ilimitadas em todas as loterias",
        "Assistente de IA e Motor Adaptativo",
        "Fechamentos matemáticos, matrizes e cobertura extrema",
        "Backtests massivos, ROI real e comparador de estratégias",
        "Exportações profissionais (PDF, Excel e planilhas)",
        "Suporte prioritário via chat e e-mail",
        "Todas as atualizações futuras incluídas para sempre",
      ],
      cta: "Garantir Acesso Vitalício",
      popular: true,
      color: "bg-primary/5 border-primary/20",
      icon: Crown
    }
  ];

  return (
    <section id="pricing" className="py-24 md:py-40 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(160,84,45,0.05),transparent)] pointer-events-none" />
      
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-32 space-y-8"
        >
          <Badge variant="outline" className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 text-primary border-primary/20 italic drop-shadow-md">
            Escolha seu Nível de Operação
          </Badge>
          <h2 className="text-3xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase italic leading-[1] drop-shadow-2xl">
            PLANOS <span className="gradient-brand-text drop-shadow-[0_0_20px_rgba(201,168,76,0.3)]">TITAN</span>
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto font-medium text-xl italic opacity-70 leading-relaxed px-4">
            Um pagamento único, acesso vitalício de elite. Sem mensalidades, sem renovações, sem plano gratuito.
          </p>
        </motion.div>

        <div className="grid gap-8 max-w-2xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-[3rem] border p-1 overflow-hidden transition-all duration-500 hover:translate-y-[-12px] ${plan.popular ? 'border-primary/40 shadow-2xl shadow-primary/20 scale-105 z-10' : 'border-white/5 hover:border-primary/20 shadow-xl'}`}
            >
              <div className={`relative ${plan.color} backdrop-blur-2xl rounded-[2.3rem] p-10 h-full flex flex-col`}>
                {plan.popular && (
                  <div className="absolute top-6 right-8">
                    <Badge className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[8px] px-3">Mais Popular</Badge>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${plan.popular ? 'bg-primary/20 border-primary/30' : 'bg-muted/50 border-white/10'}`}>
                    <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{plan.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{plan.description}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-8">
                  {plan.popular && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs line-through text-muted-foreground/60 font-bold">{ORIGINAL_PRICE}</span>
                      <Badge variant="outline" className="text-[9px] border-primary/30 text-primary uppercase font-black tracking-widest bg-primary/5">-70% OFF</Badge>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black font-mono tracking-tighter italic">{plan.price}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1">
                      {"/ pagamento único"}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={plan.popular ? 'text-foreground' : 'text-muted-foreground'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={handleCheckout}
                  onMouseEnter={() => prefetchRoute(session ? "/planos" : "/login")}
                  onFocus={() => prefetchRoute(session ? "/planos" : "/login")}
                  onTouchStart={() => prefetchRoute(session ? "/planos" : "/login")}
                  disabled={loadingPlan}
                  className={`w-full h-16 rounded-2xl text-base font-black uppercase tracking-widest transition-all ${plan.popular ? 'gradient-brand text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02]' : 'bg-background hover:bg-muted border-2 border-white/10'}`}
                >
                  {loadingPlan && plan.popular ? <Loader2 className="w-5 h-5 animate-spin" /> : plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
           <div className="flex flex-col items-center gap-2">
             <TrendingUp className="w-8 h-8" />
             <p className="text-[10px] font-black uppercase tracking-widest text-center">Estatística Avançada</p>
           </div>
           <div className="flex flex-col items-center gap-2">
             <Zap className="w-8 h-8" />
             <p className="text-[10px] font-black uppercase tracking-widest text-center">Titan IA Nativa</p>
           </div>
           <div className="flex flex-col items-center gap-2">
             <Users className="w-8 h-8" />
             <p className="text-[10px] font-black uppercase tracking-widest text-center">Matrizes Matemáticas</p>
           </div>
           <div className="flex flex-col items-center gap-2">
             <Brain className="w-8 h-8" />
             <p className="text-[10px] font-black uppercase tracking-widest text-center">Acesso completo</p>
           </div>
        </div>
      </div>
    </section>
  );
}
