import { motion } from "framer-motion";
import { Database, LineChart, Cpu, ShieldCheck, Users } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      icon: Database,
      title: "Coleta de Históricos Oficiais",
      desc: "Consolidamos todos os concursos oficiais das loterias da Caixa em uma base única, pronta para consultas e modelagens temporais.",
    },
    {
      num: "02",
      icon: LineChart,
      title: "Análise Estatística Empírica",
      desc: "Cruzamento do histórico para calcular métricas de frequência ponderada, atrasos, ciclos, distribuição de paridade e somas.",
    },
    {
      num: "03",
      icon: Cpu,
      title: "Detecção de Padrões e Cobertura",
      desc: "Modelos multi-fatoriais e algoritmos combinatórios mapeiam as melhores combinações para cobrir o universo escolhido.",
    },
    {
      num: "04",
      icon: ShieldCheck,
      title: "Fechamentos com Garantia Comprovada",
      desc: "Matrizes matemáticas testadas contra 100% dos cenários possíveis de sorteio, indicando o menor acerto com rigor matemático.",
    },
    {
      num: "05",
      icon: Users,
      title: "Apostas Prontas & Gestão de Bolão",
      desc: "Gere bilhetes individuais ou monte bolões com divisão automática de cotas, recibos detalhados e compartilhamento via WhatsApp.",
    },
  ];

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(201,168,76,0.04),transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20">
                Metodologia & Processo
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                Como a <span className="gradient-brand-text">Plataforma</span> Funciona
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
                Um fluxo de 5 etapas para transformar dados brutos de loterias em decisões combinatórias inteligentes.
              </p>
            </div>

            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold font-mono text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                    {step.num}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-2xl glass-card border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-40 pointer-events-none" />
            <div className="relative border border-white/10 rounded-xl bg-black/60 backdrop-blur-md overflow-hidden flex flex-col">
              <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground ml-2">titan-engine --pipeline</span>
              </div>
              <div className="p-6 font-mono text-xs text-muted-foreground space-y-3">
                <p className="text-emerald-400">&gt; Conectando à base de resultados Caixa...</p>
                <p>&gt; Validando integridade de 100% dos concursos...</p>
                <p>&gt; Calculando matrizes de cobertura e atrasos...</p>
                <p>&gt; Testando garantia matemática exaustiva...</p>
                <p className="text-primary">&gt; Status: Combinações otimizadas com Titan Score.</p>
                
                <div className="h-px w-full bg-white/10 my-4" />
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {[
                    { label: "COBERTURA", val: "100%" },
                    { label: "MATRIZ", val: "Exaustiva" },
                    { label: "BOLÃO", val: "Ativo" },
                    { label: "INTEGRIDADE", val: "Auditada" },
                  ].map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <div className="text-[9px] text-muted-foreground font-semibold">{item.label}</div>
                      <div className="text-xs font-bold text-primary mt-0.5">{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
