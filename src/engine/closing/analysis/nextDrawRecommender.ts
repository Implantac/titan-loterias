/**
 * nextDrawRecommender — heurística client-side que analisa sorteios recentes
 * e sugere parâmetros para o próximo concurso, sem prever sorteios.
 *
 * Não usa AI Gateway. Combina:
 *   - dezenas quentes (freq alta últimas 30)
 *   - dezenas frias/atrasadas (descrição do passado, sem efeito preditivo)
 *   - repetição típica do último sorteio
 *   - soma alvo balanceada
 */

export interface NextDrawInput {
  totalNumbers: number;
  pick: number;
  recentDraws: Array<{ concurso: number; numbers: number[]; date?: string }>;
  targetBaseSize?: number;
  budget?: number;
  ticketPrice: number;
  riskProfile?: "conservative" | "balanced" | "aggressive";
}

export interface NextDrawRecommendation {
  baseNumbers: number[];
  minHits: number;
  maxGames: number;
  strategy: "greedy" | "genetic" | "simulated_annealing" | "hill_climbing" | "covering_design";
  reasoning: string[];
  hotShare: number;
  coldShare: number;
  overdueShare: number;
  balanceScore: number;
}

export function recommendNextDraw(input: NextDrawInput): NextDrawRecommendation {
  const { totalNumbers, pick, recentDraws, ticketPrice } = input;
  const risk = input.riskProfile ?? "balanced";
  const requested = input.targetBaseSize ?? Math.min(totalNumbers, pick + Math.round(pick * 0.3));
  const targetBaseSize = Math.min(totalNumbers, Math.max(pick, Math.trunc(Number.isFinite(requested) ? requested : pick)));

  const freq = new Map<number, number>();
  const lastSeen = new Map<number, number>();
  for (let i = 1; i <= totalNumbers; i++) { freq.set(i, 0); lastSeen.set(i, recentDraws.length); }
  recentDraws.forEach((d, idx) => {
    for (const n of new Set(d.numbers)) {
      if (!Number.isInteger(n) || n < 1 || n > totalNumbers) continue;
      freq.set(n, (freq.get(n) ?? 0) + 1);
      const prev = lastSeen.get(n) ?? recentDraws.length;
      if (idx < prev) lastSeen.set(n, idx);
    }
  });

  const byFreq = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const byOverdue = [...lastSeen.entries()].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  const hotSlice = risk === "aggressive" ? 0.45 : risk === "balanced" ? 0.35 : 0.25;
  const overdueSlice = risk === "aggressive" ? 0.15 : risk === "balanced" ? 0.20 : 0.25;
  const repeatSlice = risk === "conservative" ? 0.30 : 0.20;

  const hotCount = Math.round(targetBaseSize * hotSlice);
  const overdueCount = Math.round(targetBaseSize * overdueSlice);
  const repeatCount = Math.round(targetBaseSize * repeatSlice);

  const chosen = new Set<number>();

  // 1) top hot
  for (const [n] of byFreq) {
    if (chosen.size >= hotCount) break;
    chosen.add(n);
  }
  // 2) most overdue
  for (const [n] of byOverdue) {
    if ([...chosen].filter(x => byOverdue.slice(0, overdueCount).some(([m]) => m === x)).length >= overdueCount) break;
    chosen.add(n);
    if (chosen.size >= hotCount + overdueCount) break;
  }
  // 3) repetição do último sorteio
  const lastDraw = (recentDraws[0]?.numbers ?? []).filter(n => Number.isInteger(n) && n >= 1 && n <= totalNumbers);
  const lastByFreq = [...lastDraw].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
  for (const n of lastByFreq) {
    if (chosen.size >= hotCount + overdueCount + repeatCount) break;
    chosen.add(n);
  }
  // 4) preenche até targetBaseSize com próximos mais frequentes
  for (const [n] of byFreq) {
    if (chosen.size >= targetBaseSize) break;
    chosen.add(n);
  }

  const baseNumbers = [...chosen].slice(0, targetBaseSize).sort((a, b) => a - b);

  // Calcula shares
  const hotSet = new Set(byFreq.slice(0, Math.round(totalNumbers * 0.25)).map(([n]) => n));
  const coldSet = new Set(byFreq.slice(-Math.round(totalNumbers * 0.25)).map(([n]) => n));
  const overdueSet = new Set(byOverdue.slice(0, Math.round(totalNumbers * 0.2)).map(([n]) => n));
  const hotShare = baseNumbers.filter(n => hotSet.has(n)).length / baseNumbers.length;
  const coldShare = baseNumbers.filter(n => coldSet.has(n)).length / baseNumbers.length;
  const overdueShare = baseNumbers.filter(n => overdueSet.has(n)).length / baseNumbers.length;

  // Balance score
  const sum = baseNumbers.reduce((a, b) => a + b, 0);
  const idealSum = ((totalNumbers + 1) * baseNumbers.length) / 2;
  const balanceScore = Math.max(0, 100 - Math.abs(sum - idealSum) / idealSum * 100);

  // Estratégia + budget
  const strategy: NextDrawRecommendation["strategy"] =
    risk === "conservative" ? "greedy"
      : risk === "aggressive" ? "genetic"
        : "simulated_annealing";

  const minHits = risk === "conservative" ? pick - 2 : risk === "aggressive" ? pick - 1 : pick - 1;
  const budget = input.budget;
  const maxGames = Number.isFinite(budget) && budget !== undefined && budget > 0 && ticketPrice > 0
    ? Math.max(0, Math.floor(budget / ticketPrice)) : (risk === "conservative" ? 50 : risk === "aggressive" ? 200 : 100);

  const reasoning: string[] = [
    `Base ${baseNumbers.length} dezenas com perfil ${risk}: ${Math.round(hotShare * 100)}% quentes, ${Math.round(overdueShare * 100)}% atrasadas.`,
    `Repetição do último concurso (#${recentDraws[0]?.concurso ?? "?"}): ${baseNumbers.filter(n => lastDraw.includes(n)).length} dezenas mantidas.`,
    `Soma da base ${sum} próxima do ideal ${Math.round(idealSum)} (score ${Math.round(balanceScore)}/100).`,
    `Meta condicional de ${minHits} acertos (a validar) com estratégia ${strategy}; teto de ${maxGames} jogos (${(maxGames * ticketPrice).toFixed(2)} R$ pelo preço informado).`,
    coldShare > 0.25
      ? `Alta proporção histórica de dezenas frias (${Math.round(coldShare * 100)}%); isso não prevê resultados.`
      : `Baixa proporção histórica de dezenas frias (${Math.round(coldShare * 100)}%); isso não prevê resultados.`,
  ];

  return {
    baseNumbers,
    minHits,
    maxGames,
    strategy,
    reasoning,
    hotShare,
    coldShare,
    overdueShare,
    balanceScore: Math.round(balanceScore),
  };
}
