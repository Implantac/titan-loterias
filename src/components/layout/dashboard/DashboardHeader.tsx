import { Activity } from "lucide-react";

interface DashboardHeaderProps {
  statsCount: number;
  drawsCount: number;
}

export function DashboardHeader({ statsCount, drawsCount }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Motor Estatístico • v7.5</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <Activity className="w-3 h-3 text-muted-foreground animate-pulse" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Sincronização 100%</span>
          </div>
        </div>
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.9] drop-shadow-2xl animate-float">
          Sua Melhor <span className="gradient-brand-text drop-shadow-[0_0_15px_rgba(255,178,0,0.3)]">Oportunidade</span> Hoje
        </h1>
        <p className="text-sm text-muted-foreground font-medium max-w-lg leading-relaxed">
          O motor Titan AI processou <span className="text-primary font-black italic">{statsCount}</span> dezenas e <span className="text-primary font-black italic">{drawsCount}</span> concursos. Recomendação de alta convergência detectada.
        </p>
      </div>
    </div>
  );
}
