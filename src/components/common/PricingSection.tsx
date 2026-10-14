import { Crown, CheckCircle2, Loader2, ShieldCheck, TrendingUp, Zap, Users, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";
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
    navigate("/planos");
  };

  const planFeatures = [
    "Pagamento único · sem mensalidades ou renovações futuras",
    "Jogos e simulações ilimitadas em todas as 9 loterias oficiais",
    "Módulo de Bolão Colaborativo (divisão de cotas, rateio e envio WhatsApp)",
    "Fechamentos matemáticos com verificação exaustiva de garantia",
    "Filtros de redução de divisão de prêmio (split-avoidance)",
    "Simulações massivas de ROI com dados históricos oficiais",
    "Exportações completas em PDF, Excel, CSV e recibos de cotas",
    "Atualizações contínuas de novos modelos incluídas para sempre",
  ];

  return (
    <section id="pricing" className="py-16 md:py-24 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.06),transparent_70%)] pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4"
        >
          <Badge variant="outline" className="px-4 py-1.5 text-xs font-semibold tracking-wide bg-primary/10 text-primary border-primary/20 rounded-full inline-flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
            Condição Especial de Lançamento
          </Badge>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Acesso <span className="gradient-brand-text">Vitalício</span> Titan
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Um pagamento único para ter acesso completo a todo o ecossistema. Sem mensalidades, sem assinaturas recorrentes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <div className="relative rounded-2xl border border-primary/40 bg-card/60 backdrop-blur-xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-primary/10 flex flex-col">
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Plano Titan Vitalício
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ecossistema completo com todas as ferramentas liberadas
                  </p>
                </div>
              </div>
              <Badge className="bg-primary/20 border border-primary/40 text-primary text-xs font-semibold px-3 py-1 rounded-full shrink-0">
                Acesso Vitalício
              </Badge>
            </div>

            {/* Price block */}
            <div className="p-4 sm:p-5 rounded-xl bg-background/50 border border-white/5 mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm line-through text-muted-foreground/60 font-semibold">{ORIGINAL_PRICE}</span>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-bold bg-primary/10">
                  -75% DE DESCONTO
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-foreground">
                  {LAUNCH_PRICE}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  / pagamento único
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Sem renovações, sem pegadinhas e sem mensalidades futuras.
              </p>
            </div>

            {/* Features list */}
            <ul className="space-y-3 mb-8">
              {planFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-normal text-foreground/90 leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Button 
              onClick={handleCheckout}
              onMouseEnter={() => prefetchRoute(session ? "/planos" : "/login")}
              onFocus={() => prefetchRoute(session ? "/planos" : "/login")}
              onTouchStart={() => prefetchRoute(session ? "/planos" : "/login")}
              disabled={loadingPlan}
              className="w-full h-12 sm:h-13 rounded-xl text-sm sm:text-base font-bold gradient-brand text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {loadingPlan ? <Loader2 className="w-5 h-5 animate-spin" /> : "Garantir Acesso Vitalício"}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Garantia incondicional de 7 dias · Acesso liberado imediatamente</span>
            </div>
          </div>
        </motion.div>
        
        {/* Trust Badges */}
        <div className="mt-12 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground/80">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-white/5">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Estatística Real</p>
              <p className="text-[11px] text-muted-foreground">Modelos empíricos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-white/5">
            <Zap className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Garantia Comprovada</p>
              <p className="text-[11px] text-muted-foreground">Verificação exaustiva</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-white/5">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Gestão de Bolão</p>
              <p className="text-[11px] text-muted-foreground">Cotas & WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-white/5">
            <Brain className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Acesso Completo</p>
              <p className="text-[11px] text-muted-foreground">Sem mensalidades</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
