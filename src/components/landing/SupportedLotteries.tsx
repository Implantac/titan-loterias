import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, BarChart3, Binary, Layers } from "lucide-react";

const lotteries = [
  { name: "Mega-Sena", icon: "🍀", badge: "6 de 60 números", desc: "Acúmulos expressivos e fechamentos com otimização de cobertura." },
  { name: "Lotofácil", icon: "💎", badge: "15 de 25 números", desc: "Alta probabilidade e desdobramentos inteligentes de 16 a 20 dezenas." },
  { name: "Quina", icon: "⭐", badge: "5 de 80 números", desc: "Sorteios diários com análise de ciclos e atrasos históricos." },
  { name: "Lotomania", icon: "🎱", badge: "50 de 100 números", desc: "Apostas espelho e matrizes de cobertura combinatória ampla." },
  { name: "Dupla Sena", icon: "👯", badge: "2 sorteios por concurso", desc: "Dupla chance por bilhete com score integrado para ambos os sorteios." },
  { name: "Timemania", icon: "⚽", badge: "10 de 80 + Time", desc: "Mapeamento estatístico de dezenas e frequências do time do coração." },
  { name: "Dia de Sorte", icon: "📅", badge: "7 de 31 + Mês", desc: "Estatísticas temporais por dias do calendário e mês da sorte." },
  { name: "Super Sete", icon: "7️⃣", badge: "7 colunas (0 a 9)", desc: "Distribuição probabilística independente analisada coluna a coluna." },
  { name: "+Milionária", icon: "💰", badge: "6 números + 2 trevos", desc: "Matrizes com cálculo isolado para números principais e trevos." },
];

export function SupportedLotteries() {
  return (
    <section className="py-16 md:py-24 bg-card/20 border-y border-border/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(201,168,76,0.04),transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1.5 text-xs font-semibold tracking-wide border-primary/20 text-primary bg-primary/10 rounded-full inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Modalidades Oficiais
          </Badge>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Loterias <span className="gradient-brand-text">Suportadas</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Cada modalidade opera em um ambiente isolado com regras, matrizes e análises próprias para sua mecânica específica.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {lotteries.map((lottery, i) => (
            <motion.div
              key={lottery.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              viewport={{ once: true }}
              className="h-full"
            >
              <Card className="p-6 h-full glass-card border border-white/5 hover:border-primary/40 transition-all duration-300 group relative overflow-hidden rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0">
                        {lottery.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                          {lottery.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">{lottery.badge}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary bg-primary/5 shrink-0">
                      Oficial
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {lottery.desc}
                  </p>
                </div>
                
                <div className="space-y-2 pt-3 border-t border-white/5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Sincronização</span>
                    <span className="font-mono text-[11px] text-foreground/80">API Caixa Oficial</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Fechamentos</span>
                    <span className="font-mono text-[11px] text-foreground/80">Matrizes Exaustivas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Binary className="w-3.5 h-3.5 text-primary" /> Análise</span>
                    <span className="font-mono text-[11px] text-primary font-medium">Titan Score v4</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
