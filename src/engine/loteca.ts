// Loteca: 14 jogos, palpite 1 (coluna 1), X (empate), 2 (coluna 2) por jogo.
// Preço = aposta simples × 2^duplos × 3^triplos.
export type LotecaPick = "1" | "X" | "2";
export const LOTECA_MATCHES = 14;
export const LOTECA_PRICE = 4.0;

export function lotecaCombos(picks: LotecaPick[][]) {
  let duplos = 0, triplos = 0;
  for (const p of picks) { if (p.length === 2) duplos++; else if (p.length === 3) triplos++; }
  const apostas = 2 ** duplos * 3 ** triplos;
  return { duplos, triplos, apostas, custo: apostas * LOTECA_PRICE };
}

export function lotecaHits(picks: LotecaPick[][], results: (LotecaPick | null)[]) {
  return results.reduce((n, r, i) => n + (r && picks[i]?.includes(r) ? 1 : 0), 0);
}
