import { Crown, CheckCircle2, Loader2, ShieldCheck, TrendingUp, Zap, Users, Sparkles, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { prefetchRoute } from "@/lib/routePrefetch";

export function PricingSection() {
  const { session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelectPlan = async (planType: "annual" | "lifetime") => {
    if (!session) {
      navigate("/login");
      return;
    }
    navigate("/planos");
  };

  const annualFeatures = [
    "Acesso por 12 meses a todas as 9 loterias oficiais",
    "Gerador com modelos estatísticos e heurísticos",
    "Módulo de Bolão com divisão de cotas e rateio",
    "Fechamentos matemáticos e conferência de jogos",
    "Exportação básica em PDF e planilhas",
    "Renovação anual recorrente",
  ];

  const lifetimeFeatures = [
    "Pagamento único definitivo — ZERO mensalidades para sempre",
    "Acesso permanente garantido a todas as 9 loterias oficiais",
    "Pronto para todas as futuras Megas da Virada e grandes acumulados",
    "Módulo de Bolão Pro (divisão automática de cotas, recibos e WhatsApp)",
    "Fechamentos matemáticos com verificação exaustiva de garantia",
    "Filtros de redução de divisão de prêmio (split-avoidance)",
    "Simulações massivas de ROI com dados históricos oficiais",
    "Todas as atualizações e novos modelos futuros liberados para sempre",
    "Suporte prioritário direto via WhatsApp",
  ];

  return (
    <section id="pricing" className="py-16 md:py-24 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.07),transparent_70%)] pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4"
        >
          <Badge variant="outline" className="px-4 py-1.5 text-xs font-semibold tracking-wide bg-primary/10 text-primary border-primary/20 rounded-full inline-flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
            Lote Promocional de Lançamento
          </Badge>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Escolha o Plano Ideal para as <span className="gradient-brand-text">Suas Apostas</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Economize com a compra definitiva ou teste pela temporada. Sem pegadinhas, sem contratos ocultos.
          </p>
        </motion.div>

        {/* Pricing Cards Grid (Anchoring: Anual vs. Vitalício) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-stretch">
          
          {/* Card 1: Plano Anual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between hover:border-white/20 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Plano Anual</h3>
                    <p className="text-xs text-muted-foreground">Temporada de 12 meses</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-muted-foreground">
                  12 Meses
                </Badge>
              </div>

              <div className="p-4 rounded-xl bg-background/40 border border-white/5 mb-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black font-mono text-foreground">R$ 69,90</span>
                  <span className="text-xs text-muted-foreground">/ ano</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Equivalente a apenas R$ 5,82 por mês.
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {annualFeatures.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Button
                variant="outline"
                onClick={() => handleSelectPlan("annual")}
                onMouseEnter={() => prefetchRoute(session ? "/planos" : "/login")}
                className="w-full h-11 rounded-xl text-sm font-semibold border-white/15 hover:bg-white/5 text-foreground"
              >
                Escolher Plano Anual
              </Button>
              <p className="text-[10px] text-center text-muted-foreground/60 mt-2">
                Renovação automática após 12 meses.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Acesso Vitalício (⭐ O MAIS POPULAR) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 rounded-2xl border-2 border-primary/50 bg-card/80 backdrop-blur-2xl p-6 sm:p-9 flex flex-col justify-between shadow-2xl shadow-primary/15 relative overflow-hidden group"
          >
            {/* Top highlight ribbon */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-primary via-primary/90 to-primary/80 text-primary-foreground font-extrabold text-[10px] tracking-wider uppercase px-4 py-1 rounded-bl-xl shadow-md">
              ⭐ ESCOLHA DE 94% DOS USUÁRIOS
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-sm">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      Acesso Vitalício Fundador
                    </h3>
                  </div>
                  <p className="text-xs text-primary font-medium">
                    Pague uma vez · Acesso permanente sem mensalidades
                  </p>
                </div>
              </div>

              {/* Price Callout with Anchoring */}
              <div className="p-4 sm:p-5 rounded-xl bg-primary/5 border border-primary/25 mb-6 relative">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-muted-foreground/60 font-semibold">R$ 397,00</span>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary font-bold bg-primary/10">
                      -75% DE DESCONTO
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Pix Imediato
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-foreground">
                    R$ 99,90
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    à vista no Pix ou até 12x de R$ 9,98
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-primary/15 text-xs text-foreground/80 font-medium">
                  💡 <span className="text-primary font-semibold">Ancoragem inteligente:</span> Por apenas <span className="font-bold text-foreground">R$ 30 a mais</span> que o plano anual, você leva o acesso vitalício permanente para sempre.
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {lifetimeFeatures.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 font-normal leading-snug">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Button
                onClick={() => handleSelectPlan("lifetime")}
                onMouseEnter={() => prefetchRoute(session ? "/planos" : "/login")}
                className="w-full h-12 sm:h-13 rounded-xl text-sm sm:text-base font-bold gradient-brand text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Garantir Acesso Vitalício (R$ 99,90)
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Liberação imediata no Pix · Sem cobranças recorrentes · Garantia incondicional de 7 dias</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Risk Reversal Guarantee Box */}
        <div className="mt-12 max-w-3xl mx-auto p-5 sm:p-6 rounded-2xl bg-card/30 border border-white/5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-foreground">Garantia Blindada de 7 Dias (Risco Zero)</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Use a plataforma, monte fechamentos e teste os bolões. Se você achar que o Titan não valeu cada centavo, basta nos enviar um e-mail ou mensagem e devolveremos 100% do seu dinheiro via Pix sem qualquer burocracia.
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground/80">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/20 border border-white/5">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Estatística Oficial</p>
              <p className="text-[11px] text-muted-foreground">Dados Caixa auditados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/20 border border-white/5">
            <Zap className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Garantia Exaustiva</p>
              <p className="text-[11px] text-muted-foreground">Menor acerto provado</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/20 border border-white/5">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Módulo de Bolão</p>
              <p className="text-[11px] text-muted-foreground">Cotas e WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/20 border border-white/5">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Pix Imediato</p>
              <p className="text-[11px] text-muted-foreground">Acesso em 30 segundos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
