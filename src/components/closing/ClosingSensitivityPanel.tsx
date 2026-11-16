/** Sensibilidade combinatória do tamanho da base; não projeta jogos nem custo. */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Info } from "lucide-react";
import { calculateGuarantee } from "@/engine/closing";
import type { ClosingResult } from "@/engine/closing";
import { formatNumber } from "@/utils/formatters";

interface Props { result: ClosingResult }

export function ClosingSensitivityPanel({ result }: Props) {
  const { lottery, guarantee, baseNumbers } = result.request;
  const currentBase = baseNumbers.length;
  const rows = useMemo(() => [-3, -2, -1, 0, 1, 2, 3]
    .map(offset => {
      const size = currentBase + offset;
      if (size < lottery.pick || size > lottery.totalNumbers) return null;
      const bounds = calculateGuarantee(size, lottery.pick, guarantee.minHits);
      return { size, offset, ...bounds };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null),
  [currentBase, lottery.pick, lottery.totalNumbers, guarantee.minHits]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2">
        <LineChart className="h-5 w-5 text-primary" /> Sensibilidade combinatória da base
      </CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Alert><Info className="h-4 w-4" /><AlertDescription className="text-xs">
          Variação de até três dezenas em torno da base atual ({currentBase}).
          Os valores abaixo descrevem apenas tamanhos e cenários; não são jogos gerados,
          custo previsto ou prova de que a meta de {guarantee.minHits} acertos será atingida.
        </AlertDescription></Alert>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b"><tr>
              <th className="text-left py-2 px-2">Tamanho da base</th>
              <th className="text-right py-2 px-2">Variação</th>
              <th className="text-right py-2 px-2">Cenários na base</th>
              <th className="text-right py-2 px-2">Jogos candidatos</th>
            </tr></thead>
            <tbody>{rows.map(row => (
              <tr key={row.size} className={row.offset === 0 ? "border-b bg-primary/5 font-semibold" : "border-b"}>
                <td className="py-2 px-2">{row.size} dezenas{row.offset === 0 ? " (atual)" : ""}</td>
                <td className="text-right py-2 px-2 font-mono">{row.offset > 0 ? "+" : ""}{row.offset}</td>
                <td className="text-right py-2 px-2 font-mono">{formatNumber(row.universeSize)}</td>
                <td className="text-right py-2 px-2 font-mono">{formatNumber(row.candidatePoolSize)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Mudar a base muda também a condição de acertos na base. Gere e valide os jogos
          para cada configuração antes de comparar cobertura ou custo efetivo.
        </p>
      </CardContent>
    </Card>
  );
}
