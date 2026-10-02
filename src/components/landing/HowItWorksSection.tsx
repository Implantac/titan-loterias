import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 md:py-48 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(201,168,76,0.05),transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 text-primary border border-primary/20 italic">
                Metodologia Científica
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[0.85] drop-shadow-xl">
                COMO A <span className="gradient-brand-text">INTELIGÊNCIA</span> FUNCIONA
              </h2>
              <p className="text-muted-foreground text-lg italic opacity-70 max-w-xl">
                Um pipeline de 5 camadas projetado para extrair valor máximo de dados históricos.
              </p>
            </div>
            <div className="space-y-10">
                <div className="flex gap-8 items-start group">
                  <span className="text-6xl font-black text-primary/5 group-hover:text-primary/20 transition-colors italic leading-none select-none">01</span>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">Coleta de Históricos</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed italic opacity-80 font-medium">Consolidamos todos os concursos oficiais em uma base de dados única, pronta para análise temporal profunda.</p>
                  </div>
                </div>
                <div className="flex gap-8 items-start group">
                  <span className="text-6xl font-black text-primary/5 group-hover:text-primary/20 transition-colors italic leading-none select-none">02</span>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">Análise Estatística</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed italic opacity-80 font-medium">O Titan AI Core v7.5 cruza milhões de combinações em busca de padrões estatísticos e anomalias de frequência.</p>
                  </div>
                </div>
                <div className="flex gap-8 items-start group">
                  <span className="text-6xl font-black text-primary/5 group-hover:text-primary/20 transition-colors italic leading-none select-none">03</span>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">Detecção de Padrões</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed italic opacity-80 font-medium">Redes neurais especializadas identificam dezenas quentes, frias, ciclos de retorno e tendências emergentes.</p>
                  </div>
                </div>
                <div className="flex gap-8 items-start group">
                  <span className="text-6xl font-black text-primary/5 group-hover:text-primary/20 transition-colors italic leading-none select-none">04</span>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">Estratégia Quantitativa</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed italic opacity-80 font-medium">Aplicamos filtros de dispersão, equilíbrio estrutural e fechamentos matemáticos para maximizar sua cobertura.</p>
                  </div>
                </div>
                <div className="flex gap-8 items-start group">
                  <span className="text-6xl font-black text-primary/5 group-hover:text-primary/20 transition-colors italic leading-none select-none">05</span>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">Output Estratégico</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed italic opacity-80 font-medium">Você recebe combinações prontas com o Titan Score — decisões baseadas em evidências, não em palpite.</p>
                  </div>
                </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-square md:aspect-video glass-card rounded-[3rem] border-white/5 p-8 shadow-premium group overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="relative h-full border border-white/5 rounded-[2rem] bg-black/40 backdrop-blur-md overflow-hidden flex flex-col">
              <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-6 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                </div>
                <div className="flex-1" />
              </div>
              <div className="flex-1 p-8 font-mono text-xs text-primary/40 space-y-2 overflow-hidden">
                <p>&gt; Initializing Titan Intelligence Core...</p>
                <p>&gt; Processing official historical data...</p>
                <p>&gt; Detecting statistical frequency patterns...</p>
                <p>&gt; Applying mathematical strategies...</p>
                <p>&gt; Status: High-probability games identified.</p>
                <div className="h-px w-full bg-primary/10 my-4" />
                <div className="grid grid-cols-4 gap-2">
                  {["IA", "DATA", "MATH", "PROB"].map((n, idx) => (
                    <div key={idx} className="h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] text-primary font-bold animate-pulse px-2">
                      {n}
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
