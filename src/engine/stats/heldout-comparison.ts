import type { DrawResult } from "@/data/lotteries";

/** Comparação de ACERTOS, não de prêmios/ROI, com mesmo número de jogos simples.
 * Os jogos devem ter sido gerados somente com concursos anteriores aos de teste. */
/** Reserva os concursos mais recentes; nenhuma observação de teste entra no treino. */
export function splitHeldoutDraws(draws: DrawResult[], window: number): {
  training: DrawResult[]; test: DrawResult[];
} {
  if (!Number.isInteger(window) || window < 1 || draws.length < window + 20 ||
      new Set(draws.map(d => d.concurso)).size !== draws.length) {
    throw new Error("Exija concursos únicos e ao menos 20 anteriores à janela de teste.");
  }
  const ordered = [...draws].sort((a, b) => b.concurso - a.concurso);
  return { test: ordered.slice(0, window), training: ordered.slice(window) };
}

export interface HeldoutComparison {
  contests: number;
  gamesPerStrategy: number;
  targetHits: number;
  generated: { targetDraws: number; meanBestHits: number };
  random: { targetDraws: number; meanBestHits: number };
}

export function compareHeldoutHits(
  generated: number[][], random: number[][], draws: { numbers: number[] }[],
  targetHits: number,
  pick: number,
): HeldoutComparison {
  if (!generated.length || generated.length !== random.length || !draws.length ||
      !Number.isInteger(targetHits) || targetHits < 1 ||
      !Number.isInteger(pick) || pick < 1 || targetHits > pick ||
      [...generated, ...random].some(game => game.length !== pick ||
        new Set(game).size !== game.length)) {
    throw new Error("Compare a mesma quantidade de jogos simples válidos em concursos separados.");
  }
  const evaluate = (games: number[][]) => {
    let targetDraws = 0;
    let totalBest = 0;
    for (const draw of draws) {
      const drawn = new Set(draw.numbers);
      const best = Math.max(...games.map(game => game.filter(n => drawn.has(n)).length));
      totalBest += best;
      if (best >= targetHits) targetDraws++;
    }
    return { targetDraws, meanBestHits: totalBest / draws.length };
  };
  return { contests: draws.length, gamesPerStrategy: generated.length, targetHits,
    generated: evaluate(generated), random: evaluate(random) };
}
