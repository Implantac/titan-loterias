import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Bookmark } from "lucide-react";
import { useSavedBets } from "@/hooks/useSavedBets";

/** Últimos jogos salvos do usuário na loteria atual (dados reais, RLS por dono). */
export function RecentActivityCard({ lotteryId }: { lotteryId: string }) {
  const navigate = useNavigate();
  const { savedBets, loading, error } = useSavedBets(lotteryId);
  const recent = savedBets.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" /> Seus jogos recentes
        </CardTitle>
        <span className="text-xs text-muted-foreground">{loading ? "…" : `${savedBets.length} salvos`}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Carregando…</p>
        ) : error ? (
          <p className="text-xs text-destructive flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Não foi possível carregar seus jogos.</p>
        ) : recent.length === 0 ? (
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Você ainda não salvou jogos nesta loteria.</p>
            <Button size="sm" onClick={() => navigate("/gerador")}>Gerar meus primeiros jogos</Button>
          </div>
        ) : (
          <>
            {recent.map((b) => (
              <div key={b.id} className="rounded-md border border-border p-2">
                <p className="font-mono text-xs text-foreground break-words">
                  {[...b.numbers].sort((x, y) => x - y).map((n) => String(n).padStart(2, "0")).join(" ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(b.created_at).toLocaleDateString("pt-BR")}
                  {b.strategy ? ` · ${b.strategy}` : ""}
                  {b.score != null ? ` · aderência ${Math.round(b.score)}/100` : ""}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/jogos-salvos")}>Ver todos</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
