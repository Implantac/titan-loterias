import { useState, useCallback, useRef, useEffect } from "react";
import { formatNumber } from "@/utils/formatters";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { PlanGate } from "@/components/PlanGate";
import { LotteryContextBanner } from "@/components/LotteryContextBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nativeAI } from "@/ai/core/nativeAIOrchestrator";
import { STRATEGIES } from "@/ai/knowledge/strategiesKnowledge";
import { getLotteryRules } from "@/ai/knowledge/lotteriesKnowledge";
import type { AIResponse, ScoredGame, RiskProfile } from "@/ai/core/aiTypes";
import { Brain, Send, Sparkles, Shield, FlaskConical, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSavedBets } from "@/hooks/useSavedBets";
import { FarolEstatistico } from "@/components/lottery/analysis/FarolEstatistico";
import { EliteGameCard } from "@/components/lottery/EliteGameCard";
import { NumberPickerGrid } from "@/components/NumberPickerGrid";

const AIAnalystPage = () => {
  const { config, draws, stats, selectedLottery } = useLotteryContext();
  const { saveBet } = useSavedBets(selectedLottery);
  const [activeTab, setActiveTab] = useState("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string; response?: AIResponse }[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generator state
  const [genStrategy, setGenStrategy] = useState<RiskProfile>("balanced");
  const [genCount, setGenCount] = useState(10);
  const [genResult, setGenResult] = useState<AIResponse | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleChat = useCallback(async () => {
    if (!chatInput.trim() || loading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = await nativeAI.process({
        input: userMsg,
        lotteryId: selectedLottery,
        draws, stats, config,
      });
      setChatHistory(prev => [...prev, { role: "ai", content: response.explanation, response }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: "ai", content: "Erro ao processar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }, [chatInput, loading, selectedLottery, draws, stats, config]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await nativeAI.process({
        input: `gere ${genCount} jogos com perfil ${genStrategy}`,
        lotteryId: selectedLottery, draws, stats, config,
      });
      setGenResult(response);
    } catch { toast.error("Erro na geração"); }
    finally { setLoading(false); }
  }, [genCount, genStrategy, selectedLottery, draws, stats, config]);

  const saveGame = (game: ScoredGame) => {
    saveBet({ numbers: game.numbers, strategy: `IA Nativa (${genStrategy})`, score: game.totalScore, grade: game.grade });
    toast.success("Jogo salvo!");
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
      <div className="text-center space-y-6 pt-10 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary shadow-[0_0_15px_rgba(234,179,8,0.1)]">
          <Brain className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Titan Intelligence v7.2</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Intelligence <span className="gradient-brand-text not-italic">Hub</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-medium">
            Seu assistente configurado para <span className="text-foreground font-bold">{config.name}</span>. 
            Otimize seus resultados com inteligência de dados de última geração.
          </p>
        </div>
      </div>

      <div className="px-4">
        <LotteryContextBanner />
      </div>

      <PlanGate feature="ai_analyst" fallbackMessage="AI Analyst — IA nativa com geração, análise e simulação">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-10">
          <div className="flex justify-center px-4 overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-secondary/40 border border-border/40 p-1.5 rounded-2xl h-auto flex gap-1 shadow-lg backdrop-blur-md">
              <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2">
                <Send className="h-4 w-4" /> Concierge
              </TabsTrigger>
              <TabsTrigger value="generator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2">
                <Sparkles className="h-4 w-4" /> Gerador
              </TabsTrigger>
              <TabsTrigger value="wheeling" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2">
                <Shield className="h-4 w-4" /> Blindagem
              </TabsTrigger>
              <TabsTrigger value="simulation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2">
                <FlaskConical className="h-4 w-4" /> Simular
              </TabsTrigger>
              <TabsTrigger value="farol" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl py-3 px-6 font-black uppercase tracking-widest text-[10px] transition-all gap-2">
                <Zap className="h-4 w-4" /> Farol
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 space-y-6">
            <TabsContent value="chat" className="m-0 focus-visible:ring-0">
              <Card className="border-border/40 shadow-2xl overflow-hidden rounded-[2rem] bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b border-border/10 bg-secondary/20">
                  <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tighter italic">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    Titan AI Center
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[450px] p-6">
                    {chatHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[350px] text-center space-y-4 opacity-40">
                        <Brain className="w-16 h-16 text-primary" />
                        <p className="text-sm font-bold uppercase tracking-widest">Aguardando sua diretriz...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] p-5 rounded-[1.5rem] text-sm leading-relaxed shadow-sm border ${
                              msg.role === "user" 
                                ? "bg-primary text-primary-foreground rounded-br-sm border-primary/20" 
                                : "bg-card text-foreground rounded-bl-sm border-border/40"
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </ScrollArea>
                  <div className="p-6 border-t border-border/10 bg-secondary/10">
                    <div className="flex gap-3">
                      <Input 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        onKeyDown={e => e.key === "Enter" && handleChat()} 
                        placeholder="O que deseja analisar hoje?" 
                        className="bg-background/50 border-border/40 h-14 rounded-2xl px-6"
                      />
                      <Button onClick={handleChat} disabled={loading} className="w-14 h-14 rounded-2xl gradient-brand shadow-lg">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="generator" className="m-0 focus-visible:ring-0">
              <Card className="border-border/40 shadow-2xl rounded-[2rem] bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-secondary/20 border-b border-border/10">
                  <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tighter italic">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    Gerador de Jogos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <NumberPickerGrid
                    config={config}
                    stats={stats}
                    onSaveBet={(numbers) => { saveBet({ numbers, strategy: "Manual" }); toast.success("Jogo salvo!"); }}
                  />
                  <div className="grid md:grid-cols-3 gap-8 p-6 bg-secondary/20 rounded-3xl border border-border/10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arquitetura de Risco</label>
                      <Select value={genStrategy} onValueChange={v => setGenStrategy(v as RiskProfile)}>
                        <SelectTrigger className="bg-background h-12 rounded-xl border-border/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(STRATEGIES).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume de Amostragem: {genCount}</label>
                      <div className="pt-4">
                        <Slider value={[genCount]} onValueChange={v => setGenCount(v[0])} min={1} max={50} step={1} />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 rounded-xl gradient-brand font-black uppercase tracking-widest text-xs shadow-lg">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                        Executar Geração
                      </Button>
                    </div>
                  </div>
                  
                  {genResult?.games && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="font-black uppercase tracking-tighter text-sm italic">Candidatos Selecionados</h3>
                        <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">{genResult.metadata?.processingTimeMs}ms</Badge>
                      </div>
                      <div className="grid gap-4">
                        {genResult.games.map((game, i) => (
                          <EliteGameCard 
                            key={i} 
                            numbers={game.numbers} 
                            score={game.totalScore} 
                            grade={game.grade} 
                            index={i} 
                            onSave={() => saveGame(game)}
                            strategy={genStrategy}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="farol" className="m-0 focus-visible:ring-0">
                <FarolEstatistico />
            </TabsContent>
          </div>
        </Tabs>
      </PlanGate>
    </div>
  );
};

export default AIAnalystPage;
