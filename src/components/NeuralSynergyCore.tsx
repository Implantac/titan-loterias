import React from "react";
import { motion } from "framer-motion";
import { Share2, Zap, Shield, Cpu, Activity, Network, BrainCircuit } from "lucide-react";
import { AnalyticsSnapshot } from "@/engine/stats/analytics-core";
import { Badge } from "@/components/ui/badge";

interface NeuralSynergyCoreProps {
  analytics: AnalyticsSnapshot;
}

export const NeuralSynergyCore = ({ analytics }: NeuralSynergyCoreProps) => {
  const engines = [
    { name: "Engine GA-X (Genético)", status: "SYNCED", load: 42, color: "from-primary/40 to-primary" },
    { name: "Matrix Markov v2.4", status: "ACTIVE", load: 68, color: "from-neon-blue/40 to-neon-blue" },
    { name: "Annealing Estocástico", status: "OPTIMIZING", load: 25, color: "from-accent/40 to-accent" },
    { name: "Entropia Quântica", status: "CALIBRATED", load: 89, color: "from-neon-purple/40 to-neon-purple" }
  ];

  return (
    <div className="glass-card rounded-2xl border border-primary/20 p-6 bg-black/40 backdrop-blur-xl relative overflow-hidden group">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.2),transparent)]" />
        <svg width="100%" height="100%" className="absolute inset-0">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-lg font-black text-foreground flex items-center gap-2 tracking-tighter italic uppercase">
            <Share2 className="w-5 h-5 text-primary" />
            Sinergia de Indicadores
          </h3>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
            Engine Fusion • v5.3 Synergy Protocol
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 animate-pulse font-black tracking-widest text-[9px] px-3 py-1 rounded-full shadow-lg shadow-primary/10">
          CORE-SYNC: {analytics.synergyScore.toFixed(1)}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="space-y-6">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 flex items-center gap-2 mb-4">
            <Cpu className="w-3.5 h-3.5 text-primary" /> Matrix Fusion Distribution
          </span>

          <div className="space-y-5">
            {engines.map((engine, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-foreground/70 flex items-center gap-1.5">
                    <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${engine.color}`} />
                    {engine.name}
                  </span>
                  <span className={`italic ${engine.status === "OPTIMIZING" ? "text-accent" : "text-primary"}`}>{engine.status}</span>
                </div>

                <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 relative group-hover:bg-black/40 transition-colors">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${engine.load}%` }}
                    transition={{ duration: 1.5, ease: "circOut", delay: idx * 0.1 }}
                    className={`h-full bg-gradient-to-r ${engine.color} shadow-[0_0_10px_rgba(var(--primary),0.3)]`}
                  />
                  {/* Micro-loading animation */}
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 flex items-center gap-2 mb-4">
              <Activity className="w-3.5 h-3.5 text-primary" /> Flux Velocity Index
            </span>

            <div className="relative h-28 bg-black/60 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-inner group/flux">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover/flux:opacity-100 transition-opacity duration-700" />
              
              {/* Animated Waveform */}
              <svg className="absolute inset-0 w-full h-full opacity-30">
                <motion.path
                  animate={{ 
                    d: [
                      "M 0 50 Q 25 30 50 50 T 100 50 T 150 50 T 200 50 T 250 50 T 300 50 T 350 50 T 400 50",
                      "M 0 50 Q 25 70 50 50 T 100 50 T 150 50 T 200 50 T 250 50 T 300 50 T 350 50 T 400 50",
                      "M 0 50 Q 25 30 50 50 T 100 50 T 150 50 T 200 50 T 250 50 T 300 50 T 350 50 T 400 50"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                />
              </svg>

              <div className="relative z-10 text-center group-hover/flux:scale-110 transition-transform duration-500">
                <span className="text-5xl font-black text-primary font-mono tracking-tighter italic drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                  {analytics.quantumFlux.toFixed(2)}
                </span>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 mt-1">Velocity Protocol</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 shadow-lg shadow-primary/5 group/box transition-all hover:bg-primary/10 hover:border-primary/40">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="w-3.5 h-3.5 text-primary opacity-60" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60">Confidence</span>
              </div>
              <span className="text-2xl font-black text-foreground font-mono italic">{analytics.institutionalConfidence.toFixed(1)}%</span>
            </div>
            
            <div className="bg-accent/5 rounded-xl p-4 border border-accent/20 shadow-lg shadow-accent/5 group/box transition-all hover:bg-accent/10 hover:border-accent/40">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-accent opacity-60" />
                <span className="text-[9px] font-black uppercase tracking-widest text-accent opacity-60">Elite Path</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent),0.8)]"
                />
                <span className="text-xl font-black text-foreground font-mono italic">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
