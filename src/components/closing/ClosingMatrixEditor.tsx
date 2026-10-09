/**
 * ClosingMatrixEditor — editor visual de matriz de fechamento.
 * Permite importar (CSV/TXT/JSON/XML/XLSX), editar células, duplicar/remover
 * linhas, exportar em qualquer formato e persistir uma versão em
 * `closing_history` (com `parent_id`, `version`, `source`).
 */

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileEdit, Upload, Download, Plus, Copy, Trash2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  parseClosingFile,
  serializeClosingFile,
  downloadBlob,
  type ClosingFileFormat,
} from "@/engine/closing/io/parsers";
import type { ClosingMatrix } from "@/engine/closing/io/ClosingMatrixSchema";
import { validateClosing } from "@/engine/closing";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  lotteryId: string;
  lotteryName: string;
  pick: number;
  totalNumbers: number;
  initialGames?: number[][];
  initialBase?: number[];
}

const EXPORT_FORMATS: ClosingFileFormat[] = ["csv", "txt", "json", "xml", "xlsx"];

export function ClosingMatrixEditor({
  lotteryId, lotteryName, pick, totalNumbers, initialGames, initialBase,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [games, setGames] = useState<number[][]>(initialGames ?? []);
  const [base, setBase] = useState<number[]>(initialBase ?? []);
  const [format, setFormat] = useState<ClosingFileFormat>("csv");
  const [saving, setSaving] = useState(false);

  const totalCost = games.length * 3; // preço-base aproximado
  const invalidGames = games.filter(g => g.length !== pick).length;

  const buildMatrix = (): ClosingMatrix => ({
    lotteryId, lotteryName, pick, totalNumbers,
    baseNumbers: base.length ? base : [...new Set(games.flat())].sort((a, b) => a - b),
    games,
    source: "editor",
  });

  const handleImport = async (file: File) => {
    try {
      const m = await parseClosingFile(file, { lotteryId, lotteryName, pick, totalNumbers, source: "import" });
      setGames(m.games);
      setBase(m.baseNumbers);
      toast.success(`Importados ${m.games.length} jogos de ${file.name}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    }
  };

  const handleExport = async () => {
    if (games.length === 0) { toast.error("Nenhum jogo para exportar."); return; }
    try {
      const { blob, filename } = await serializeClosingFile(buildMatrix(), format);
      downloadBlob(blob, filename);
      toast.success(`Exportado ${filename}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    }
  };

  const updateCell = (row: number, col: number, val: string) => {
    const n = Math.max(0, Math.min(totalNumbers, Number(val.replace(/[^\d]/g, "")) || 0));
    setGames(prev => {
      const next = prev.map(g => g.slice());
      next[row][col] = n;
      return next;
    });
  };

  const addRow = () => setGames(prev => [...prev, Array(pick).fill(0)]);
  const duplicateRow = (i: number) => setGames(prev => {
    const c = [...prev]; c.splice(i + 1, 0, [...prev[i]]); return c;
  });
  const removeRow = (i: number) => setGames(prev => prev.filter((_, k) => k !== i));

  const validate = () => {
    const activeBase = base.length ? base : [...new Set(games.flat())].sort((a, b) => a - b);
    if (activeBase.length < pick) {
      toast.error(`Base tem ${activeBase.length} dezenas — mínimo ${pick}.`);
      return;
    }
    const idxGames = games.map(g => g.map(n => activeBase.indexOf(n)).filter(x => x >= 0));
    const bad = idxGames.filter(g => g.length !== pick).length;
    if (bad > 0) {
      toast.warning(`${bad} jogos com números fora da base — validação parcial.`);
    }
    const v = validateClosing(idxGames, activeBase.length, pick, pick);
    toast.info(`Validação: garantia real ${v.guaranteedHits}, cobertura ${v.coveragePercent.toFixed(1)}%.`);
  };

  const persist = async () => {
    if (games.length === 0) { toast.error("Nenhum jogo para salvar."); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const m = buildMatrix();
      const { error } = await supabase.from("closing_history").insert({
        user_id: user.id,
        lottery_id: lotteryId,
        lottery_name: lotteryName,
        strategy: "editor",
        base_numbers: m.baseNumbers,
        min_hits: pick - 1,
        max_games: games.length,
        game_count: games.length,
        cost: totalCost,
        games: m.games as unknown as never,
        validation: {} as never,
        score: {} as never,
        source: "editor",
        version: 1,
        notes: [`Editado manualmente (${games.length} jogos).`],
      });
      if (error) throw error;
      toast.success("Fechamento salvo em Meus Jogos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <FileEdit className="h-5 w-5" />
          Editor Visual de Matriz
          <Badge variant="secondary">{games.length} jogos</Badge>
          {invalidGames > 0 && (
            <Badge variant="destructive">{invalidGames} incompletos</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef} type="file" accept=".csv,.txt,.json,.xml,.xlsx"
              aria-label="Arquivo de matriz a importar"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Novo jogo
          </Button>
          <Button size="sm" variant="outline" onClick={validate} disabled={games.length === 0}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Validar
          </Button>
          <Button size="sm" variant="default" onClick={persist} disabled={saving || games.length === 0}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
          <div className="flex items-center gap-1 ml-auto">
            <Select value={format} onValueChange={v => setFormat(v as ClosingFileFormat)}>
              <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map(f => (
                  <SelectItem key={f} value={f}>.{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={games.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
            Importe um arquivo (.csv, .txt, .json, .xml, .xlsx) ou clique em "Novo jogo".
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr>
                  <th className="text-left px-2 py-1.5 w-10">#</th>
                  {Array.from({ length: pick }).map((_, i) => (
                    <th key={i} className="px-1 py-1.5 text-center font-mono">{i + 1}</th>
                  ))}
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {games.map((g, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30">
                    <td className="px-2 py-1 text-muted-foreground font-mono">{i + 1}</td>
                    {Array.from({ length: pick }).map((_, c) => (
                      <td key={c} className="px-0.5 py-0.5">
                        <Input
                          value={g[c] ? g[c].toString().padStart(2, "0") : ""}
                          onChange={e => updateCell(i, c, e.target.value)}
                          className="h-7 text-center font-mono text-xs px-1"
                          inputMode="numeric"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 whitespace-nowrap">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => duplicateRow(i)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeRow(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
