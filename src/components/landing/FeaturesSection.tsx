import { motion, MotionValue } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layers, Sparkles, Clipboard, BarChart3, Box, MessageSquare } from "lucide-react";

interface FeaturesSectionProps {
  featuresRef: React.RefObject<HTMLDivElement>;
  featuresRotateX: MotionValue<number>;
  fadeUp: any;
}

const colorMap = {
  green: "hover:border-primary/50 group-hover:shadow-primary/10",
  blue: "hover:border-neon-blue/50 group-hover:shadow-neon-blue/10",
  amber: "hover:border-accent/50 group-hover:shadow-accent/10",
  red: "hover:border-neon-red/50 group-hover:shadow-neon-red/10",
  purple: "hover:border-neon-purple/50 group-hover:shadow-neon-purple/10",
  cyan: "hover:border-neon-cyan/50 group-hover:shadow-neon-cyan/10",
};

export function FeaturesSection({ featuresRef, featuresRotateX, fadeUp }: FeaturesSectionProps) {
  const { t } = useTranslation();

  const features = [
    {
      icon: Layers,
      title: "Análise Histórica Avançada",
      description: "Processamos o histórico oficial completo para revelar frequência, atraso, ciclos e distribuição de cada dezena em múltiplas dimensões.",
      color: "green" as const,
    },
    {
      icon: Sparkles,
      title: "Titan AI Core",
      description: "Redes neurais avançadas e modelos preditivos aplicados aos sorteios brasileiros para identificar padrões que escapam da análise humana.",
      color: "blue" as const,
    },
    {
      icon: Clipboard,
      title: "Motor de Probabilidade",
      description: "Apostas geradas com Monte Carlo, Cadeias de Markov e distribuições balanceadas — foco em consistência estatística, não em sorte.",
      color: "amber" as const,
    },
    {
      icon: BarChart3,
      title: "Simulador de Performance",
      description: "Coloque sua estratégia contra centenas de concursos passados e descubra o ROI teórico antes de gastar um real com apostas.",
      color: "red" as const,
    },
    {
      icon: Box,
      title: "Laboratório de Estratégias",
      description: "Fechamentos matemáticos, matrizes de cobertura, filtros avançados e estratégias proprietárias com pontuação Titan Score.",
      color: "purple" as const,
    },
    {
      icon: MessageSquare,
      title: "Sincronização Oficial",
      description: "Resultados oficiais atualizados em tempo real direto da fonte, com verificação de integridade (concursos ausentes, duplicados e inconsistências) visível em cada análise.",
      color: "cyan" as const,
    },
  ];

  return (
    <section ref={featuresRef} className="py-24 md:py-48 relative overflow-hidden bg-background" style={{ perspective: "1500px" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.12),transparent_70%)] pointer-events-none" />
      <motion.div style={{ rotateX: featuresRotateX }} className="container mx-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-32 space-y-8">
          <div className="inline-flex items-center px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 text-primary border border-primary/20 italic">
            Tecnologia de Elite
          </div>
          <h2 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase italic leading-[1] drop-shadow-2xl text-white">
            CENTRO DE <span className="gradient-brand-text drop-shadow-[0_0_20px_rgba(201,168,76,0.3)]">INTELIGÊNCIA</span> TITAN
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto font-medium text-xl opacity-70 italic leading-relaxed px-4">
            Muito além de um gerador de números: uma plataforma completa de inteligência estatística aplicada às loterias brasileiras.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} whileHover={{ y: -16, scale: 1.02 }} className={`relative rounded-[2.5rem] glass-card border-white/5 p-12 transition-all duration-700 hover:shadow-premium-hover ${colorMap[f.color]} group overflow-hidden shadow-premium`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-gold-glow transition-all duration-500 relative z-10 shadow-inner">
                <f.icon className="w-10 h-10 text-primary group-hover:rotate-6 transition-transform duration-500" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight italic mb-6 leading-none">{f.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium opacity-80 italic">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
