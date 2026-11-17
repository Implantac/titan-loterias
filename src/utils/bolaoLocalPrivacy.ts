/** Remove dados pessoais de versões antigas do bolão armazenados neste navegador. */
export function scrubLegacyBolaoStorage(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): void {
  for (const key of ["titan_bolao_pix_key", "titan_bolao_pix_name", "titan_bolao_pix_city"]) {
    storage.removeItem(key);
  }
  const key = "titan_bolao_draft_v1";
  const saved = storage.getItem(key);
  if (!saved) return;
  try {
    const value = JSON.parse(saved);
    if (value && typeof value.lotteryId === "string" && Array.isArray(value.games) &&
        value.games.every((game: unknown) => Array.isArray(game) && game.every(Number.isSafeInteger))) {
      storage.setItem(key, JSON.stringify({ lotteryId: value.lotteryId, games: value.games }));
    } else {
      storage.removeItem(key);
    }
  } catch {
    storage.removeItem(key);
  }
}
