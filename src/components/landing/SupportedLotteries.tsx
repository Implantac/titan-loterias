import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, BarChart3, Binary } from "lucide-react";

const lotteries = [
  { name: "Mega-Sena", icon: "🍀", color: "bg-emerald-500" },
  { name: "Lotofácil", icon: "💎", color: "bg-fuchsia-500" },
  { name: "Quina", icon: "⭐", color: "bg-blue-600" },
  { name: "Lotomania", icon: "🎱", color: "bg-orange-500" },
  { name: "Dupla Sena", icon: "👯", color: "bg-red-600" },
  { name: "Timemania", icon: "⚽", color: "bg-yellow-500" },
  { name: "Dia de Sorte", icon: "📅", color: "bg-amber-600" },
  { name: "Super Sete", icon: "7️⃣", color: "bg-cyan-500" },
  { name: "+Milionária", icon: "💰", color: "bg-indigo-600" },
];

export function SupportedLotteries() {
  return (
    <section className="py-24 md:py-48 bg-black/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(201,168,76,0.05),transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-32 space-y-8">
          <Badge variant="outline" className="px-5 py-2 text-[10px] font-black tracking-[0.4em] uppercase border-primary/20 text-primary bg-primary/5 italic">
            Loterias suportadas
          </Badge>
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.85] drop-shadow-2xl">
            LOTERIAS <span className="gradient-brand-text drop-shadow-[0_0_20px_rgba(201,168,76,0.3)]">SUPORTADAS</span>
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto font-medium text-lg italic opacity-70 px-4">
            Cada modalidade opera em um ambiente isolado com regras e análises próprias para sua mecânica específica.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {lotteries.map((lottery, i) => (
            <motion.div
              key={lottery.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
            >
              <Card className="p-10 h-full glass-card border-white/5 hover:border-primary/40 transition-all duration-500 group relative overflow-hidden shadow-premium hover:shadow-premium-hover rounded-[2.5rem]">
                <div className={`absolute -top-12 -right-12 w-32 h-32 ${lottery.color} opacity-10 blur-[50px] group-hover:opacity-30 transition-opacity duration-700`} />
                <div className="text-4xl mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 drop-shadow-lg">{lottery.icon}</div>
                <h3 className="font-black uppercase tracking-tighter italic text-xl mb-6 group-hover:text-primary transition-colors leading-none">{lottery.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Análise Própria
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <BarChart3 className="w-3 h-3 text-blue-500" />
                    Estratégias Próprias
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Binary className="w-3 h-3 text-primary" />
                    Titan Score v4
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