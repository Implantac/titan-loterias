import { makeRng } from "../../rng";

/**
 * Utilitários combinatórios do Motor de Fechamentos.
 * Puramente matemático — sem side-effects.
 */

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let num = 1;
  for (let i = 0; i < k; i++) num = (num * (n - i)) / (i + 1);
  return Math.round(num);
}

/** Todas combinações C(n,k) sobre índices [0..n-1]. */
export function combinations(n: number, k: number): number[][] {
  if (k < 0 || k > n) return [];
  const out: number[][] = [];
  const buf = new Array<number>(k);
  const rec = (start: number, depth: number) => {
    if (depth === k) { out.push(buf.slice()); return; }
    const max = n - (k - depth);
    for (let i = start; i <= max; i++) {
      buf[depth] = i;
      rec(i + 1, depth + 1);
    }
  };
  rec(0, 0);
  return out;
}

/** Amostra `size` combinações distintas. Seed opcional; padrão derivado de (n,k,size),
 * permitindo repetir e comparar estratégias sob os mesmos cenários. Não é prova. */
export function sampleCombinations(n: number, k: number, size: number, seed = (Math.imul(n, 73856093) ^ Math.imul(k, 19349663) ^ Math.imul(size, 83492791)) >>> 0): number[][] {
  const total = binomial(n, k);
  if (total <= size) return combinations(n, k);
  const rng = makeRng(seed);
  const seen = new Set<string>();
  const out: number[][] = [];
  let guard = 0;
  while (out.length < size && guard < size * 10) {
    guard++;
    const pool = Array.from({ length: n }, (_, i) => i);
    const combo: number[] = [];
    for (let i = 0; i < k; i++) {
      const j = Math.floor(rng() * pool.length);
      combo.push(pool[j]);
      pool.splice(j, 1);
    }
    combo.sort((a, b) => a - b);
    const key = combo.join(",");
    if (!seen.has(key)) { seen.add(key); out.push(combo); }
  }
  return out;
}

/**
 * Cota inferior de Schönheim para um C(v, k, t) design:
 * mínimo de blocos de tamanho k para cobrir todos t-subconjuntos de um universo v.
 * L(v,k,t) = ceil(v/k * L(v-1,k-1,t-1)); L(v,k,1) = ceil(v/k).
 */
export function schonheimBound(v: number, k: number, t: number): number {
  if (t <= 0 || k <= 0 || v < k || t > k) return 0;
  if (t === 1) return Math.ceil(v / k);
  return Math.ceil((v / k) * schonheimBound(v - 1, k - 1, t - 1));
}

/** Codifica um subconjunto de índices [0..n-1] como string canônica. */
export const encodeSet = (arr: number[]): string => arr.slice().sort((a, b) => a - b).join(",");
