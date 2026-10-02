import { motion } from "framer-motion";
import { Users, TrendingUp, ShieldCheck, Zap } from "lucide-react";

export function SocialProofBar() {
  const socialItems = [
    { icon: Users, label: "4.8K+ Usuários Ativos", detail: "Comunidade Profissional" },
    { icon: TrendingUp, label: "24.5K+ Concursos", detail: "Big Data Oficial" },
    { icon: ShieldCheck, label: "Rigor Estatístico", detail: "Matemática Aplicada" },
    { icon: Zap, label: "Análise Estatística", detail: "Dados oficiais" },
  ];

  return (
    <div className="py-12 border-b border-white/5 bg-black/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {socialItems.map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500 shadow-inner">
                <item.icon className="w-5 h-5 text-primary/70 group-hover:text-primary group-hover:scale-110 transition-all" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-foreground italic leading-none mb-1.5">{item.label}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-50 italic">{item.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
