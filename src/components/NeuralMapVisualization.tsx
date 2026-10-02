import React from "react";
import { motion } from "framer-motion";
import { Network, BrainCircuit, Activity, ShieldCheck, Database, Cpu, Zap } from "lucide-react";

export function NeuralMapVisualization() {
  const nodes = [
    { id: 1, x: 20, y: 50, label: "Data Input", icon: Database },
    { id: 2, x: 40, y: 30, label: "GA Engine", icon: Zap },
    { id: 3, x: 40, y: 70, label: "Markov Chain", icon: Activity },
    { id: 4, x: 60, y: 50, label: "Análise Multicritério", icon: BrainCircuit },
    { id: 5, x: 80, y: 30, label: "Entropy Check", icon: ShieldCheck },
    { id: 6, x: 80, y: 70, label: "Audit Protocol", icon: ShieldCheck },
    { id: 7, x: 100, y: 50, label: "Alpha Output", icon: Cpu },
  ];

  const connections = [
    [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [4, 6], [5, 7], [6, 7]
  ];

  return (
    <div className="relative w-full h-[400px] bg-black/60 rounded-3xl border border-primary/20 overflow-hidden group">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="neural-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#neural-grid)" />
        </svg>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map(([from, to], idx) => {
          const fromNode = nodes.find(n => n.id === from)!;
          const toNode = nodes.find(n => n.id === to)!;
          return (
            <g key={idx}>
              <motion.line
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
                stroke="var(--primary)"
                strokeWidth="1.5"
                initial={{ opacity: 0.1 }}
                animate={{ opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, delay: idx * 0.2 }}
              />
              <motion.circle
                r="3"
                fill="var(--primary)"
                initial={{ offset: 0 }}
                animate={{ cx: [`${fromNode.x}%`, `${toNode.x}%`], cy: [`${fromNode.y}%`, `${toNode.y}%`] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: idx * 0.5 }}
              />
            </g>
          );
        })}
      </svg>

      {nodes.map((node) => (
        <motion.div
          key={node.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: node.id * 0.1 }}
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
          className="absolute z-10"
        >
          <div className="relative group/node">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-0 group-hover/node:scale-150 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-xl bg-black border border-primary/40 flex items-center justify-center relative z-10 shadow-lg shadow-primary/10 group-hover/node:border-primary transition-colors">
              <node.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/80 border border-primary/20 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/node:opacity-100 transition-opacity whitespace-nowrap">
              {node.label}
            </div>
          </div>
        </motion.div>
      ))}

      <div className="absolute bottom-6 left-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Análise ativa</span>
        </div>
        <p className="text-[8px] text-muted-foreground uppercase font-medium tracking-[0.2em]">Institutional Processing Bridge v5.3</p>
      </div>
      
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <div className="text-right">
          <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Synergy Index</p>
          <p className="text-xl font-black text-primary italic font-mono">94.8%</p>
        </div>
        <Network className="w-8 h-8 text-primary/40 animate-pulse" />
      </div>
    </div>
  );
}
