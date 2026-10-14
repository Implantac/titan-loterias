import { motion, MotionValue } from "framer-motion";
import { Layers, Sparkles, BarChart3, Box, Users, ShieldCheck } from "lucide-react";

interface FeaturesSectionProps {
  featuresRef: React.RefObject<HTMLDivElement>;
  featuresRotateX: MotionValue<number>;
  fadeUp: any;
}

export function FeaturesSection({ featuresRef, fadeUp }: FeaturesSectionProps) {
  const features = [
    {
      icon: Layers,
      title: "Análise Histórica Avançada",
      description: "Processamento do histórico oficial completo para mapear frequência, atraso, ciclos e distribuição de cada dezena em múltiplas dimensões.",
      tag: "Estatística Histórica",
    },
    {
      icon: Sparkles,
      title: "Motor Heurístico & Estatístico",
      description: "Modelos multi-fatoriais, análise de tendências e ciclos empíricos para fundamentar decisões com dados reais, sem promessas místicas.",
      tag: "Modelos Preditivos",
    },
    {
      icon: Users,
      title: "Módulo de Bolão Colaborativo",
      description: "Divisão automática em cotas, cálculo de rateio justo por participante, relatórios individuais e envio direto e formatado via WhatsApp.",
      tag: "Gestão & Rateio",
    },
    {
      icon: Box,
      title: "Fechamentos & Cobertura",
      description: "Matrizes combinatórias com verificação matemática exaustiva da garantia — saiba exatamente o menor acerto entregue em qualquer cenário sorteado.",
      tag: "Garantia Comprovada",
    },
    {
      icon: BarChart3,
      title: "Simulador de Performance & ROI",
      description: "Teste suas estratégias contra centenas de concursos passados e descubra a distribuição de prêmios e o retorno teórico antes de apostar.",
      tag: "Backtest Realista",
    },
    {
      icon: ShieldCheck,
      title: "Sincronização & Integridade",
      description: "Resultados oficiais atualizados em tempo real direto da Caixa, com verificação contínua de lacunas, duplicados e integridade na base.",
      tag: "Dados Oficiais Caixa",
    },
  ];

  return (
    <section ref={featuresRef} className="py-16 md:py-24 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.06),transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20">
            Recursos da Plataforma
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Centro de <span className="gradient-brand-text">Inteligência</span> Titan
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Muito além de um gerador de números: uma plataforma completa de inteligência estatística e combinatória aplicada às loterias brasileiras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <motion.div 
              key={f.title} 
              custom={i} 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }} 
              className="relative rounded-2xl glass-card border border-white/5 hover:border-primary/40 p-6 sm:p-7 transition-all duration-300 group overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-primary/20 transition-all text-primary">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2.5 leading-snug group-hover:text-primary transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                  {f.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{f.tag}</span>
                <span className="font-mono text-primary text-[11px] font-semibold">Titan Core</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
