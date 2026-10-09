/**
 * ClosingAdaptivePresets — persiste configurações vencedoras do Pipeline Adaptativo
 * no localStorage, permitindo salvar, aplicar e remover presets por modalidade.
 */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Trash2, Check, Plus, Download, Upload, Copy, Files, Star, Search, StickyNote, X, Link2, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type SortMode = "recent" | "used" | "alpha";
const SORT_KEY = "titan.adaptive.presets.sort";
const SORT_LABEL: Record<SortMode, string> = { recent: "Recentes", used: "Mais usados", alpha: "A–Z" };
import { toast } from "sonner";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}

export interface AdaptivePreset {
  id: string;
  name: string;
  lotteryId: string;
  statWeight: number;
  reduce: boolean;
  refine: boolean;
  runs: number;
  createdAt: number;
  lastUsedAt?: number;
  useCount?: number;
  isDefault?: boolean;
  note?: string;
  meta?: { games?: number; cost?: number; adaptive?: number };
}

const STORAGE_KEY = "titan.adaptive.presets.v1";

function loadAll(): AdaptivePreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(list: AdaptivePreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

interface Props {
  lotteryId: string;
  current: { statWeight: number; reduce: boolean; refine: boolean; runs: number };
  meta?: { games?: number; cost?: number; adaptive?: number };
  onApply: (p: AdaptivePreset) => void;
  onAutoLoadDefault?: (p: AdaptivePreset) => void;
  disabled?: boolean;
}

export function ClosingAdaptivePresets({ lotteryId, current, meta, onApply, onAutoLoadDefault, disabled }: Props) {
  const [presets, setPresets] = useState<AdaptivePreset[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const autoLoadedRef = useRef<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try { return (localStorage.getItem(SORT_KEY) as SortMode) || "recent"; } catch { return "recent"; }
  });
  useEffect(() => { try { localStorage.setItem(SORT_KEY, sortMode); } catch { /* ignore */ } }, [sortMode]);

  const rename = useCallback((id: string, next: string) => {
    const trimmed = next.trim();
    if (!trimmed) { toast.error("Nome vazio."); return; }
    const all = loadAll();
    const updated = all.map(p => p.id === id ? { ...p, name: trimmed } : p);
    saveAll(updated);
    setRenamingId(null);
    setRenameDraft("");
    setPresets(prev => prev.map(p => p.id === id ? { ...p, name: trimmed } : p));
    toast.success("Renomeado.");
  }, []);

  const refresh = useCallback(() => {
    setPresets(
      loadAll()
        .filter(p => p.lotteryId === lotteryId)
        .sort((a, b) => {
          if ((b.isDefault ? 1 : 0) !== (a.isDefault ? 1 : 0)) return (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0);
          if (sortMode === "alpha") return a.name.localeCompare(b.name, "pt-BR");
          if (sortMode === "used") return (b.useCount ?? 0) - (a.useCount ?? 0) || (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt);
          return (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt);
        }),
    );
  }, [lotteryId, sortMode]);

  useEffect(() => { refresh(); }, [refresh]);

  // Carrega automaticamente o preset padrão (uma vez por modalidade)
  useEffect(() => {
    if (!onAutoLoadDefault || autoLoadedRef.current === lotteryId) return;
    const def = loadAll().find(p => p.lotteryId === lotteryId && p.isDefault);
    if (def) {
      autoLoadedRef.current = lotteryId;
      onAutoLoadDefault(def);
    }
  }, [lotteryId, onAutoLoadDefault]);

  const toggleDefault = useCallback((id: string) => {
    const all = loadAll();
    const target = all.find(p => p.id === id);
    if (!target) return;
    const nextDefault = !target.isDefault;
    const updated = all.map(p => {
      if (p.lotteryId !== lotteryId) return p;
      if (p.id === id) return { ...p, isDefault: nextDefault };
      return nextDefault ? { ...p, isDefault: false } : p;
    });
    saveAll(updated);
    refresh();
    toast.success(nextDefault ? `"${target.name}" definido como padrão.` : "Padrão removido.");
  }, [lotteryId, refresh]);

  const save = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Dê um nome ao preset."); return; }
    const all = loadAll();
    const preset: AdaptivePreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      lotteryId,
      ...current,
      meta,
      createdAt: Date.now(),
      useCount: 0,
    };
    const next = [preset, ...all].slice(0, 40);
    saveAll(next);
    refresh();
    setName("");
    setAdding(false);
    toast.success(`Preset "${trimmed}" salvo.`);
  }, [name, lotteryId, current, meta, refresh]);

  const remove = useCallback((id: string) => {
    const next = loadAll().filter(p => p.id !== id);
    saveAll(next);
    refresh();
    toast.success("Preset removido.");
  }, [refresh]);

  const duplicate = useCallback((p: AdaptivePreset) => {
    const all = loadAll();
    const copy: AdaptivePreset = {
      ...p,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${p.name} (cópia)`,
      createdAt: Date.now(),
      lastUsedAt: undefined,
      useCount: 0,
    };
    saveAll([copy, ...all].slice(0, 40));
    refresh();
    toast.success(`Preset duplicado.`);
  }, [refresh]);

  const handleApply = useCallback((p: AdaptivePreset) => {
    const all = loadAll();
    const updated = all.map(x => x.id === p.id
      ? { ...x, lastUsedAt: Date.now(), useCount: (x.useCount ?? 0) + 1 }
      : x);
    saveAll(updated);
    refresh();
    onApply(p);
  }, [onApply, refresh]);

  const saveNote = useCallback((id: string, note: string) => {
    const all = loadAll();
    const trimmed = note.trim();
    const updated = all.map(p => p.id === id ? { ...p, note: trimmed || undefined } : p);
    saveAll(updated);
    refresh();
    setEditingNoteId(null);
    setNoteDraft("");
    toast.success(trimmed ? "Nota salva." : "Nota removida.");
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.note ?? "").toLowerCase().includes(q),
    );
  }, [presets, query]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportPresets = useCallback(() => {
    if (presets.length === 0) { toast.error("Nada para exportar."); return; }
    const payload = {
      kind: "titan.adaptive.presets",
      version: 1,
      lotteryId,
      exportedAt: new Date().toISOString(),
      presets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titan-presets-${lotteryId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${presets.length} preset(s) exportado(s).`);
  }, [presets, lotteryId]);

  const copyPresets = useCallback(async () => {
    if (presets.length === 0) { toast.error("Nada para copiar."); return; }
    try {
      const payload = { kind: "titan.adaptive.presets", version: 1, lotteryId, presets };
      await navigator.clipboard.writeText(JSON.stringify(payload));
      toast.success("Presets copiados para a área de transferência.");
    } catch {
      toast.error("Falha ao copiar.");
    }
  }, [presets, lotteryId]);

  const sharePreset = useCallback(async (p: AdaptivePreset) => {
    try {
      const slim = {
        n: p.name,
        l: p.lotteryId,
        w: p.statWeight,
        rd: p.reduce ? 1 : 0,
        rf: p.refine ? 1 : 0,
        r: p.runs,
        nt: p.note,
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(slim))))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const url = `${window.location.origin}${window.location.pathname}?preset=${encoded}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado — cole para compartilhar.");
    } catch {
      toast.error("Falha ao gerar link.");
    }
  }, []);

  // Detecta preset compartilhado via URL e oferece importação
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("preset");
    if (!raw) return;
    try {
      const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "===".slice((b64.length + 3) % 4);
      const slim = JSON.parse(decodeURIComponent(escape(atob(padded))));
      if (!slim || typeof slim.n !== "string") throw new Error("payload");
      const preset: AdaptivePreset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: slim.n,
        lotteryId: slim.l || lotteryId,
        statWeight: Number(slim.w) || 0,
        reduce: slim.rd === 1,
        refine: slim.rf === 1,
        runs: Number(slim.r) || 1,
        note: slim.nt,
        createdAt: Date.now(),
        useCount: 0,
      };
      toast(`Preset compartilhado "${preset.name}" recebido`, {
        action: {
          label: "Importar",
          onClick: () => {
            const all = loadAll();
            saveAll([preset, ...all].slice(0, 80));
            refresh();
            toast.success("Preset importado.");
          },
        },
        duration: 8000,
      });
    } catch {
      /* payload inválido — ignora silenciosamente */
    } finally {
      params.delete("preset");
      const clean = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (clean ? `?${clean}` : ""));
    }
  }, [lotteryId, refresh]);

  const importPresets = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming: AdaptivePreset[] = Array.isArray(parsed) ? parsed : parsed?.presets;
        if (!Array.isArray(incoming)) throw new Error("Formato inválido");
        const valid = incoming.filter(p =>
          p && typeof p.name === "string" && typeof p.statWeight === "number"
          && typeof p.reduce === "boolean" && typeof p.refine === "boolean"
          && typeof p.runs === "number",
        );
        if (valid.length === 0) throw new Error("Nenhum preset válido");
        const existing = loadAll();
        const existingKeys = new Set(existing.map(p => `${p.lotteryId}|${p.name}`));
        const normalized: AdaptivePreset[] = valid.map(p => ({
          ...p,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          lotteryId: p.lotteryId || lotteryId,
          createdAt: p.createdAt || Date.now(),
        }));
        const merged = [
          ...normalized.filter(p => !existingKeys.has(`${p.lotteryId}|${p.name}`)),
          ...existing,
        ].slice(0, 80);
        saveAll(merged);
        refresh();
        const added = normalized.filter(p => !existingKeys.has(`${p.lotteryId}|${p.name}`)).length;
        toast.success(`${added} preset(s) importado(s)${added < normalized.length ? ` · ${normalized.length - added} duplicado(s) ignorado(s)` : ""}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  }, [lotteryId, refresh]);

  return (
    <div className="rounded-lg border bg-background/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Bookmark className="h-3.5 w-3.5" /> Presets salvos
          {presets.length > 0 && (
            <Badge variant="outline" className="text-[10px]">{presets.length}</Badge>
          )}
        </div>
        {!adding && (
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Arquivo de fechamento a importar"
              accept="application/json,.json"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) importPresets(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => fileInputRef.current?.click()} disabled={disabled} title="Importar de arquivo">
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={exportPresets} disabled={disabled || presets.length === 0} title="Exportar arquivo">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyPresets} disabled={disabled || presets.length === 0} title="Copiar JSON">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {presets.length >= 2 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2" disabled={disabled} title={`Ordenar: ${SORT_LABEL[sortMode]}`}>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["recent", "used", "alpha"] as SortMode[]).map(m => (
                    <DropdownMenuItem key={m} onClick={() => setSortMode(m)} className={sortMode === m ? "font-semibold" : ""}>
                      {sortMode === m && <Check className="mr-1 h-3 w-3" />} {SORT_LABEL[m]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={disabled}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Salvar atual
            </Button>
          </div>
        )}
      </div>

      {adding && (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Ex.: Lotofácil quente 30%"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setAdding(false); }}
            className="h-8 text-xs"
          />
          <Button size="sm" onClick={save}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setName(""); }}>Cancelar</Button>
        </div>
      )}

      {presets.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground">
          Nenhum preset para esta modalidade. Rode o pipeline e salve a configuração vencedora.
        </p>
      )}

      {presets.length >= 4 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome ou nota…"
            className="h-7 pl-7 pr-7 text-xs"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {presets.length > 0 && filtered.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Nenhum preset corresponde a "{query}".</p>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {filtered.map((p, idx) => (
            <div
              key={p.id}
              className={`rounded-md border p-2 text-xs ${
                p.isDefault ? "border-amber-500/40 bg-amber-500/5"
                            : idx === 0 && p.lastUsedAt && !query ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {p.isDefault && <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />}
                    {renamingId === p.id ? (
                      <Input
                        autoFocus
                        value={renameDraft}
                        onChange={e => setRenameDraft(e.target.value)}
                        onBlur={() => { if (renameDraft.trim() && renameDraft.trim() !== p.name) rename(p.id, renameDraft); else { setRenamingId(null); setRenameDraft(""); } }}
                        onKeyDown={e => {
                          if (e.key === "Enter") rename(p.id, renameDraft);
                          if (e.key === "Escape") { setRenamingId(null); setRenameDraft(""); }
                        }}
                        className="h-5 px-1 py-0 text-xs"
                        maxLength={60}
                      />
                    ) : (
                      <span
                        className="truncate font-medium cursor-text hover:text-primary"
                        title="Duplo clique para renomear"
                        onDoubleClick={() => { setRenamingId(p.id); setRenameDraft(p.name); }}
                      >{p.name}</span>
                    )}
                    {p.lastUsedAt && (
                      <Badge variant="outline" className="shrink-0 text-[9px] font-normal px-1 py-0 h-4">
                        {formatRelative(p.lastUsedAt)}
                      </Badge>
                    )}
                    {(p.useCount ?? 0) >= 3 && (
                      <Badge variant="secondary" className="shrink-0 text-[9px] font-normal px-1 py-0 h-4">
                        {p.useCount}×
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5 text-[10px] text-muted-foreground">
                    <span className="font-mono">peso {p.statWeight}%</span>
                    <span>·</span>
                    <span className="font-mono">{p.runs}×</span>
                    {p.reduce && <><span>·</span><span>reduz</span></>}
                    {p.refine && <><span>·</span><span>refino</span></>}
                    {p.meta?.games !== undefined && <><span>·</span><span className="font-mono">{p.meta.games}j</span></>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleApply(p)} disabled={disabled}>
                    Aplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleDefault(p.id)}
                    title={p.isDefault ? "Remover como padrão" : "Definir como padrão"}
                  >
                    <Star className={`h-3.5 w-3.5 ${p.isDefault ? "fill-amber-500 text-amber-500" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (editingNoteId === p.id) { setEditingNoteId(null); setNoteDraft(""); }
                      else { setEditingNoteId(p.id); setNoteDraft(p.note ?? ""); }
                    }}
                    title={p.note ? "Editar nota" : "Adicionar nota"}
                  >
                    <StickyNote className={`h-3.5 w-3.5 ${p.note ? "text-primary" : ""}`} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => duplicate(p)} title="Duplicar">
                    <Files className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => sharePreset(p)} title="Compartilhar por link">
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(p.id)} title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {editingNoteId === p.id ? (
                <div className="mt-2 space-y-1">
                  <Textarea
                    autoFocus
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Escape") { setEditingNoteId(null); setNoteDraft(""); }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(p.id, noteDraft);
                    }}
                    placeholder="Observações sobre este preset…"
                    className="min-h-[52px] text-[11px]"
                    maxLength={280}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">{noteDraft.length}/280 · ⌘/Ctrl+Enter</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setEditingNoteId(null); setNoteDraft(""); }}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => saveNote(p.id, noteDraft)}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : p.note ? (
                <p className="mt-1.5 whitespace-pre-wrap rounded bg-muted/40 p-1.5 text-[10.5px] leading-snug text-muted-foreground">
                  {p.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
