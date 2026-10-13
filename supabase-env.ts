/**
 * Valores PÚBLICOS do backend Supabase.
 *
 * Única fonte de verdade para o fallback de build. `vite.config.ts` e
 * `vitest.config.ts` importam daqui — antes cada um precisaria repetir os
 * valores, e foi exatamente essa duplicação que deixou o bug passar: o
 * fallback existia só no vite.config.ts, então o build de produção funcionava
 * mas a suíte de testes quebrava num clone limpo com "supabaseUrl is required".
 *
 * POR QUE EXISTE FALLBACK
 * O `.env` está no .gitignore (correto: não se versiona configuração). Mas o
 * pipeline de publicação faz o build sem ele, e `createClient()` é chamado no
 * topo do módulo em `integrations/supabase/client.ts` — sem URL ele lança no
 * import e derruba a aplicação inteira. Isso chegou a produção como
 * "supabaseUrl is required".
 *
 * POR QUE NÃO É VAZAMENTO DE SEGREDO
 * Estes três valores são públicos por desenho. A `publishable key` (role
 * `anon`) vai embutida no bundle e é enviada pelo navegador em toda
 * requisição; quem protege os dados é o Row Level Security, não o sigilo da
 * chave. A `service_role key` — essa sim secreta — vive só nas Edge Functions.
 *
 * Override continua funcionando: defina as variáveis `VITE_*` no ambiente do
 * build (ou num `.env` local) e elas têm precedência sobre estes valores.
 */

export const PUBLIC_SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://cghydrrvebnkdugdlcia.supabase.co";

export const PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaHlkcnJ2ZWJua2R1Z2RsY2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDI3NTQsImV4cCI6MjA4ODM3ODc1NH0.XJ308xFYcprD4IEdaY426mYx9JEjiGE4NnwBt6msMog";

export const PUBLIC_SUPABASE_PROJECT_ID =
  process.env.VITE_SUPABASE_PROJECT_ID || "cghydrrvebnkdugdlcia";

/**
 * Bloco `define` pronto para injetar no Vite e no Vitest.
 *
 * Só injeta o que NÃO veio do ambiente: se `VITE_SUPABASE_URL` estiver
 * definido, o Vite já o substitui normalmente e não sobrescrevemos.
 */
export function supabaseDefine(): Record<string, string> {
  const define: Record<string, string> = {};
  if (!process.env.VITE_SUPABASE_URL) {
    define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(PUBLIC_SUPABASE_URL);
  }
  if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }
  if (!process.env.VITE_SUPABASE_PROJECT_ID) {
    define["import.meta.env.VITE_SUPABASE_PROJECT_ID"] = JSON.stringify(PUBLIC_SUPABASE_PROJECT_ID);
  }
  return define;
}
