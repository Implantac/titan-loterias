import { motion } from "framer-motion";
import { Users, TrendingUp, ShieldCheck, Zap } from "lucide-react";

export function SocialProofBar() {
  const socialItems = [
    { icon: TrendingUp, label: "Resultados Oficiais", detail: "Sincronização direta Caixa" },
    { icon: ShieldCheck, label: "Garantia Comprovada", detail: "Matrizes com cálculo exaustivo" },
    { icon: Users, label: "Módulo de Bolão", detail: "Rateio e exportação WhatsApp" },
    { icon: Zap, label: "Acesso Vitalício", detail: "Pagamento único sem mensalidade" },
  ];

  return (
    <div className="py-6 sm:py-8 border-b border-border/40 bg-card/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {socialItems.map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:scale-105 transition-all shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                  {item.label}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
