import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import { LOTECA_MATCHES, LOTECA_PRICE, lotecaCombos, lotecaHits, normalizeLoteca, LOTECA_CAIXA_URL, type LotecaPick } from "@/engine/loteca";

interface Jogo { seq: number; casa: string; fora: string; golsCasa: number | null; golsFora: number | null; resultado: LotecaPick | null; data: string; dia: string }
interface Resultado {
  concurso: number; data: string; acumulado: boolean; proximoConcurso: number; dataProximo: string;
  estimativaProximo: number; faixas: { descricao: string; ganhadores: number; premio: number }[]; jogos: Jogo[];
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const OPTS: LotecaPick[] = ["1", "X", "2"];

export default function LotecaPage() {
  const [data, setData] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concurso, setConcurso] = useState("");
  const [picks, setPicks] = useState<LotecaPick[][]>(() => Array.from({ length: LOTECA_MATCHES }, () => []));

  const load = useCallback(async (num?: string) => {
    setLoading(true); setError(null);
    try {
      // 1) portal oficial da Caixa direto do navegador; 2) função de backend como reserva
      try {
        const r = await fetch(num ? `${LOTECA_CAIXA_URL}/${num}` : LOTECA_CAIXA_URL, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`Caixa ${r.status}`);
        setData(normalizeLoteca(await r.json()) as Resultado);
        return;
      } catch { /* tenta a reserva */ }
      const { data: d, error: e } = await supabase.functions.invoke("loteca-results", { body: num ? { concurso: num } : {} });
      if (e) throw e;
      if (d?.error) throw new Error(d.error);
      setData(d as Resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar resultado");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (i: number, o: LotecaPick) => setPicks(prev => prev.map((p, idx) => idx !== i ? p : p.includes(o) ? p.filter(x => x !== o) : [...p, o]));
  const combo = useMemo(() => lotecaCombos(picks), [picks]);
  const complete = picks.every(p => p.length > 0);
  const results = useMemo(() => (data?.jogos ?? []).map(j => j.resultado), [data]);
  const hits = complete && results.length === LOTECA_MATCHES ? lotecaHits(picks, results) : null;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🏈 Loteca</h1>
          <p className="text-sm text-muted-foreground">14 jogos de futebol · palpite 1 (casa), X (empate) ou 2 (fora) · aposta simples {brl(LOTECA_PRICE)}</p>
        </div>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); load(concurso || undefined); }}>
          <Input value={concurso} onChange={e => setConcurso(e.target.value.replace(/\D/g, ""))} placeholder="Nº concurso" className="w-32" inputMode="numeric" />
          <Button type="submit" variant="outline" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
        </form>
      </header>

      {error && <Card className="p-4 border-destructive text-destructive text-sm">Não foi possível carregar o resultado oficial: {error}</Card>}

      {data && !loading && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-semibold">Concurso {data.concurso} · {data.data}</span>
            <span className="text-muted-foreground">Próximo: {data.proximoConcurso} em {data.dataProximo} · Estimativa {brl(data.estimativaProximo)}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {data.faixas.map(f => (
              <div key={f.descricao} className="rounded-md bg-muted/40 p-2 text-sm flex justify-between">
                <span><Trophy className="inline h-3 w-3 mr-1" />{f.descricao}</span>
                <span className="font-mono">{f.ganhadores} × {brl(f.premio)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: LOTECA_MATCHES }, (_, i) => {
            const j = data?.jogos[i];
            return (
              <div key={i} className="flex items-center gap-2 p-2 text-sm">
                <span className="w-6 text-muted-foreground font-mono">{i + 1}</span>
                <span className="flex-1 truncate text-right">{j?.casa ?? "—"}</span>
                <span className="font-mono w-12 text-center">{j && j.golsCasa != null ? `${j.golsCasa}×${j.golsFora}` : "×"}</span>
                <span className="flex-1 truncate">{j?.fora ?? "—"}</span>
                <div className="flex gap-1">
                  {OPTS.map(o => {
                    const on = picks[i].includes(o);
                    const right = j?.resultado === o;
                    return (
                      <button key={o} type="button" aria-pressed={on} aria-label={`Jogo ${i + 1} palpite ${o}`} onClick={() => toggle(i, o)}
                        className={`h-8 w-8 rounded-md border font-mono text-xs transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"} ${right ? "ring-2 ring-accent" : ""}`}>
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><div className="text-muted-foreground">Duplos</div><div className="font-mono text-lg">{combo.duplos}</div></div>
        <div><div className="text-muted-foreground">Triplos</div><div className="font-mono text-lg">{combo.triplos}</div></div>
        <div><div className="text-muted-foreground">Apostas</div><div className="font-mono text-lg">{complete ? combo.apostas : "—"}</div><div className="text-xs text-muted-foreground">2^duplos × 3^triplos</div></div>
        <div><div className="text-muted-foreground">Custo</div><div className="font-mono text-lg">{complete ? brl(combo.custo) : "—"}</div><div className="text-xs text-muted-foreground">{complete ? `${combo.apostas} × ${brl(LOTECA_PRICE)}` : "marque os 14 jogos"}</div></div>
        {hits != null && <div className="col-span-full text-center">Conferência com o concurso {data?.concurso}: <b>{hits} acertos</b> {hits >= 13 ? "🏆" : ""}</div>}
      </Card>
      <p className="text-xs text-muted-foreground">Resultados obtidos do portal oficial da Caixa. Confira os limites de duplos/triplos permitidos no volante antes de apostar.</p>
    </div>
  );
}
