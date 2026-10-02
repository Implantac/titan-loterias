import { Card } from "@/components/ui/card";
import { Database } from "lucide-react";

interface QuickStatsRowProps {
  drawsCount: number;
}

export function QuickStatsRow({ drawsCount }: QuickStatsRowProps) {
  const stats = [
    { label: "Sorteios Base", value: drawsCount, icon: Database, color: "text-primary" },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <Card key={i} className="p-6 flex items-center gap-5 hover:border-primary/20 group overflow-hidden relative">
          <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <div className={`w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform ${stat.color}`}>
            <stat.icon className="w-7 h-7" />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{stat.label}</p>
            <p className="text-2xl font-black italic tracking-tighter tabular-nums text-foreground">{stat.value}</p>
          </div>
        </Card>
      ))}
    </section>
  );
}
