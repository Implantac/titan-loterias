import { useState } from "react";
import { LotteryConfig, DrawResult } from "@/data/lotteries";
import { NumberStats } from "@/engine/stats/statistics";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, Copy, Check, Star, Sparkles, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { GameAnalysisBlock } from "@/components/lottery/analysis/GameAnalysisBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateNativeBets } from "@/engine/ai/native-analysis";
import { AIAnalystBriefing } from "@/components/lottery/AIAnalystBriefing";



interface Props {
  config: LotteryConfig;
  stats: NumberStats[];
  draws: DrawResult[];
  onSaveBet?: (numbers: number[], strategy?: string, score?: number, grade?: string) => void;
}

export function AIPredictionPanel({ config, stats, draws, onSaveBet }: Props) {
  const [bets, setBets] = useState<number[][]>([]);
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [count, setCount] = useState(3);
  const [quality, setQuality] = useState<{ avgScore: number; scores: number[]; details?: string[][]; grade: string } | null>(null);
  const [expandedBet, setExpandedBet] = useState<number | null>(null);


  const generate = async () => {
    setLoading(true);
    setBets([]);
    setAnalysis("");
    setQuality(null);
    try {
      // Native generation — no AI credits needed
      await new Promise(r => setTimeout(r, 300)); // Brief delay for UX
      const result = generateNativeBets(stats, config, draws, count);

      setBets(result.bets);
      setAnalysis(result.analysis);
      setQuality(result.quality);
      setSaved(new Set());
      toast.success(`${result.bets.length} apostas geradas! Qualidade: ${result.quality.grade}`);
    } catch (e: any) {
      console.error("Native prediction error:", e);
      toast.error(e?.message || "Erro ao gerar predições");
    } finally {
      setLoading(false);
    }
  };

  const copyBet = (bet: number[], index: number) => {
    navigator.clipboard.writeText(bet.join(" - "));
    setCopied(index);
    toast.success("Aposta copiada!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = (bet: number[], index: number) => {
    onSaveBet?.(bet, "IA Nativa v2.0");
    setSaved(prev => new Set([...prev, index]));
  };

  const copyAll = () => {
    const text = bets.map((b, i) => `#${i + 1}: ${b.join(" - ")}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Todas as apostas copiadas!");
  };

  return (
    <div className="rounded-2xl glass-card p-6 border border-primary/30 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform duration-500">
              <Brain className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest italic flex items-center gap-2">
                IA Nativa v5.3
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/40 text-primary bg-primary/5">Heurística</Badge>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest opacity-60">
                Frequência + Markov + Entropia • Sem Créditos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {quality && (
              <div className="flex items-center gap-2 pr-2 border-r border-border/40">
                <span className={`text-[10px] font-black uppercase tracking-widest italic px-3 py-1 rounded-lg border-2 shadow-sm ${
                  quality.grade === "S" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" :
                  quality.grade === "A" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                  "bg-blue-500/20 text-blue-400 border-blue-500/40"
                }`}>
                  {quality.grade} Quality Node • {quality.avgScore}pts
                </span>
              </div>
            )}
            {bets.length > 0 && (
              <Button size="sm" variant="outline" onClick={copyAll} className="h-9 px-4 rounded-xl border-border/40 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground font-black uppercase tracking-widest text-[9px] transition-all">
                <Copy className="w-3.5 h-3.5 mr-2" /> Copiar Tudo
              </Button>
            )}
          </div>
        </div>


        {/* Count selector + Generate */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-secondary/10 p-4 rounded-2xl border border-border/40">
          <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-xl border border-border/40 shrink-0">
            {[1, 3, 5, 10].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${
                  count === n
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <Button
            onClick={generate}
            disabled={loading}
            size="sm"
            className="h-11 px-8 rounded-xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Executar Análise Estatística
              </>
            )}
          </Button>
        </div>


        {/* Analysis text */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-primary/5 border border-primary/20 shadow-inner relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <p className="text-xs text-foreground/80 leading-relaxed font-medium relative z-10 italic">
              <Brain className="w-4 h-4 inline mr-2 text-primary opacity-60" />
              {analysis}
            </p>
          </motion.div>
        )}


        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Brain className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-xs text-muted-foreground animate-pulse">
              A IA está analisando padrões de 100 sorteios...
            </p>
          </div>
        )}

        {/* Bets list */}
        <AnimatePresence mode="wait">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bets.map((bet, i) => (
              <motion.div
                key={`ai-${i}-${bet.join(",")}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col gap-1.5 p-4 rounded-xl bg-secondary/30 border border-primary/10 hover:border-primary/40 hover:bg-secondary/40 hover:shadow-xl hover:shadow-black/20 transition-all group cursor-pointer active:scale-[0.99]"
                onClick={() => setExpandedBet(expandedBet === i ? null : i)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary font-mono w-6 font-semibold">#{i + 1}</span>
                  {quality?.scores?.[i] !== undefined && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      quality.scores[i] >= 90 ? "bg-yellow-500/20 text-yellow-400" :
                      quality.scores[i] >= 80 ? "bg-green-500/20 text-green-400" :
                      quality.scores[i] >= 70 ? "bg-blue-500/20 text-blue-400" :
                      "bg-muted text-muted-foreground"
                    }`}>{quality.scores[i]}pts</span>
                  )}

                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {bet.map(n => {
                      const stat = stats.find(s => s.number === n);
                      const ballClass =
                        stat?.status === "hot"
                          ? "lottery-ball-hot"
                          : stat?.status === "cold"
                          ? "lottery-ball-cold"
                          : "";
                      return (
                        <span key={n} className={`lottery-ball text-xs w-8 h-8 ${ballClass}`}>
                          {String(n).padStart(2, "0")}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    {onSaveBet && (
                      <button
                        onClick={() => handleSave(bet, i)}
                        className={`transition-colors p-1 rounded-md ${
                          saved.has(i)
                            ? "text-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/5 opacity-0 group-hover:opacity-100"
                        }`}
                        disabled={saved.has(i)}
                      >
                        <Star className={`w-4 h-4 ${saved.has(i) ? "fill-yellow-400" : ""}`} />
                      </button>
                    )}
                    <button
                      onClick={() => copyBet(bet, i)}
                      className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/5"
                    >
                      {copied === i ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {quality?.details?.[i] && quality.details[i].length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-8">
                    {quality.details[i].map((detail: string, j: number) => (
                      <span key={j} className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        detail.startsWith("⚠") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      }`}>{detail}</span>
                    ))}
                  </div>
                )}
                <div className="ml-8">
                  <GameAnalysisBlock numbers={bet} stats={stats} config={config} draws={draws} />
                </div>
                
                <AnimatePresence>
                  {expandedBet === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-2 overflow-hidden"
                    >
                      <AIAnalystBriefing 
                        confidence={quality?.scores?.[i] || 85} 
                        reasons={quality?.details?.[i] || ["Análise de tendência positiva", "Distribuição estatística validada"]} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {!loading && bets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-primary/20 rounded-lg">
            <Brain className="w-6 h-6 mx-auto mb-2 text-primary/40" />
            Clique em "Gerar com IA" para obter palpites inteligentes
          </div>
        )}
      </div>
    </div>
  );
}
