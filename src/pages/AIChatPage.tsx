import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLearning } from "@/hooks/useUserLearning";
import { useSavedBets } from "@/hooks/useSavedBets";
import {
  MessageCircle, Send, Trash2, Sparkles, Bot, User, StopCircle, Copy, Check,
  Brain, Zap, Cloud, Layers, BookmarkCheck, ArrowRight, Volume2, VolumeX, Mic, MicOff, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { m, AnimatePresence } from "framer-motion";
import { nativeLotteryAgent, type NativeAgentResponse } from "@/ai/agent/nativeLotteryAgent";
import type { ScoredGame } from "@/ai/core/aiTypes";
import { ExportCaixaDialog } from "@/components/lottery/ExportCaixaDialog";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  generatedGames?: ScoredGame[];
  suggestions?: string[];
  mode?: "native" | "cloud";
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const QUICK_PROMPTS = [
  { emoji: "🎯", text: "Gere 5 jogos equilibrados" },
  { emoji: "🔥", text: "Quais os números mais quentes?" },
  { emoji: "❄️", text: "Quais números estão atrasados?" },
  { emoji: "💼", text: "Tenho R$ 50, qual a melhor estratégia?" },
  { emoji: "🧮", text: "Explique a estratégia de fechamento" },
  { emoji: "🛡️", text: "O que é o filtro Anti-Divisão de Prêmio?" },
  { emoji: "🎲", text: "A Surpresinha da lotérica vale a pena?" },
  { emoji: "⚡", text: "Qual a melhor abordagem para hoje?" },
];

async function streamCloudChat({
  messages,
  lotteryId,
  userContext,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: { role: string; content: string }[];
  lotteryId: string;
  userContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      onError("🔒 Você precisa estar logado para usar o modo nuvem.");
      return;
    }
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages, lotteryId, userContext: userContext || "" }),
      signal,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        onError("⏳ Limite de requisições atingido no gateway.");
        return;
      }
      onError(errData.error || "Erro ao conectar com o gateway de nuvem.");
      return;
    }

    if (!resp.body) { onError("Resposta vazia da nuvem."); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    onDone();
  } catch (err: any) {
    if (err.name === "AbortError") {
      onDone();
      return;
    }
    onError(err.message || "Erro de conexão com o gateway.");
  }
}

