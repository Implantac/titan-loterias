/** Exportação local de jogos planejados para conferência manual. Não registra aposta. */

/** Linhas de dezenas separadas por espaço; compatibilidade com software externo não verificada. */
export function formatGamesToCologaTxt(games: number[][]): string {
  return games
    .map((game) =>
      [...game]
        .sort((a, b) => a - b)
        .map((num) => String(num).padStart(2, "0"))
        .join(" ")
    )
    .join("\n");
}

/** Baixa texto localmente, sem enviar jogos para terceiros. */
export function downloadGamesAsTxt(filename: string, games: number[][]): void {
  const content = formatGamesToCologaTxt(games);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
