/**
 * Parser centralizado de datas de concursos.
 *
 * MOTIVO: `lottery_draws.draw_date` é armazenado como TEXT no formato brasileiro
 * `DD/MM/AAAA` (ex.: "06/02/2019"). Passar essa string direto para `new Date()`
 * faz o JavaScript interpretar como `MM/DD/AAAA`:
 *   - "06/02/2019" vira 2 de junho (dia e mês trocados)
 *   - "25/12/2024" vira `Invalid Date` (não existe mês 25) e o registro é
 *     silenciosamente descartado por qualquer filtro de período.
 * Em varredura de 372 combinações dia/mês, 228 (61,3%) viravam `Invalid Date`.
 *
 * Toda leitura de data de concurso DEVE passar por aqui. Nunca use
 * `new Date(draw.date)` diretamente.
 */

const ISO_LIKE = /^(\d{4})-(\d{2})-(\d{2})/;
const BR_LIKE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Converte uma data de concurso em `Date` local (meia-noite), ou `null` quando
 * a entrada é vazia/inválida. Aceita `DD/MM/AAAA` (formato do banco) e ISO.
 */
export function parseDrawDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  let year: number;
  let month: number; // 1-12
  let day: number;

  const br = BR_LIKE.exec(value);
  if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]);
  } else {
    const iso = ISO_LIKE.exec(value);
    if (!iso) {
      // Último recurso: deixa o runtime decidir. Melhor que falhar silenciosamente
      // para formatos que possam aparecer em dados importados.
      const fallback = new Date(value);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Protege contra rollover (ex.: 31/02 -> 03/03).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** `true` quando a data existe e é válida. */
export function hasValidDrawDate(raw: string | null | undefined): boolean {
  return parseDrawDate(raw) !== null;
}

/**
 * Formata para exibição em pt-BR a partir da string crua do banco.
 * Retorna `""` quando a data é inválida (evita renderizar "Invalid Date").
 */
export function formatDrawDate(
  raw: string | null | undefined,
  locale = "pt-BR"
): string {
  const date = parseDrawDate(raw);
  if (!date) return "";
  return date.toLocaleDateString(locale);
}

/**
 * Ordenação cronológica correta de datas vindas como TEXT `DD/MM/AAAA`.
 * `ORDER BY draw_date` no banco ordena lexicograficamente e retorna ordem errada
 * (ex.: 31/12/2024 antes de 31/12/2022). Use isto no cliente.
 */
export function compareDrawDates(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const da = parseDrawDate(a)?.getTime() ?? 0;
  const db = parseDrawDate(b)?.getTime() ?? 0;
  return da - db;
}
