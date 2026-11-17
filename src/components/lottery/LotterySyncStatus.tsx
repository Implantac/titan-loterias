import { useLotteryContext } from "@/contexts/LotteryContext";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LotterySyncStatus() {
  const { syncing, lastSyncAt, syncDraws, syncError, draws } = useLotteryContext();
  const latestDraw = draws[0];

  return (
    <div className="rounded-2xl glass-card p-6 border-primary/20 bg-primary/5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest italic flex items-center gap-2">
              Sincronização de Dados
            </h3>
            <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0 ${syncing ? 'animate-pulse border-amber-500/50 text-amber-500' : 'border-emerald-500/50 text-emerald-500'}`}>
              {syncing ? 'Processando' : 'Sem tempo real'}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Último concurso disponível: #{latestDraw?.concurso || "---"} · data: {latestDraw?.date || "indisponível"}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-border" />
            <div className="flex items-center gap-1">
              {lastSyncAt ? (
                <span>Última tentativa de sincronização: {format(lastSyncAt, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
              ) : (
                <span>Aguardando Sincronização</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncError && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-destructive uppercase tracking-widest mr-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Erro na Atualização
            </div>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncDraws()}
            disabled={syncing}
            className="h-9 px-5 rounded-xl border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar Agora"}
          </Button>
        </div>
      </div>
    </div>
  );
}
