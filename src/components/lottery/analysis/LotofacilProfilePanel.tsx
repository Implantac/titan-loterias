import { useMemo } from "react";
import type { DrawResult } from "@/data/lotteries";
import { buildLotofacilProfile } from "@/engine/lotofacil/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const f1 = (v: number) => v.toFixed(1);

export function LotofacilProfilePanel({ draws }: { draws: DrawResult[] }) {
  const profile = useMemo(() => {
    try { return buildLotofacilProfile(draws, 8); } catch { return null; }
  }, [draws]);

  if (!profile || profile.sampleSize < 30) {
    return (
      <Card><CardContent className="p-4 text-sm text-muted-foreground">
        Perfil histórico indisponível: são necessários pelo menos 30 concursos.
      </CardContent></Card>
    );
  }

  const parity = Object.entries(profile.parity).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const delayed = [...profile.numbers].sort((a, b) => b.currentDelay - a.currentDelay).slice(0, 5);

  const Band = ({ label, d }: { label: string; d: typeof profile.sum }) => (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg">{f1(d.mean)} <span className="text-xs text-muted-foreground">± {f1(d.stdDev)}</span></p>
      <p className="font-mono text-xs text-muted-foreground">P10 {f1(d.p10)} · P50 {f1(d.p50)} · P90 {f1(d.p90)}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Perfil histórico da Lotofácil</CardTitle>
        <p className="text-xs text-muted-foreground">
          Descrição de {profile.sampleSize} concursos. Não é previsão: o sorteio seguinte é independente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Band label="Soma das 15 dezenas" d={profile.sum} />
          <Band label="Repetidas do concurso anterior" d={profile.repeat} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-medium">Pares/Ímpares mais comuns</p>
            {parity.map(([k, c]) => (
              <div key={k} className="flex justify-between font-mono text-xs">
                <span>{k}</span><span>{((c / profile.sampleSize) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Maior atraso atual</p>
            {delayed.map(n => (
              <div key={n.number} className="flex justify-between font-mono text-xs">
                <span>{String(n.number).padStart(2, "0")}</span>
                <span>{n.currentDelay} (média {f1(n.meanDelay)}, máx {n.maxDelay})</span>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Pares acima do esperado (lift)</p>
            {profile.topPairs.slice(0, 5).map(p => (
              <div key={`${p.a}-${p.b}`} className="flex justify-between font-mono text-xs">
                <span>{p.a}-{p.b}</span>
                <span>{p.observed}/{f1(p.expected)} · {p.lift.toFixed(2)}×</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Lift = vezes que o par saiu ÷ vezes esperadas pelo acaso. Associação observada não indica causa.
        </p>
      </CardContent>
    </Card>
  );
}
