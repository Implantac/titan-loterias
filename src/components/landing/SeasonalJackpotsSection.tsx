import { motion } from "framer-motion";
import { Sparkles, Calendar, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const seasonalLotteries = [
  {
    name: "Mega da Virada",
    prize: "R$ 500+ Milhões",
    timing: "Dezembro (Fim de Ano)",
    icon: "🎆",
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/30",
    desc: "O maior concurso do ano. Fechamentos em grupo e divisão automática de cotas para bolões familiares e corporativos sem risco de erro no rateio.",
  },
  {
    name: "Lotofácil da Independência",
    prize: "R$ 200+ Milhões",
    timing: "Setembro",
    icon: "💎",
    color: "from-fuchsia-500/20 to-fuchsia-500/5",
    border: "border-fuchsia-500/30",
    desc: "A modalidade favorita dos estrategistas. Matrizes combinatórias de 16 a 20 dezenas com verificação exaustiva de acerto garantido.",
  },
  {
    name: "Quina de São João",
    prize: "R$ 200+ Milhões",
    timing: "Junho",
    icon: "⭐",
    color: "from-blue-500/20 to-blue-500/5",
    border: "border-blue-500/30",
    desc: "O grande prêmio do meio de ano. Desdobramentos que cobrem grupos amplos de números sem estourar o orçamento do grupo.",
  },
  {
    name: "Dupla de Páscoa",
    prize: "R$ 35+ Milhões",
    timing: "Abril",
    icon: "👯",
    color: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/30",
    desc: "Dupla chance no mesmo bilhete. Análise combinada dos dois sorteios para otimização simultânea da cobertura estatística.",
  },
];

interface Props {
  onCtaClick: (e: React.MouseEvent, to: string) => void;
}

export function SeasonalJackpotsSection({ onCtaClick }: Props) {
  return (
    <section className="py-16 md:py-24 bg-card/25 border-y border-border/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(201,168,76,0.06),transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1.5 text-xs font-semibold tracking-wide border-primary/20 text-primary bg-primary/10 rounded-full inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Grandes Concursos Especiais
          </Badge>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Pronto para os Maiores <span className="gradient-brand-text">Acumulados do Brasil</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Com o Acesso Vitalício, você nunca precisará reativar assinaturas mensais na véspera dos grandes concursos: sua ferramenta já está pronta e paga para sempre.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
          {seasonalLotteries.map((lottery, i) => (
            <motion.div
              key={lottery.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className="h-full"
            >
              <div className={`p-5 sm:p-6 rounded-2xl glass-card border ${lottery.border} h-full flex flex-col justify-between hover:border-primary/50 transition-all duration-300 relative group overflow-hidden`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{lottery.icon}</span>
                    <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-muted-foreground bg-white/5">
                      {lottery.timing}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                      {lottery.name}
                    </h3>
                    <p className="text-xs font-mono font-semibold text-primary mt-0.5">
                      Prêmio estimado: {lottery.prize}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {lottery.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-primary" /> Bolão Integrado
                  </span>
                  <span className="text-emerald-400 font-mono">Incluso</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" /> Pague uma vez: R$ 99,90
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-primary" /> Sem mensalidades em dezembro
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="w-4 h-4 text-primary" /> Recibos e Cotas WhatsApp
            </span>
          </div>
          <Button
            size="lg"
            onClick={(e) => onCtaClick(e, "/planos")}
            className="gradient-brand text-primary-foreground font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-sm sm:text-base"
          >
            Garantir Acesso Vitalício aos Grandes Concursos
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
