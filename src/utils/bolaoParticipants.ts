/** Normaliza cotas locais; não representa limites oficiais de Bolão Caixa. */
export function normalizeShareCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(count) ? Math.min(100, Math.max(1, count)) : 1;
}

export function isRestorableBolaoParticipants(value: unknown): value is Array<{
  id: string; name: string; shares: number; phone?: string; paid?: boolean;
}> {
  return Array.isArray(value) && value.length >= 2 && value.length <= 100 &&
    value.every(p => p !== null && typeof p === "object" &&
      typeof p.id === "string" && p.id.length > 0 && p.id.length <= 100 &&
      typeof p.name === "string" && p.name.length <= 200 &&
      Number.isSafeInteger(p.shares) && p.shares >= 1 && p.shares <= 100 &&
      (p.phone === undefined || (typeof p.phone === "string" && p.phone.length <= 40)) &&
      (p.paid === undefined || typeof p.paid === "boolean")) &&
    new Set(value.map(p => p.id)).size === value.length;
}
