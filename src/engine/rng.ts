/**
 * Random Number Generation — utilitário compartilhado
 * -----------------------------------------------------------------------------
 * O AGENTS.md exige: "Randomized engines accept a seed — tests and audits need
 * reproducible output". Antes cada módulo que precisava de aleatoriedade ou
 * reinventava um PRNG privado ou usava Math.random() puro, o que tornava o
 * resultado impossível de reproduzir e de auditar.
 *
 * Use `makeRng(seed)` em vez de Math.random() em qualquer motor.
 */

/**
 * mulberry32 — PRNG de 32 bits, rápido, com distribuição adequada para
 * amostragem e embaralhamento. Determinístico: mesmo seed → mesma sequência.
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates sobre uma cópia de `arr` usando `rng`. Não muta o original. */
export function shuffleWith<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Embaralhamento com seed. `seed === undefined` cai em Math.random(), o que
 * preserva o comportamento antigo para quem não precisa de reprodutibilidade.
 */
export function shuffleSeeded<T>(arr: T[], seed?: number): T[] {
  return shuffleWith(arr, seed === undefined ? Math.random : makeRng(seed));
}

/** Inteiro em [min, max] inclusivo. */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
