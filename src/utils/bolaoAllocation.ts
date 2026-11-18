/** Distribui centavos por cota na ordem dos participantes; não é regra da Caixa. */
export function allocateBolaoCents(totalCost: number, shares: number[]): number[] | null {
  const cents = Math.round(totalCost * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || Math.abs(totalCost * 100 - cents) > 1e-6 ||
      shares.length === 0 || shares.some(s => !Number.isSafeInteger(s) || s <= 0)) return null;
  const totalShares = shares.reduce((sum, s) => sum + s, 0);
  if (!Number.isSafeInteger(totalShares) || totalShares <= 0 || cents < totalShares) return null;
  const base = Math.floor(cents / totalShares);
  let extra = cents % totalShares;
  return shares.map(count => {
    const add = Math.min(extra, count);
    extra -= add;
    return base * count + add;
  });
}
