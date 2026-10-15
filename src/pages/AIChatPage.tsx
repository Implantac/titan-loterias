import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLotteryContext } from "@/contexts/LotteryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLearning } from "@/hooks/useUserLearning";
import { MessageCircle, Send, Trash2, Sparkles, Bot, User, StopCircle, Copy, Check, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { m, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const QUICK_PROMPTS = [
  { emoji: "🔥", text: "Quais os números mais quentes?" },
  { emoji: "🎯", text: "Gere 5 jogos equilibrados" },
  { emoji: "📊", text: "Analise os padrões recentes" },
  { emoji: "❄️", text: "Quais números estão atrasados?" },
  { emoji: "🧮", text: "Explique a estratégia de fechamento" },
  { emoji: "⚡", text: "Qual a melhor abordagem para hoje?" },
];

async function streamChat({
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
      onError("🔒 Você precisa estar logado para usar o chat.");
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
        onError("⏳ Limite de requisições atingido. Aguarde alguns instantes.");
        return;
      }
      onError(errData.error || "Erro ao conectar com a IA.");
      return;
    }

    if (!resp.body) { onError("Resposta vazia da IA."); return; }

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
    onError(err.message || "Erro de conexão.");
  }
}

const AIChatPage = () => {
  const { config } = useLotteryContext();
  const { user } = useAuth();
  const { userContext, refresh: refreshLearning } = useUserLearning(config.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantBufferRef = useRef("");

  useEffect(() => {
    if (user?.id) refreshLearning();
  }, [user?.id, config.id]);

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
        return [...prev, { role: "assistant", content, timestamp: new Date() }];
      });
    };

    await streamChat({
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
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto pb-6 space-y-4 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Titan AI Center</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">IA Especialista Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-secondary/40 border-border/40 text-[9px] font-black tracking-widest uppercase py-1 px-3 rounded-lg">
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
            <div className="flex flex-col items-center justify-center h-full text-center space-y-10 py-10">
              <div className="relative">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-2xl transform rotate-3">
                  <Bot className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-card">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-4 max-w-md">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Como o <span className="gradient-brand-text">AI Center</span> pode otimizar seus jogos?</h2>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Sou seu analista de elite. Analiso milhões de dados em segundos para te dar a vantagem matemática definitiva.
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
                    "flex flex-col max-w-[85%] sm:max-w-[75%] space-y-2",
                    msg.role === "user" ? "items-end" : "items-start"
                )}>
                    <div className={cn(
                        "rounded-[2rem] px-6 py-4 text-sm shadow-sm leading-relaxed",
                        msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border/40 rounded-tl-sm text-foreground"
                    )}>
                        {msg.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary/20 prose-pre:border prose-pre:border-border/10 prose-th:bg-primary/5 prose-th:text-primary">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="font-medium">{msg.content}</p>
                        )}
                    </div>
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
              placeholder={isStreaming ? "Aguardando resposta..." : "Digite sua diretriz para a IA..."}
              className="min-h-[60px] max-h-[180px] rounded-3xl border-border/40 bg-background/80 backdrop-blur-sm px-6 py-4 shadow-inner resize-none focus-visible:ring-primary/20"
              disabled={isStreaming}
            />
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
            Tecnologia Titan IA • Cobertura Matemática v7.5
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