const AIChatPage = () => {
  const navigate = useNavigate();
  const { config, draws, stats } = useLotteryContext();
  const { user } = useAuth();
  const { saveBet } = useSavedBets(config.id);
  const { userContext, refresh: refreshLearning } = useUserLearning(config.id);

  const [aiMode, setAiMode] = useState<"native" | "cloud">("native");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savingGamesIdx, setSavingGamesIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  // Ditado por Voz (STT) & Exportação para Caixa
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [gamesToExport, setGamesToExport] = useState<number[][]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantBufferRef = useRef("");

  useEffect(() => {
    if (user?.id) refreshLearning();
  }, [user?.id, config.id]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Reconhecimento de voz não suportado pelo seu navegador (recomendado Google Chrome, Edge ou Safari).");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("🎙️ Ouvindo... Pode falar sua pergunta ou dezenas!");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error(`Aviso do microfone: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setIsListening(false);
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const handleSpeak = (text: string, msgIdx: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Seu dispositivo não suporta síntese de voz nativa.");
      return;
    }
    if (speakingIdx === msgIdx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    // Limpar símbolos markdown para pronúncia natural
    const clean = text
      .replace(/[#*`_~[\]]/g, "")
      .replace(/\|.*?\|/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "pt-BR";
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(msgIdx);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const handleSaveGames = async (games: ScoredGame[], msgIdx: number) => {
    setSavingGamesIdx(msgIdx);
    let saved = 0;
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const ok = await saveBet({
        numbers: g.numbers,
        strategy: `Agente IA Titan: Grau ${g.grade} (Score ${g.totalScore})`,
        label: `${config.name} AI #${i + 1}`,
      });
      if (ok) saved++;
    }
    setSavingGamesIdx(null);
    if (saved > 0) {
      toast.success(`${saved} jogos salvos no seu histórico!`);
    }
  };

  const handleCopyGames = (games: ScoredGame[], msgIdx: number) => {
    const text = games.map((g, i) => {
      const formatted = g.numbers.map((n) => String(n).padStart(2, "0")).join(" ");
      return `Jogo ${i + 1}: ${formatted} (Score: ${g.totalScore})`;
    }).join("\n");

    navigator.clipboard.writeText(text);
    setCopiedIdx(msgIdx);
    toast.success(`${games.length} jogos copiados!`);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSendToBolao = (games: ScoredGame[]) => {
    navigate("/bolao", {
      state: {
        lotteryId: config.id,
        initialGames: games.map((g) => g.numbers),
      },
    });
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: msg, timestamp: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    assistantBufferRef.current = "";

    const controller = new AbortController();
    abortRef.current = controller;

    const upsertAssistant = (chunk: string) => {
      assistantBufferRef.current += chunk;
      const content = assistantBufferRef.current;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
        }
        return [...prev, { role: "assistant", content, timestamp: new Date(), mode: aiMode }];
      });
    };

    if (aiMode === "native") {
      // ⚡ AGENTE NATIVO: ZERO TOKENS • EXECUÇÃO DIRETA NO CLIENTE
      try {
        await nativeLotteryAgent.stream(
          {
            input: msg,
            lotteryId: config.id,
            lotteryConfig: config,
            draws,
            stats,
            userContext,
            history: newMessages.map((m) => ({ role: m.role, content: m.content })),
          },
          (delta) => {
            upsertAssistant(delta);
          },
          (fullResponse: NativeAgentResponse) => {
            setIsStreaming(false);
            setMessages((prev) => {
              return prev.map((m, idx) =>
                idx === prev.length - 1 && m.role === "assistant"
                  ? {
                      ...m,
                      content: fullResponse.markdown,
                      generatedGames: fullResponse.generatedGames,
                      suggestions: fullResponse.suggestions,
                      mode: "native",
                    }
                  : m
              );
            });
          },
          controller.signal
        );
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Erro no processamento do agente nativo.");
        }
        setIsStreaming(false);
      }
    } else {
      // ☁️ MODO NUVEM (FALLBACK EXTERNO)
      await streamCloudChat({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        lotteryId: config.id,
        userContext,
        onDelta: upsertAssistant,
        onDone: () => setIsStreaming(false),
        onError: (err) => {
          toast.error(err);
          setIsStreaming(false);
        },
        signal: controller.signal,
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto pb-6 space-y-4 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-4 pt-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Titan AI Center</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {aiMode === "native" ? "Agente Nativo Ativo • Zero Tokens" : "Modo Nuvem Ativo"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Modo: Nativo vs Nuvem */}
          <div className="flex items-center rounded-xl bg-secondary/40 border border-border/40 p-1">
            <button
              onClick={() => setAiMode("native")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all",
                aiMode === "native"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Nativo (0 Tokens)
            </button>
            <button
              onClick={() => setAiMode("cloud")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all",
                aiMode === "cloud"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Cloud className="w-3.5 h-3.5" />
              Nuvem
            </button>
          </div>

          <Badge variant="outline" className="bg-secondary/40 border-border/40 text-[9px] font-black tracking-widest uppercase py-1.5 px-3 rounded-lg">
            Loteria: {config.name}
          </Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-card/40 backdrop-blur-md border border-border/40 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth relative z-10">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-2xl transform rotate-3">
                  <Bot className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-card">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-3 max-w-md">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic leading-none">
                  Agente Quantitativo <span className="gradient-brand-text">Titan Core</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                  Treinado nas regras oficiais da Caixa, matrizes de fechamento, ciclos e split-avoidance. Respostas instantâneas com <strong>consumo zero de tokens</strong>.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => sendMessage(prompt.text)}
                    className="group flex items-center gap-4 text-left text-sm px-6 py-4 rounded-2xl border border-border/40 bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{prompt.emoji}</span>
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner",
                  msg.role === "assistant" ? "bg-primary/10 border-primary/20" : "bg-secondary/40 border-border/40"
                )}>
                  {msg.role === "assistant" ? <Bot className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-foreground" />}
                </div>
                <div className={cn(
                  "flex flex-col max-w-[92%] sm:max-w-[80%] space-y-3",
                  msg.role === "user" ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "rounded-[2rem] px-6 py-4 text-sm shadow-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border/40 rounded-tl-sm text-foreground w-full"
                  )}>
                    {msg.role === "assistant" ? (
                      <div>
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary/20 prose-pre:border prose-pre:border-border/10 prose-th:bg-primary/5 prose-th:text-primary">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              ⚡ Zero Tokens
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSpeak(msg.content, i)}
                            className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                          >
                            {speakingIdx === i ? <VolumeX className="w-3.5 h-3.5 text-primary" /> : <Volume2 className="w-3.5 h-3.5" />}
                            {speakingIdx === i ? "Parar Áudio" : "Ouvir"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-medium">{msg.content}</p>
                    )}
                  </div>

                  {/* Jogos Gerados Interativos (se houver) */}
                  {msg.generatedGames && msg.generatedGames.length > 0 && (
                    <div className="w-full p-3 rounded-2xl bg-secondary/20 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          Ações Rápidas nos {msg.generatedGames.length} Jogos Gerados:
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                          Titan Score Ativo
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyGames(msg.generatedGames!, i)}
                          className="h-8 text-xs gap-1.5"
                        >
                          {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copiar Jogos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveGames(msg.generatedGames!, i)}
                          disabled={savingGamesIdx === i}
                          className="h-8 text-xs gap-1.5"
                        >
                          <BookmarkCheck className="w-3 h-3 text-primary" />
                          {savingGamesIdx === i ? "Salvando..." : "Salvar em Meus Jogos"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendToBolao(msg.generatedGames!)}
                          className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                        >
                          <ArrowRight className="w-3 h-3" />
                          Enviar para o Bolão
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGamesToExport(msg.generatedGames!.map((g) => g.numbers));
                            setExportDialogOpen(true);
                          }}
                          className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          Exportar Caixa / TXT
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sugestões de Continuação (Chips Rápidos) */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => sendMessage(sug)}
                          disabled={isStreaming}
                          className="text-[11px] px-3 py-1 rounded-xl bg-secondary/30 hover:bg-primary/10 border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all duration-200"
                        >
                          ↳ {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </m.div>
            ))}
          </AnimatePresence>

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-4 animate-in fade-in">
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="bg-card border border-border/40 rounded-[2rem] rounded-tl-sm px-6 py-4 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-secondary/20 border-t border-border/10 backdrop-blur-xl relative z-20">
          <div className="max-w-4xl mx-auto relative flex items-end gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={isStreaming ? "Agente calculando..." : `Pergunte sobre estratégias, números ou peça palpites da ${config.name}...`}
              className="min-h-[60px] max-h-[180px] rounded-3xl border-border/40 bg-background/80 backdrop-blur-sm px-6 py-4 shadow-inner resize-none focus-visible:ring-primary/20"
              disabled={isStreaming}
            />
            <Button
              type="button"
              onClick={toggleListening}
              size="icon"
              variant={isListening ? "destructive" : "secondary"}
              className={cn(
                "h-[60px] w-[60px] rounded-3xl shrink-0 shadow-md transition-all duration-200 border border-border/40",
                isListening && "animate-pulse ring-4 ring-destructive/30 bg-destructive text-white"
              )}
              title={isListening ? "Parar de ouvir" : "Falar por voz (Ditado nativo)"}
              disabled={isStreaming}
            >
              {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-foreground" />}
            </Button>
            {isStreaming ? (
              <Button onClick={stopStreaming} size="icon" variant="destructive" className="h-[60px] w-[60px] rounded-3xl shrink-0 shadow-lg">
                <StopCircle className="w-6 h-6" />
              </Button>
            ) : (
              <Button onClick={() => sendMessage()} disabled={!input.trim()} className="h-[60px] w-[60px] rounded-3xl shrink-0 gradient-brand shadow-xl">
                <Send className="w-6 h-6" />
              </Button>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-4 font-black uppercase tracking-widest opacity-40 italic">
            {aiMode === "native"
              ? "⚡ Agente Nativo Titan Core • Zero Tokens • Reconhecimento de Voz & Síntese Integrados"
              : "☁️ Conectado ao Gateway em Nuvem"}
          </p>
        </div>
      </div>

      <ExportCaixaDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        games={gamesToExport}
        lotteryName={config.name}
        lotteryId={config.id}
      />
    </div>
  );
};

export default AIChatPage;
