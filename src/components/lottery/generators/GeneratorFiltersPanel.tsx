import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, ChevronUp, X, Flame, Snowflake, RotateCcw } from "lucide-react";
import { LotteryConfig, DrawResult } from "@/data/lotteries";
import { NumberStats } from "@/engine/stats/statistics";
import {
  GenerationFilters,
  DEFAULT_FILTERS,
  computeIdealSumRange,
  computeIdealParity,
} from "@/engine/generation-filters";

interface Props {
  config: LotteryConfig;
  draws: DrawResult[];
  stats: NumberStats[];
  filters: GenerationFilters;
  onFiltersChange: (filters: GenerationFilters) => void;
}

export function GeneratorFiltersPanel({ config, draws, stats, filters, onFiltersChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");

  const idealSum = useMemo(() => computeIdealSumRange(draws, config), [draws, config]);
  const idealParity = useMemo(() => computeIdealParity(draws, config), [draws, config]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.fixedNumbers.length > 0) count++;
    if (filters.excludedNumbers.length > 0) count++;
    if (filters.sumMin !== null || filters.sumMax !== null) count++;
    if (filters.minEven !== null || filters.maxEven !== null) count++;
    if (filters.maxConsecutive !== null) count++;
    if (filters.mustIncludeHot > 0) count++;
    if (filters.mustIncludeCold > 0) count++;
    return count;
  }, [filters]);

  const addFixedNumber = () => {
    const n = parseInt(numberInput);
    if (n >= 1 && n <= config.numbers && !filters.fixedNumbers.includes(n) && !filters.excludedNumbers.includes(n)) {
      if (filters.fixedNumbers.length < config.pick - 1) {
        onFiltersChange({ ...filters, fixedNumbers: [...filters.fixedNumbers, n].sort((a, b) => a - b) });
      }
    }
    setNumberInput("");
  };

  const removeFixedNumber = (n: number) => {
    onFiltersChange({ ...filters, fixedNumbers: filters.fixedNumbers.filter(x => x !== n) });
  };

  const addExcludedNumber = () => {
    const n = parseInt(excludeInput);
    if (n >= 1 && n <= config.numbers && !filters.excludedNumbers.includes(n) && !filters.fixedNumbers.includes(n)) {
      onFiltersChange({ ...filters, excludedNumbers: [...filters.excludedNumbers, n].sort((a, b) => a - b) });
    }
    setExcludeInput("");
  };

  const removeExcludedNumber = (n: number) => {
    onFiltersChange({ ...filters, excludedNumbers: filters.excludedNumbers.filter(x => x !== n) });
  };

  const resetFilters = () => {
    onFiltersChange({ ...DEFAULT_FILTERS });
  };

  const applySumPreset = () => {
    onFiltersChange({ ...filters, sumMin: idealSum.min, sumMax: idealSum.max });
  };

  const applyParityPreset = () => {
    onFiltersChange({ ...filters, minEven: idealParity.minEven, maxEven: idealParity.maxEven });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4 p-4 rounded-lg border border-border/50 bg-muted/20">
        {/* Reset */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs gap-1 text-muted-foreground">
            <RotateCcw className="w-3 h-3" /> Limpar filtros
          </Button>
        </div>

        {/* Fixed Numbers */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Dezenas Obrigatórias</Label>
          <p className="text-[10px] text-muted-foreground">Números que devem estar em todos os jogos gerados</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={config.numbers}
              value={numberInput}
              onChange={e => setNumberInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addFixedNumber()}
              placeholder={`1-${config.numbers}`}
              aria-label="Dezena obrigatória a incluir"
              className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
            />
            <Button size="sm" variant="outline" onClick={addFixedNumber} className="text-xs">
              Adicionar
            </Button>
          </div>
          {filters.fixedNumbers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.fixedNumbers.map(n => (
                <Badge key={n} variant="default" className="gap-1 cursor-pointer text-xs" onClick={() => removeFixedNumber(n)}>
                  {String(n).padStart(2, "0")}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Excluded Numbers */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Dezenas Excluídas</Label>
          <p className="text-[10px] text-muted-foreground">Números que NÃO devem aparecer</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={config.numbers}
              value={excludeInput}
              onChange={e => setExcludeInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addExcludedNumber()}
              aria-label="Dezena a excluir"
              placeholder={`1-${config.numbers}`}
              className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
            />
            <Button size="sm" variant="outline" onClick={addExcludedNumber} className="text-xs">
              Excluir
            </Button>
          </div>
          {filters.excludedNumbers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.excludedNumbers.map(n => (
                <Badge key={n} variant="destructive" className="gap-1 cursor-pointer text-xs" onClick={() => removeExcludedNumber(n)}>
                  {String(n).padStart(2, "0")}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sum Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Faixa de Soma</Label>
            <Button variant="ghost" size="sm" onClick={applySumPreset} className="text-[10px] h-6 text-primary">
              Usar ideal ({idealSum.min}–{idealSum.max})
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.sumMin ?? ""}
              onChange={e => onFiltersChange({ ...filters, sumMin: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Mín"
              aria-label="Soma mínima"
              className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <input
              type="number"
              value={filters.sumMax ?? ""}
              onChange={e => onFiltersChange({ ...filters, sumMax: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Máx"
              aria-label="Soma máxima"
              className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
            />
            <span className="text-[10px] text-muted-foreground">(média: {idealSum.avg})</span>
          </div>
        </div>

        {/* Parity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Paridade (Pares)</Label>
            <Button variant="ghost" size="sm" onClick={applyParityPreset} className="text-[10px] h-6 text-primary">
              Usar ideal ({idealParity.minEven}–{idealParity.maxEven})
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={config.pick}
              value={filters.minEven ?? ""}
              onChange={e => onFiltersChange({ ...filters, minEven: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Mín pares"
              aria-label="Quantidade mínima de dezenas pares"
              className="w-24 px-2 py-1 text-xs rounded border border-border bg-background"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <input
              type="number"
              min={0}
              max={config.pick}
              value={filters.maxEven ?? ""}
              onChange={e => onFiltersChange({ ...filters, maxEven: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Máx pares"
              aria-label="Quantidade máxima de dezenas pares"
              className="w-24 px-2 py-1 text-xs rounded border border-border bg-background"
            />
          </div>
        </div>

        {/* Max Consecutive */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Máx. Sequências Consecutivas</Label>
          <Slider
            value={[filters.maxConsecutive ?? config.pick]}
            onValueChange={v => onFiltersChange({ ...filters, maxConsecutive: v[0] >= config.pick ? null : v[0] })}
            min={0}
            max={config.pick}
            step={1}
          />
          <p className="text-[10px] text-muted-foreground">
            {filters.maxConsecutive !== null ? `Máximo ${filters.maxConsecutive} par(es) consecutivo(s)` : "Sem limite"}
          </p>
        </div>

        {/* Hot/Cold requirements */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" /> Mín. Quentes
            </Label>
            <Slider
              value={[filters.mustIncludeHot]}
              onValueChange={v => onFiltersChange({ ...filters, mustIncludeHot: v[0] })}
              min={0}
              max={Math.min(config.pick, stats.filter(s => s.status === "hot").length)}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">{filters.mustIncludeHot} dezena(s)</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Snowflake className="w-3 h-3 text-blue-400" /> Mín. Frias
            </Label>
            <Slider
              value={[filters.mustIncludeCold]}
              onValueChange={v => onFiltersChange({ ...filters, mustIncludeCold: v[0] })}
              min={0}
              max={Math.min(config.pick, stats.filter(s => s.status === "cold").length)}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">{filters.mustIncludeCold} dezena(s)</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
