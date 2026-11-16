/**
 * ClosingLibraryPanel — biblioteca consultável de fechamentos clássicos.
 * Aplica um preset no formulário principal via callback (não gera matrizes fixas).
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Sparkles, Search } from "lucide-react";
import {
  CLASSIC_CLOSINGS,
  filterClassicClosings,
  type ClassicClosing,
  type ClassicComplexityFilter,
} from "@/engine/closing/library/classicClosings";
import { cn } from "@/lib/utils";

export interface ClosingLibraryApply {
  minHits: number;
  maxGames: number;
  strategy: ClassicClosing["strategy"];
  baseSize: number;
  preset: ClassicClosing;
}

interface Props {
  lotteryId: string;
  currentBaseSize: number;
  onApply: (opts: ClosingLibraryApply) => void;
}

const COMPLEXITY_COLOR: Record<ClassicClosing["complexity"], string> = {
  baixa: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  media: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  alta: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  extrema: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

export function ClosingLibraryPanel({ lotteryId, currentBaseSize, onApply }: Props) {
  const [complexity, setComplexity] = useState<ClassicComplexityFilter>("todas");
  const [onlyLottery, setOnlyLottery] = useState(true);
  const [maxGames, setMaxGames] = useState<number>(0);
  const [search, setSearch] = useState("");

  const list = useMemo(() =>
    filterClassicClosings(CLASSIC_CLOSINGS, {
      lottery: onlyLottery ? lotteryId : undefined,
      complexity,
      maxGames: maxGames || undefined,
      search: search.trim() || undefined,
    }),
    [lotteryId, onlyLottery, complexity, maxGames, search],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Presets de Fechamento
          <Badge variant="secondary" className="ml-2">{list.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar (ex: 17x8, mega, quina)…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={complexity} onValueChange={v => setComplexity(v as ClassicComplexityFilter)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Complexidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas complexidades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="extrema">Extrema</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number" min={0} placeholder="Máx. jogos (0 = todos)"
            value={maxGames || ""}
            onChange={e => setMaxGames(Math.max(0, Number(e.target.value) || 0))}
            className="h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={onlyLottery ? "default" : "outline"}
            onClick={() => setOnlyLottery(v => !v)}
          >
            {onlyLottery ? "Apenas modalidade atual" : "Todas modalidades"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Base atual: <span className="font-mono">{currentBaseSize}</span> dezenas
          </span>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Nenhum fechamento clássico com esses filtros.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {list.map(c => {
              const compatible = c.applicableLotteries.includes(lotteryId);
              const baseOk = currentBaseSize >= c.base;
              return (
                <div
                  key={c.id}
                  className="rounded-lg border p-3 space-y-2 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-base">{c.code}</span>
                        <Badge className={cn("h-4 text-[10px] px-1.5 capitalize", COMPLEXITY_COLOR[c.complexity])} variant="outline">
                          {c.complexity}
                        </Badge>
                        <Badge variant="secondary" className="h-4 text-[10px] px-1.5">Sem prova prévia</Badge>
                      </div>
                      <p className="text-xs font-medium mt-1">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <div><span className="text-muted-foreground">Base:</span> <span className="font-mono font-semibold">{c.base}</span></div>
                    <div><span className="text-muted-foreground">Meta:</span> <span className="font-mono font-semibold">{c.minHits}</span></div>
                    <div><span className="text-muted-foreground">Jogos:</span> <span className="font-mono font-semibold">{c.games}</span></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Configuração sugerida; valide a cobertura depois de gerar os jogos.</p>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    variant={baseOk && compatible ? "default" : "outline"}
                    disabled={!compatible}
                    onClick={() => onApply({
                      minHits: c.minHits,
                      maxGames: c.games,
                      strategy: c.strategy,
                      baseSize: c.base,
                      preset: c,
                    })}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {!compatible ? "Outra modalidade" : baseOk ? "Aplicar preset" : `Aplicar (precisa ${c.base} dezenas)`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
