/** Filtros removem bilhetes e podem destruir uma garantia antes comprovada.
 * Reconstrói todos os indicadores a partir dos jogos que realmente restaram. */
import type { ClosingResult } from "../core/types";
import type { ActiveConstraint } from "./types";
import { applyConstraints } from "./ConstraintSolver";
import { validateClosing } from "../validation/ValidationEngine";
import { computeScore } from "../scoring/ScoreEngine";

export function filterClosingResult(result: ClosingResult, constraints: ActiveConstraint[]): ClosingResult {
  if (!constraints.length || !result.games.length) return result;
  const filtered = applyConstraints(result.games, constraints, {
    lottery: result.request.lottery, baseNumbers: result.request.baseNumbers,
  });
  if (!filtered.rejected.length) return result;
  const base = result.request.baseNumbers;
  const indices = new Map(base.map((number, index) => [number, index]));
  // Não descartar silenciosamente dezenas fora da base: o validador rejeita -1.
  const games = filtered.kept;
  const idxGames = games.map(game => game.map(n => indices.get(n) ?? -1));
  const validation = validateClosing(idxGames, base.length,
    result.request.guarantee.hitsInBase, result.request.guarantee.minHits, result.request.seed);
  const score = computeScore({ validation, gameCount: games.length,
    lowerBound: result.lowerBound, elapsedMs: result.elapsedMs,
    baseSize: base.length, pick: result.request.lottery.pick });
  return {
    ...result, games, gameCount: games.length,
    cost: games.length * result.request.lottery.ticketPrice,
    validation, score,
    notes: [...result.notes,
      `Filtros: ${games.length}/${filtered.stats.total} jogos mantidos; garantia e cobertura recalculadas.`,
      ...(games.length === 0 ? ["Nenhum jogo atende aos filtros selecionados."] : []),
    ],
  };
}
