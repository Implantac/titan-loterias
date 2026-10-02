import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Brain, Target, Dices, TrendingUp,
  Shield, ChevronLeft, ChevronRight, Sparkles, Activity,
  PieChart, Cpu, LineChart, Zap, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScreenSlide {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  accentBg: string;
  content: React.ReactNode;
}

// ── Mini mock screen contents ──
function DashboardMock() {
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Concursos", val: "14.502", icon: BarChart3, c: "text-primary" },
          { label: "IA Models", val: "48", icon: Brain, c: "text-neon-blue" },
          { label: "Predictive", val: "89%", icon: TrendingUp, c: "text-primary" },
          { label: "Status", val: "Ativo", icon: Zap, c: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/20 bg-card/50 p-2 text-center">
            <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.c}`} />
            <div className="text-xs font-bold font-mono text-foreground">{s.val}</div>
            <div className="text-[7px] text-muted-foreground uppercase">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/20 bg-card/30 p-3">
          <div className="text-[8px] text-muted-foreground uppercase font-mono mb-2">Frequência</div>
          <div className="flex items-end gap-[2px] h-14">
            {[65, 42, 78, 35, 90, 55, 70, 48, 82, 60, 45, 73].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `linear-gradient(to top, hsl(var(--primary) / 0.8), hsl(var(--primary) / 0.2))` }} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border/20 bg-card/30 p-3">
          <div className="text-[8px] text-muted-foreground uppercase font-mono mb-2">Tendência</div>
          <svg viewBox="0 0 200 80" className="w-full h-14">
            <path d="M 0 60 Q 30 20 60 45 T 120 30 T 200 15" fill="none" stroke="hsl(var(--neon-blue))" strokeWidth="2" />
            <path d="M 0 60 Q 30 20 60 45 T 120 30 T 200 15 L 200 80 L 0 80 Z" fill="hsl(var(--neon-blue) / 0.1)" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function GeradorMock() {
  const nums = [7, 13, 22, 34, 41, 58];
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-border/20 bg-card/30 p-4 text-center">
        <div className="text-[8px] text-muted-foreground uppercase font-mono mb-3">Mega-Sena — Aposta Otimizada</div>
        <div className="flex items-center justify-center gap-2.5">
          {nums.map((n) => (
            <div key={n} className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-sm font-bold font-mono shadow-lg" style={{ boxShadow: "0 3px 15px hsl(var(--primary) / 0.35)" }}>
              {n.toString().padStart(2, "0")}
            </div>
          ))}
        </div>
        <div className="mt-3"><span className="text-[8px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 italic font-black">Titan Score: 94/100 — Excelente Oportunidade</span></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[{ l: "Padrão", v: 87 }, { l: "Tendência", v: 74 }, { l: "Genético", v: 91 }, { l: "MC", v: 82 }].map((i) => (
          <div key={i.l} className="rounded-lg border border-border/20 bg-card/30 p-2 text-center">
            <div className="text-[7px] text-muted-foreground font-mono mb-1">{i.l}</div>
            <div className="text-xs font-bold font-mono text-primary">{i.v}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstatisticasMock() {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-border/20 bg-card/30 p-3">
        <div className="text-[8px] text-muted-foreground uppercase font-mono mb-2">Mapa de Calor</div>
        <div className="grid grid-cols-10 gap-[2px]">
          {Array.from({ length: 60 }, (_, i) => {
            const intensity = Math.random();
            return (
              <div key={i} className="aspect-square rounded-sm flex items-center justify-center text-[5px] font-mono text-foreground/60" style={{ background: `hsl(var(--primary) / ${intensity * 0.7 + 0.05})` }}>
                {(i + 1).toString().padStart(2, "0")}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SimuladorMock() {
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[{ l: "Jogos", v: "1M", c: "text-foreground" }, { l: "Sena", v: "0", c: "text-neon-red" }, { l: "Quina", v: "47", c: "text-accent" }].map((s) => (
          <div key={s.l} className="rounded-lg border border-border/20 bg-card/30 p-3 text-center">
            <div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div>
            <div className="text-[7px] text-muted-foreground uppercase">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border/20 bg-card/30 p-3 space-y-2">
        {[{ l: "Quadra", v: "5.124", p: 62 }, { l: "Terno", v: "89.746", p: 85 }, { l: "Duque", v: "423.891", p: 100 }].map((i) => (
          <div key={i.l} className="flex items-center gap-2">
            <span className="text-[7px] text-muted-foreground font-mono w-10">{i.l}</span>
            <div className="flex-1 h-2 rounded-full bg-border/20 overflow-hidden">
              <div className="h-full rounded-full bg-neon-purple" style={{ width: `${i.p}%` }} />
            </div>
            <span className="text-[7px] font-mono text-foreground/70 w-12 text-right">{i.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IAMock() {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-mono text-primary uppercase tracking-wider">Análise Autônoma</span>
        </div>
        <div className="text-[10px] text-foreground/80 leading-relaxed">
          O modelo identificou <span className="text-primary font-semibold">3 padrões recorrentes</span> nos últimos 50 sorteios.
          Números quentes: 07, 13, 34. Tendência de soma entre 140-180.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ l: "Precisão", v: "78%", c: "text-primary" }, { l: "Modelos", v: "5", c: "text-neon-blue" }, { l: "Padrões", v: "12", c: "text-accent" }, { l: "Confiança", v: "Alto", c: "text-primary" }].map((s) => (
          <div key={s.l} className="rounded-lg border border-border/20 bg-card/30 p-2 text-center">
            <div className={`text-sm font-bold font-mono ${s.c}`}>{s.v}</div>
            <div className="text-[7px] text-muted-foreground uppercase">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const slideData: ScreenSlide[] = [
  {
    id: "dashboard",
    title: "Dashboard Inteligente",
    subtitle: "Visão completa de todos os dados, métricas e tendências em tempo real",
    icon: BarChart3,
    color: "text-primary",
    accentBg: "bg-primary/10",
    content: <DashboardMock />,
  },
  {
    id: "gerador",
    title: "Gerador com IA",
    subtitle: "Algoritmos genéticos e Monte Carlo geram apostas otimizadas automaticamente",
    icon: Target,
    color: "text-neon-blue",
    accentBg: "bg-neon-blue/10",
    content: <GeradorMock />,
  },
  {
    id: "estatisticas",
    title: "Análise Estatística",
    subtitle: "Frequência, atraso, paridade, soma e mapas de calor de todos os sorteios",
    icon: PieChart,
    color: "text-accent",
    accentBg: "bg-accent/10",
    content: <EstatisticasMock />,
  },
  {
    id: "simulador",
    title: "Simulação Massiva",
    subtitle: "Rode milhões de jogos em segundos e descubra as probabilidades reais",
    icon: Dices,
    color: "text-neon-purple",
    accentBg: "bg-neon-purple/10",
    content: <SimuladorMock />,
  },
  {
    id: "ia",
    title: "IA Autônoma",
    subtitle: "Modelos de Machine Learning revelam padrões ocultos nos resultados",
    icon: Brain,
    color: "text-primary",
    accentBg: "bg-primary/10",
    content: <IAMock />,
  },
];

export function ScreensShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((a) => (a + 1) % slideData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [active]);

  const prev = useCallback(() => setActive((a) => (a - 1 + slideData.length) % slideData.length), []);
  const next = useCallback(() => setActive((a) => (a + 1) % slideData.length), []);

  const slide = slideData[active];
  const Icon = slide.icon;

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Um tour pela plataforma
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight mt-3">
            Conheça as <span className="gradient-brand-text">principais telas</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Análise, geração, simulação e IA — tudo em um só lugar, pronto para transformar dados em decisões.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
            {/* Sidebar nav */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {slideData.map((s, idx) => {
                const SIcon = s.icon;
                const isActive = idx === active;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(idx)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all shrink-0 lg:shrink min-w-[160px] lg:min-w-0 ${
                      isActive
                        ? "bg-card/60 border border-primary/20 shadow-lg shadow-primary/5"
                        : "border border-transparent hover:bg-card/30"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${isActive ? s.accentBg : "bg-muted/30"} flex items-center justify-center shrink-0`}>
                      <SIcon className={`w-4 h-4 ${isActive ? s.color : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.title}
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-[10px] text-muted-foreground mt-0.5 hidden lg:block"
                        >
                          {s.subtitle}
                        </motion.div>
                      )}
                    </div>
                    {isActive && (
                      <motion.div layoutId="sideActive" className="hidden lg:block ml-auto w-1 h-6 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Screen preview */}
            <div className="relative">
              <div
                className="rounded-2xl border border-border/30 glass-card overflow-hidden ring-1 ring-primary/10"
                style={{
                  boxShadow: "0 0 30px hsl(var(--primary) / 0.08), 0 20px 50px hsl(var(--primary) / 0.06)",
                }}
              >
                {/* Browser chrome */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-neon-red/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-neon-amber/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/50" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/50 ml-2">
                      titan-loterias.com/{slide.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon className={`w-3 h-3 ${slide.color}`} />
                    <span className={`text-[9px] font-mono ${slide.color}`}>{slide.title}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="min-h-[280px] relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.35 }}
                    >
                      {slide.content}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="w-8 h-8 border-border/30" onClick={prev}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-8 h-8 border-border/30" onClick={next}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {slideData.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActive(idx)}
                      className="relative w-6 h-1 rounded-full bg-border/30 overflow-hidden"
                    >
                      {idx === active && (
                        <motion.div
                          key={`p-${active}`}
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 5, ease: "linear" }}
                          className="absolute inset-0 bg-primary rounded-full"
                        />
                      )}
                      {idx < active && <div className="absolute inset-0 bg-primary/40 rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
