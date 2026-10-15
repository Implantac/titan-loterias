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

export const LOTECA_CAIXA_URL = "https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca";

// Normaliza o JSON oficial da Caixa (mesmo formato usado pela função de backend).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeLoteca(d: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jogos = (d.listaResultadoEquipeEsportiva ?? []).map((j: any) => {
    const g1 = j.nuGolEquipeUm, g2 = j.nuGolEquipeDois;
    const resultado: LotecaPick | null = g1 == null || g2 == null ? null : g1 > g2 ? "1" : g1 < g2 ? "2" : "X";
    return { seq: j.nuSequencial, casa: j.nomeEquipeUm, fora: j.nomeEquipeDois, golsCasa: g1, golsFora: g2, resultado, data: j.dtJogo, dia: j.diaSemana };
  }).sort((a: { seq: number }, b: { seq: number }) => a.seq - b.seq);
  return {
    concurso: d.numero, data: d.dataApuracao, acumulado: d.acumulado,
    proximoConcurso: d.numeroConcursoProximo, dataProximo: d.dataProximoConcurso,
    estimativaProximo: d.valorEstimadoProximoConcurso,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    faixas: (d.listaRateioPremio ?? []).map((f: any) => ({ descricao: f.descricaoFaixa, ganhadores: f.numeroDeGanhadores, premio: f.valorPremio })),
    jogos,
  };
}
