import type { DrawResult } from "@/data/lotteries";

/** Maior número de concurso disponível, independentemente da ordem do cache/importação. */
export function latestAvailableDraw(draws: DrawResult[]): DrawResult | null {
  return draws.reduce<DrawResult | null>((latest, draw) =>
    Number.isSafeInteger(draw.concurso) && draw.concurso > 0 &&
    (!latest || draw.concurso > latest.concurso) ? draw : latest, null);
}
