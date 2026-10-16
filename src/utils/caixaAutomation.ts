/**
 * Titan Loterias — Automação e Exportação para Loterias Caixa & Cologa
 *
 * Utilitários para:
 * 1. Exportação em formato TXT padrão Cologa / Lotéricas (espaço-delimitado, 2 dígitos)
 * 2. Script e Bookmarklet de Preenchimento Automático para o portal Loterias Online da Caixa (loteriasonline.caixa.gov.br)
 * 3. Formatação para comprovantes e relatórios de aposta
 */

export interface ExportGameOptions {
  lotteryId: string;
  lotteryName: string;
  games: number[][];
  concurso?: number;
}

/**
 * Formata os jogos para o padrão universal Cologa / Softwares Lotéricos.
 * Exemplo de linha: "01 03 05 07 10 12 13 14 16 18 19 21 22 24 25"
 */
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

/**
 * Faz o download imediato de um arquivo .txt no navegador.
 */
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

/**
 * Gera o script JavaScript que pode ser colado no Console ou executado via Bookmarklet
 * na página de apostas do site oficial da Caixa (https://www.loteriasonline.caixa.gov.br).
 *
 * O script:
 * 1. Localiza os seletores de números no volante digital da Caixa.
 * 2. Clica nas dezenas do jogo atual.
 * 3. Clica no botão "Colocar no Carrinho".
 * 4. Aguarda a confirmação e repete para todos os jogos da lista.
 */
export function generateCaixaAutomationScript(games: number[][], lotteryName = "Loteria"): string {
  const gamesJson = JSON.stringify(
    games.map((g) => [...g].sort((a, b) => a - b))
  );

  return `
/**
 * ⚡ TITAN LOTERIAS — Preenchedor Automático para Loterias Online da Caixa
 * Modalidade: ${lotteryName} | Total de Jogos: ${games.length}
 * Como usar:
 * 1. Abra https://www.loteriasonline.caixa.gov.br e selecione a loteria desejada.
 * 2. Abra o Console do Navegador (F12 -> Console) ou execute como Bookmarklet.
 * 3. Cole este código e aperte Enter. Seus jogos serão adicionados ao carrinho!
 */
(async function() {
  const games = ${gamesJson};
  console.log("⚡ Titan Loterias: Iniciando preenchimento de " + games.length + " jogos...");

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function findNumberElement(num) {
    const padded = String(num).padStart(2, "0");
    const raw = String(num);

    // Seletores comuns no portal Caixa
    const candidates = Array.from(document.querySelectorAll("a, button, div, span"));
    return candidates.find(el => {
      const text = el.innerText?.trim();
      const aria = el.getAttribute("aria-label")?.trim();
      const val = el.getAttribute("data-numero") || el.getAttribute("value");
      return text === padded || text === raw || aria === padded || aria === raw || val === padded || val === raw;
    });
  }

  function findAddToCartButton() {
    const buttons = Array.from(document.querySelectorAll("button, a"));
    return buttons.find(b => {
      const t = (b.innerText || b.getAttribute("aria-label") || "").toLowerCase();
      return t.includes("colocar no carrinho") || t.includes("adicionar ao carrinho") || t.includes("incluir aposta");
    });
  }

  let successCount = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(\`🎯 Preenchendo Jogo #\${i + 1} de \${games.length}: \${game.join(", ")}\`);

    // Limpar volante se houver botão de limpar
    const clearBtn = Array.from(document.querySelectorAll("button, a")).find(b =>
      (b.innerText || "").toLowerCase().includes("limpar")
    );
    if (clearBtn) {
      clearBtn.click();
      await sleep(250);
    }

    // Clicar em cada dezena
    for (const num of game) {
      const el = findNumberElement(num);
      if (el) {
        el.click();
        await sleep(60);
      } else {
        console.warn("⚠️ Dezena não encontrada no volante visual:", num);
      }
    }

    await sleep(350);

    // Clicar em Colocar no Carrinho
    const addBtn = findAddToCartButton();
    if (addBtn) {
      addBtn.click();
      successCount++;
      console.log(\`✅ Jogo #\${i + 1} adicionado ao carrinho!\`);
      await sleep(1000);
    } else {
      console.error("❌ Botão 'Colocar no Carrinho' não encontrado. Verifique se você está na tela do volante da Caixa.");
      break;
    }
  }

  alert(\`🎉 Titan Loterias: \${successCount} de \${games.length} jogos adicionados ao seu carrinho da Caixa com sucesso!\`);
})();
`.trim();
}

/**
 * Gera a URL do Bookmarklet seguro (javascript:...) para arrastar para os favoritos.
 */
export function generateBookmarkletUrl(games: number[][], lotteryName?: string): string {
  const code = generateCaixaAutomationScript(games, lotteryName);
  const minified = code
    .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "") // Remove comentários
    .replace(/\s+/g, " ") // Compacta espaços
    .trim();
  return `javascript:${encodeURIComponent(minified)}`;
}
