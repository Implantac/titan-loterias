import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

export function TitanAIModule() {
  const navigate = useNavigate();

  return (
    <Card className="p-6 md:p-8 glass-card border-primary/20 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />

      <div className="relative z-10 space-y-6">
        {/* Header: icon + title + badges */}
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 mx-auto sm:mx-0">
            <BrainCircuit className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary bg-primary/5">
                Titan AI Center
              </Badge>
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                Online
              </Badge>
            </div>

            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-tight">
              TITAN <span className="gradient-brand-text">AI CENTER</span>
            </h2>
          </div>
        </div>

        {/* Description full-width for breathing room */}
        <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-3xl">
          Titan AI Center é o módulo de inteligência aplicado às loterias brasileiras que analisa históricos oficiais e utiliza modelos matemáticos para detectar sinais estatísticos.
        </p>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 h-12 hover:bg-primary/10"
            onClick={() => navigate("/ia-chat")}
            onMouseEnter={() => prefetchRoute("/ia-chat")}
            onFocus={() => prefetchRoute("/ia-chat")}
            onTouchStart={() => prefetchRoute("/ia-chat")}
          >
            <MessageSquare className="w-4 h-4" />
            Abrir Chat IA
          </Button>
          <Button
            variant="premium"
            className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 h-12 shadow-lg shadow-primary/20"
            onClick={() => navigate("/ia-autonoma")}
            onMouseEnter={() => prefetchRoute("/ia-autonoma")}
            onFocus={() => prefetchRoute("/ia-autonoma")}
            onTouchStart={() => prefetchRoute("/ia-autonoma")}
          >
            <Sparkles className="w-4 h-4" />
            Modo Autônomo
          </Button>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 relative z-10">
        {[
          { label: "Sugestão da IA", value: "Frequência Histórica", icon: TrendingUp },
          { label: "Confiança do Sinal", value: "Moderada (71%)", icon: Sparkles },
          { label: "Padrão Detectado", value: "Cíclico Ativo", icon: BrainCircuit },
          { label: "Vantagem Est.", value: "Alta Fidelity", icon: TrendingUp },
        ].map((item, i) => (
          <div key={i} className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-70">
              <item.icon className="w-3 h-3 text-primary" />
              {item.label}
            </div>
            <p className="text-sm font-black uppercase tracking-tight italic text-emerald-400">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}