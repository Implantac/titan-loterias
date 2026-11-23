// Only simple plain-dozen games can be compared with saved_bets.numbers.
// This is a numerical comparison, not proof of a registered ticket or prize.
export const SIMPLE_RESULT_RULES = {
  megasena: { pick: 6, min: 1, max: 60, alertMin: 4, name: "Mega-Sena" },
  lotofacil: { pick: 15, min: 1, max: 25, alertMin: 11, name: "Lotofácil" },
  quina: { pick: 5, min: 1, max: 80, alertMin: 2, name: "Quina" },
} as const;

export type SimpleResultLottery = keyof typeof SIMPLE_RESULT_RULES;
export function isSimpleResultLottery(value: unknown): value is SimpleResultLottery {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SIMPLE_RESULT_RULES, value);
}

export function countSavedGameMatches(lottery: SimpleResultLottery, saved: unknown, drawn: unknown): number | null {
  const rule = SIMPLE_RESULT_RULES[lottery];
  if (!Array.isArray(saved) || saved.length !== rule.pick || new Set(saved).size !== rule.pick ||
      !saved.every(n => Number.isInteger(n) && n >= rule.min && n <= rule.max) ||
      !Array.isArray(drawn) || drawn.length !== rule.pick || new Set(drawn).size !== rule.pick ||
      !drawn.every(n => Number.isInteger(n) && n >= rule.min && n <= rule.max)) return null;
  const drawSet = new Set<number>(drawn);
  return saved.filter(n => drawSet.has(n)).length;
}
