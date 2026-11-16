/** Um QR único por cota só representa o total se a divisão fechar em centavos. */
export function hasExactShareAmount(totalCost: number, totalShares: number): boolean {
  if (!Number.isFinite(totalCost) || !Number.isSafeInteger(totalShares) || totalShares <= 0) return false;
  const cents = totalCost * 100;
  if (!Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 1e-6) return false;
  return cents > 0 && Math.round(cents) % totalShares === 0;
}
