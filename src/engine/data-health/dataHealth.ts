/**
 * Data Health Check — verifica a integridade da base de concursos de uma loteria.
 * Função pura e determinística: mesma entrada => mesmo relatório.
 */
import type { DrawResult, LotteryConfig } from "@/data/lotteries";

export type HealthStatus = "ok" | "warning" | "critical";

export interface DataHealthIssue {
  kind: "gap" | "duplicate" | "invalid_count" | "out_of_range" | "repeated_number" | "missing_date" | "stale";
  concurso?: number;
  detail: string;
}

export interface DataHealthReport {
  status: HealthStatus;
  totalDraws: number;
  firstContest: number | null;
  lastContest: number | null;
  lastDate: string | null;
  missingContests: number[];
  duplicateContests: number[];
  invalidDraws: number;
  daysSinceLastDraw: number | null;
  issues: DataHealthIssue[];
  /** Componentes que compõem o status — exibidos ao usuário. */
  checks: { label: string; passed: boolean; value: string }[];
}

/** Loterias cujo formato de números não segue "pick dezenas de 1..numbers". */
const NON_STANDARD = new Set(["federal", "loteca", "supersete"]);

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  const d = br ? new Date(+br[3], +br[2] - 1, +br[1]) : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function computeDataHealth(
  draws: DrawResult[],
  lottery: LotteryConfig,
  now: Date = new Date(),
  staleDays = 10,
): DataHealthReport {
  const issues: DataHealthIssue[] = [];
  const seen = new Map<number, number>();
  let invalidDraws = 0;
  const strict = !NON_STANDARD.has(lottery.id);

  for (const d of draws ?? []) {
    seen.set(d.concurso, (seen.get(d.concurso) ?? 0) + 1);
    const nums = Array.isArray(d.numbers) ? d.numbers : [];
    let bad = false;
    if (strict) {
      // Dupla Sena traz 2 sorteios (12 dezenas); +Milionária pode trazer trevos.
      const okCount = nums.length === lottery.pick || nums.length === lottery.pick * 2 || nums.length === lottery.pick + 2;
      if (!okCount) {
        issues.push({ kind: "invalid_count", concurso: d.concurso, detail: `${nums.length} dezenas (esperado ${lottery.pick})` });
        bad = true;
      }
      const main = nums.slice(0, lottery.pick);
      const minN = lottery.id === "lotomania" ? 0 : 1;
      const maxN = lottery.id === "lotomania" ? 99 : lottery.numbers;
      if (main.some((n) => !Number.isInteger(n) || n < minN || n > maxN)) {
        issues.push({ kind: "out_of_range", concurso: d.concurso, detail: `Dezena fora de ${minN}–${maxN}` });
        bad = true;
      }
      if (new Set(main).size !== main.length) {
        issues.push({ kind: "repeated_number", concurso: d.concurso, detail: "Dezena repetida no mesmo sorteio" });
        bad = true;
      }
    }
    if (!parseDate(d.date)) {
      issues.push({ kind: "missing_date", concurso: d.concurso, detail: "Data ausente ou inválida" });
    }
    if (bad) invalidDraws++;
  }

  const contests = [...seen.keys()].sort((a, b) => a - b);
  const duplicateContests = [...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k).sort((a, b) => a - b);
  for (const c of duplicateContests) issues.push({ kind: "duplicate", concurso: c, detail: "Concurso duplicado" });

  const missingContests: number[] = [];
  for (let i = 1; i < contests.length; i++) {
    for (let c = contests[i - 1] + 1; c < contests[i]; c++) {
      missingContests.push(c);
      if (missingContests.length >= 500) break;
    }
  }
  if (missingContests.length) {
    issues.push({ kind: "gap", detail: `${missingContests.length} concurso(s) faltando na sequência` });
  }

  const lastContest = contests.length ? contests[contests.length - 1] : null;
  const lastDraw = draws.find((d) => d.concurso === lastContest);
  const lastDateObj = lastDraw ? parseDate(lastDraw.date) : null;
  const daysSinceLastDraw = lastDateObj ? Math.floor((now.getTime() - lastDateObj.getTime()) / 86_400_000) : null;
  const stale = daysSinceLastDraw !== null && daysSinceLastDraw > staleDays;
  if (stale) issues.push({ kind: "stale", detail: `Último concurso há ${daysSinceLastDraw} dias` });

  const critical = contests.length === 0 || invalidDraws > 0 || duplicateContests.length > 0;
  const warning = missingContests.length > 0 || stale || issues.some((i) => i.kind === "missing_date");
  const status: HealthStatus = critical ? "critical" : warning ? "warning" : "ok";

  return {
    status,
    totalDraws: contests.length,
    firstContest: contests[0] ?? null,
    lastContest,
    lastDate: lastDraw?.date ?? null,
    missingContests,
    duplicateContests,
    invalidDraws,
    daysSinceLastDraw,
    issues,
    checks: [
      { label: "Concursos carregados", passed: contests.length > 0, value: String(contests.length) },
      { label: "Sequência sem lacunas", passed: missingContests.length === 0, value: `${missingContests.length} faltando` },
      { label: "Sem duplicados", passed: duplicateContests.length === 0, value: `${duplicateContests.length}` },
      { label: "Dezenas válidas", passed: invalidDraws === 0, value: strict ? `${invalidDraws} inválido(s)` : "formato próprio" },
      { label: "Base atualizada", passed: !stale, value: daysSinceLastDraw === null ? "sem data" : `${daysSinceLastDraw} dia(s)` },
    ],
  };
}
