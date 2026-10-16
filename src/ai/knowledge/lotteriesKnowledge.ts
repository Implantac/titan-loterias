/**
 * Native AI — Lottery Knowledge Base
 *
 * Regras oficiais (Caixa Econômica Federal / SEAE) + vieses estatísticos
 * historicamente observados em cada modalidade brasileira. Serve como
 * fundamento para o `nativeAIOrchestrator`, os geradores e a explicabilidade
 * dos jogos.
 *
 * Fontes: Portarias SEAE/ME, regulamentos oficiais publicados pela Caixa e
 * análise de frequência dos sorteios oficiais. Os vieses são referências
 * estatísticas, NÃO garantias — a IA usa como sinal, nunca como oráculo.
 */

import { LotteryRules } from "../core/aiTypes";

export const LOTTERY_RULES: Record<string, LotteryRules> = {
  lotofacil: {
    id: "lotofacil", name: "Lotofácil",
    totalNumbers: 25, pick: 15, minBet: 15, maxBet: 20,
    ticketPrice: 3.5,
    drawDays: ["segunda", "terça", "quarta", "quinta", "sexta", "sábado"],
    hasGrid: true, gridRows: 5, gridCols: 5,
    prizeTiers: [
      { hits: 15, description: "15 acertos" },
      { hits: 14, description: "14 acertos" },
      { hits: 13, description: "13 acertos" },
      { hits: 12, description: "12 acertos" },
      { hits: 11, description: "11 acertos" },
    ],
    odds: { 15: 3268760, 14: 21791, 13: 691, 12: 59, 11: 11 },
    idealSumRange: [170, 220],
    idealParityRange: [6, 9],
    idealFrameRange: [8, 11],
    avgRepeatFromPrevious: [7, 11],
    maxRecommendedSequence: 3,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 43.35,
    specialRules: [
      "Cartela 5×5 com dezenas de 01 a 25 — marca-se 15, 16, 17, 18, 19 ou 20 dezenas.",
      "Faixa mínima premiada: 11 acertos (paga valor fixo).",
      "Concurso especial anual: Lotofácil da Independência (setembro).",
    ],
    knownBiases: {
      hotNumbers: [20, 13, 10, 11, 3, 5, 25, 2, 4, 14],
      coldNumbers: [22, 9, 26 /* n/a */, 8, 6].filter(n => n <= 25),
      avgSum: 195,
      avgEvens: 7.5,
      noConsecutiveRate: 0.05, // muito raro NÃO ter consecutivos
      notes: [
        "Em ~97% dos sorteios existe pelo menos 1 par consecutivo.",
        "Repetição do sorteio anterior fica quase sempre entre 8 e 10 dezenas.",
        "Moldura (16 dezenas de borda) tende a aparecer 8-11 vezes por sorteio.",
        "Soma total concentra-se em 180–210 na maioria dos concursos.",
      ],
    },
    commonPitfalls: [
      "Apostar 15 dezenas todas na moldura ou todas no centro.",
      "Ignorar a repetição do sorteio anterior — apostar 0 repetições é praticamente jogar contra o histórico.",
      "Sequências longas (≥ 5 consecutivos) aparecem em menos de 1% dos sorteios.",
    ],
    recommendedStrategies: [
      "Manter 8-10 dezenas repetidas do último sorteio.",
      "Distribuição 7-8 pares e 7-8 ímpares.",
      "9-10 dezenas da moldura + 5-6 do centro.",
      "Fechamento com 18-20 dezenas para garantir 13-14 pontos.",
    ],
  },

  megasena: {
    id: "megasena", name: "Mega-Sena",
    totalNumbers: 60, pick: 6, minBet: 6, maxBet: 20,
    ticketPrice: 6.0,
    drawDays: ["terça", "quinta", "sábado"],
    hasGrid: false, gridRows: 10, gridCols: 6,
    prizeTiers: [
      { hits: 6, description: "Sena" },
      { hits: 5, description: "Quina" },
      { hits: 4, description: "Quadra" },
    ],
    odds: { 6: 50063860, 5: 154518, 4: 2332 },
    idealSumRange: [140, 220],
    idealParityRange: [2, 4],
    avgRepeatFromPrevious: [1, 3],
    maxRecommendedSequence: 2,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 43.35,
    specialRules: [
      "Cartela 6×10 com dezenas de 01 a 60 — marca-se de 6 a 20 dezenas.",
      "Concurso especial anual: Mega da Virada (31/12) — prêmio principal não acumula.",
      "Acumulação padrão sobe o prêmio para o próximo concurso quando ninguém acerta a Sena.",
    ],
    knownBiases: {
      hotNumbers: [10, 53, 5, 33, 42, 4, 34, 23, 27, 37],
      coldNumbers: [26, 55, 21, 22, 9],
      hotDecade: "51-60 (a maior parte dos sorteios tem 1 dezena desta faixa)",
      avgSum: 183,
      avgEvens: 3.0,
      noConsecutiveRate: 0.68,
      notes: [
        "Cerca de 32% dos sorteios contêm exatamente 1 par consecutivo; 3+ consecutivos é raro (<3%).",
        "Distribuição par/ímpar 3-3 aparece em ~34% dos sorteios (mais comum).",
        "Soma total concentra-se em 150–220 em ~72% dos concursos.",
        "Repetição do sorteio anterior mais comum: 1 dezena (~44% dos casos).",
      ],
    },
    commonPitfalls: [
      "Apostar 6 dezenas todas ímpares ou todas pares (< 1% dos sorteios).",
      "Concentrar dezenas em 1 ou 2 décadas — soma cai fora da faixa ideal.",
      "Depender exclusivamente de 'atrasadas' — cada sorteio é independente estatisticamente.",
    ],
    recommendedStrategies: [
      "Distribuição 2-4 ou 3-3 entre pares e ímpares.",
      "Cobrir pelo menos 4 das 6 décadas (1-10, 11-20 ... 51-60).",
      "Manter soma entre 150 e 220.",
      "Desdobramento com 7-10 dezenas para cobrir múltiplos jogos.",
    ],
  },

  quina: {
    id: "quina", name: "Quina",
    totalNumbers: 80, pick: 5, minBet: 5, maxBet: 15,
    ticketPrice: 3.0,
    drawDays: ["segunda", "terça", "quarta", "quinta", "sexta", "sábado"],
    hasGrid: false, gridRows: 8, gridCols: 10,
    prizeTiers: [
      { hits: 5, description: "Quina" },
      { hits: 4, description: "Quadra" },
      { hits: 3, description: "Terno" },
      { hits: 2, description: "Duque" },
    ],
    odds: { 5: 24040016, 4: 64106, 3: 866, 2: 36 },
    idealSumRange: [150, 250],
    idealParityRange: [2, 3],
    avgRepeatFromPrevious: [1, 3],
    maxRecommendedSequence: 2,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 43.12,
    specialRules: [
      "Cartela 10×8 com dezenas de 01 a 80 — marca-se de 5 a 15 dezenas.",
      "Concurso especial: Quina de São João (junho) — prêmio principal não acumula.",
      "Duque (2 acertos) já premia — faixa mais acessível entre todas as loterias.",
    ],
    knownBiases: {
      hotNumbers: [4, 51, 74, 55, 43, 3, 12, 26, 30, 78],
      coldNumbers: [21, 89 /* n/a */, 40, 25, 20].filter(n => n <= 80),
      avgSum: 202,
      avgEvens: 2.5,
      notes: [
        "Distribuição 2-3 par/ímpar ou 3-2 domina (~68% dos sorteios).",
        "Sorteios com 3+ dezenas na mesma faixa de 10 são raros (<15%).",
        "Repetição de 1-2 dezenas do sorteio anterior é o padrão (~60%).",
      ],
    },
    commonPitfalls: [
      "Apostar 5 dezenas todas em uma mesma linha da cartela.",
      "Priorizar somente dezenas 'quentes' — o universo é grande e disperso.",
    ],
    recommendedStrategies: [
      "Cobrir 4-5 das 8 faixas de 10 (1-10, 11-20 ... 71-80).",
      "Distribuição 2-3 ou 3-2 par/ímpar.",
      "Aposta com 6-7 dezenas eleva chance de Duque significativamente.",
    ],
  },

  lotomania: {
    id: "lotomania", name: "Lotomania",
    totalNumbers: 100, pick: 50, minBet: 50, maxBet: 50,
    ticketPrice: 3.0,
    drawDays: ["terça", "sexta"],
    hasGrid: false, gridRows: 10, gridCols: 10,
    prizeTiers: [
      { hits: 20, description: "20 acertos" },
      { hits: 19, description: "19 acertos" },
      { hits: 18, description: "18 acertos" },
      { hits: 17, description: "17 acertos" },
      { hits: 16, description: "16 acertos" },
      { hits: 15, description: "15 acertos" },
      { hits: 0, description: "0 acertos" },
    ],
    odds: { 20: 11372635, 19: 568632, 18: 14421, 17: 459, 16: 29, 15: 5, 0: 11372635 },
    idealSumRange: [2350, 2650],
    idealParityRange: [23, 27],
    avgRepeatFromPrevious: [20, 30],
    maxRecommendedSequence: 5,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 30.45,
    specialRules: [
      "Universo de 00 a 99 (100 dezenas) — obrigatório marcar exatamente 50.",
      "0 acertos paga a mesma faixa que 20 acertos — única loteria com essa mecânica.",
      "Apostador cobre metade do universo → alta chance de faixas intermediárias.",
    ],
    knownBiases: {
      avgSum: 2500,
      avgEvens: 25,
      notes: [
        "Como a aposta cobre 50 números, o desafio real é a distribuição, não a escolha individual.",
        "Distribuição típica: 24-26 pares e 24-26 ímpares.",
        "Cobrir 5 faixas de 20 (00-19, 20-39 ... 80-99) com 9-11 dezenas cada equilibra o jogo.",
        "Repetição de 22-28 dezenas do sorteio anterior é a média.",
      ],
    },
    commonPitfalls: [
      "Concentrar 30+ dezenas em duas faixas de 20 — quebra a distribuição.",
      "Marcar 50 dezenas todas ímpares ou todas pares — matematicamente impossível ganhar.",
    ],
    recommendedStrategies: [
      "10 dezenas por faixa de 20 (equilíbrio perfeito).",
      "24-26 pares e 24-26 ímpares.",
      "Aproveitar a faixa '0 acertos' com apostas 'inversas' calculadas.",
    ],
  },

  duplasena: {
    id: "duplasena", name: "Dupla Sena",
    totalNumbers: 50, pick: 6, minBet: 6, maxBet: 15,
    ticketPrice: 3.0,
    drawDays: ["terça", "quinta", "sábado"],
    hasGrid: false, gridRows: 5, gridCols: 10,
    prizeTiers: [
      { hits: 6, description: "Sena" },
      { hits: 5, description: "Quina" },
      { hits: 4, description: "Quadra" },
      { hits: 3, description: "Terno" },
    ],
    odds: { 6: 15890700, 5: 60192, 4: 1119, 3: 60 },
    idealSumRange: [120, 190],
    idealParityRange: [2, 4],
    avgRepeatFromPrevious: [1, 3],
    maxRecommendedSequence: 2,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 32.15,
    specialRules: [
      "Dois sorteios independentes por concurso — a mesma cartela concorre nos dois.",
      "Concurso especial: Dupla de Páscoa (março/abril) — prêmio principal não acumula.",
      "Faixa mínima (Terno) já premia em ambos os sorteios.",
    ],
    knownBiases: {
      hotNumbers: [10, 5, 6, 45, 8, 22, 30, 15, 3, 41],
      coldNumbers: [26, 44, 17, 29, 38],
      avgSum: 153,
      avgEvens: 3.0,
      notes: [
        "Duas chances por concurso reduzem custo efetivo por acerto.",
        "Distribuição 3-3 par/ímpar domina (~35% dos sorteios).",
        "Faixa central (21-30) aparece em ~68% dos sorteios.",
      ],
    },
    commonPitfalls: [
      "Tratar como Mega — o universo é 50 (não 60), soma ideal é menor.",
      "Ignorar que a mesma aposta vale para os dois sorteios independentes.",
    ],
    recommendedStrategies: [
      "Distribuição 2-4 ou 3-3 par/ímpar.",
      "Cobrir 4-5 das 5 faixas de 10.",
      "Manter soma entre 120 e 190.",
    ],
  },

  timemania: {
    id: "timemania", name: "Timemania",
    totalNumbers: 80, pick: 10, minBet: 10, maxBet: 10,
    ticketPrice: 3.5,
    drawDays: ["terça", "quinta", "sábado"],
    hasGrid: false, gridRows: 8, gridCols: 10,
    prizeTiers: [
      { hits: 7, description: "7 acertos" },
      { hits: 6, description: "6 acertos" },
      { hits: 5, description: "5 acertos" },
      { hits: 4, description: "4 acertos" },
      { hits: 3, description: "3 acertos" },
    ],
    odds: { 7: 26978328, 6: 216000, 5: 8040, 4: 195, 3: 12 },
    idealSumRange: [350, 470],
    idealParityRange: [4, 6],
    avgRepeatFromPrevious: [2, 5],
    maxRecommendedSequence: 3,
    officialRegulation: "Portaria SEAE/ME nº 186/2020 + Lei 11.345/2006",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 46.0,
    bonusPool: {
      name: "Time do Coração",
      range: [1, 80], // representa clubes cadastrados
      pickCount: 1,
      note: "Escolha um clube brasileiro cadastrado. Acertar o Time do Coração premia faixa própria.",
    },
    specialRules: [
      "Marca-se 10 dezenas fixas de 01 a 80 + 1 Time do Coração.",
      "Acertar apenas o Time do Coração já premia (faixa exclusiva).",
      "Parte da arrecadação vai para o clube escolhido (Lei 11.345/2006 — Timemania dos Clubes).",
    ],
    knownBiases: {
      avgSum: 405,
      avgEvens: 5.0,
      notes: [
        "Distribuição par/ímpar 5-5 é a mais frequente (~40% dos sorteios).",
        "Cobrir 6-7 das 8 faixas de 10 é praticamente obrigatório.",
        "Repetição de 3-4 dezenas do sorteio anterior é o padrão.",
      ],
    },
    commonPitfalls: [
      "Marcar Time do Coração ao acaso — é uma faixa premiada, escolha estrategicamente.",
      "Ignorar que só se pode marcar exatamente 10 dezenas.",
    ],
    recommendedStrategies: [
      "Distribuição 5-5 par/ímpar.",
      "Escolher o clube com base em preferência pessoal (é loteria, não estratégia).",
      "Cobrir 6+ faixas de 10 para diversificar.",
    ],
  },

  diadesorte: {
    id: "diadesorte", name: "Dia de Sorte",
    totalNumbers: 31, pick: 7, minBet: 7, maxBet: 15,
    ticketPrice: 2.5,
    drawDays: ["terça", "quinta", "sábado"],
    hasGrid: false, gridRows: 4, gridCols: 8,
    prizeTiers: [
      { hits: 7, description: "7 acertos" },
      { hits: 6, description: "6 acertos" },
      { hits: 5, description: "5 acertos" },
      { hits: 4, description: "4 acertos" },
    ],
    odds: { 7: 2629575, 5: 2727, 4: 129, 6: 44066 },
    idealSumRange: [95, 135],
    idealParityRange: [3, 4],
    avgRepeatFromPrevious: [2, 4],
    maxRecommendedSequence: 2,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "20:00",
    prizePoolPercent: 40.0,
    bonusPool: {
      name: "Mês da Sorte",
      range: [1, 12], // Janeiro a Dezembro
      pickCount: 1,
      note: "Escolha 1 dos 12 meses. Acertar o Mês da Sorte premia faixa exclusiva.",
    },
    specialRules: [
      "Universo pequeno de 01 a 31 (dezenas = dias do mês) + 1 Mês da Sorte (1-12).",
      "Acertar apenas o Mês da Sorte já premia.",
      "Maior chance relativa da Caixa entre modalidades com prêmio principal acumulável.",
    ],
    knownBiases: {
      avgSum: 112,
      avgEvens: 3.5,
      notes: [
        "Universo pequeno faz padrões repetirem com frequência.",
        "Distribuição 3-4 ou 4-3 par/ímpar domina (~72% dos sorteios).",
        "Repetição de 2-3 dezenas do sorteio anterior é o padrão.",
      ],
    },
    commonPitfalls: [
      "Escolher só datas comemorativas — sofre concorrência massiva na divisão do prêmio.",
      "Ignorar o Mês da Sorte — é uma faixa premiada extra.",
    ],
    recommendedStrategies: [
      "Distribuição 3-4 ou 4-3 par/ímpar.",
      "Evitar concentrar tudo entre 01-15 (padrão de aniversário — muitos apostam igual).",
      "Escolher Mês da Sorte diferente do próprio mês de nascimento aumenta expectativa por rateio.",
    ],
  },

  supersete: {
    id: "supersete", name: "Super Sete",
    totalNumbers: 10, pick: 7, minBet: 7, maxBet: 21,
    ticketPrice: 3.0,
    drawDays: ["segunda", "quarta", "sexta"],
    hasGrid: false, gridRows: 1, gridCols: 7,
    prizeTiers: [
      { hits: 7, description: "7 acertos" },
      { hits: 6, description: "6 acertos" },
      { hits: 5, description: "5 acertos" },
      { hits: 4, description: "4 acertos" },
      { hits: 3, description: "3 acertos" },
    ],
    odds: { 7: 10000000, 6: 46512, 5: 1107, 4: 72, 3: 9 },
    idealSumRange: [25, 40],
    idealParityRange: [3, 4],
    avgRepeatFromPrevious: [3, 5],
    maxRecommendedSequence: 2,
    officialRegulation: "Portaria SEAE/ME nº 186/2020",
    drawTimeBrasilia: "15:00",
    prizePoolPercent: 45.0,
    specialRules: [
      "7 colunas independentes — escolhe-se 1 número (0 a 9) por coluna, obrigatório.",
      "Cada coluna sorteia um número independentemente das outras.",
      "Múltiplas escolhas por coluna aumentam o custo multiplicativamente.",
    ],
    knownBiases: {
      avgSum: 32,
      avgEvens: 3.5,
      notes: [
        "Cada coluna é um sorteio independente de 1 em 10 — probabilidade por coluna é 10%.",
        "Distribuição de dígitos tende a se equilibrar entre baixos (0-4) e altos (5-9).",
        "Repetição do sorteio anterior é comum: 3-5 colunas mantêm o mesmo número.",
      ],
    },
    commonPitfalls: [
      "Marcar o mesmo número em todas as colunas (ex: 5-5-5-5-5-5-5) — chance = (1/10)⁷.",
      "Aumentar 2 números em várias colunas sem calcular custo — dobra a cada coluna.",
    ],
    recommendedStrategies: [
      "Diversificar dígitos entre baixos e altos em cada coluna.",
      "Estratégia de fechamento: escolher 2 números em 2-3 colunas específicas.",
      "Analisar frequência histórica coluna a coluna, não o pool total.",
    ],
  },

  maismilionaria: {
    id: "maismilionaria", name: "+Milionária",
    totalNumbers: 50, pick: 6, minBet: 6, maxBet: 12,
    ticketPrice: 6.0,
    drawDays: ["sábado"],
    hasGrid: false, gridRows: 5, gridCols: 10,
    prizeTiers: [
      { hits: 6, description: "6 acertos + 2 trevos" },
      { hits: 6, description: "6 acertos + 1 ou 0 trevos" },
      { hits: 5, description: "5 acertos + 0 a 2 trevos" },
      { hits: 4, description: "4 acertos + 0 a 2 trevos" },
      { hits: 3, description: "3 acertos + 0 a 2 trevos" },
      { hits: 2, description: "2 acertos + 0 a 2 trevos" },
    ],
    odds: { 6: 238360500, 5: 216691, 4: 5787, 3: 351, 2: 42 },
    idealSumRange: [120, 190],
    idealParityRange: [2, 4],
    avgRepeatFromPrevious: [0, 2],
    maxRecommendedSequence: 2,
    officialRegulation: "Portaria SEAE/ME nº 12.335/2022",
    drawTimeBrasilia: "20:00",
    minGuaranteedPrize: 10_000_000,
    prizePoolPercent: 43.35,
    bonusPool: {
      name: "Trevos",
      range: [1, 6],
      pickCount: 2,
      ticketExtraCost: 0, // embutido na aposta mínima
      note: "Escolha 2 trevos (mínimo) entre 6 disponíveis. Compõem faixas premiadas junto com as dezenas.",
    },
    specialRules: [
      "Loteria mais nova da Caixa (lançada em 2022).",
      "6 dezenas de 01 a 50 + 2 trevos de 1 a 6, obrigatoriamente.",
      "Prêmio principal mínimo garantido de R$ 10 milhões (não paga menos).",
      "Faixa mínima premiada é 2 acertos + 0 trevos — a mais generosa da Caixa.",
      "Único jogo brasileiro com prêmio de faixa combinando dezenas e bônus (trevos).",
    ],
    knownBiases: {
      avgSum: 153,
      avgEvens: 3.0,
      notes: [
        "Base histórica ainda pequena (< 200 sorteios) — vieses são preliminares.",
        "Trevos: cada um tem chance idêntica de 1/6 (nenhum viés real esperado).",
        "Distribuição 3-3 par/ímpar é a mais provável estatisticamente.",
      ],
    },
    commonPitfalls: [
      "Ignorar os trevos — eles compõem 6 das 10 faixas premiadas.",
      "Apostar 6 dezenas + só 2 trevos sem entender que aumentar trevos multiplica o custo.",
      "Confundir com Dupla Sena por causa do universo 50 — as regras são completamente diferentes.",
    ],
    recommendedStrategies: [
      "Sempre marcar 2 trevos (base mínima).",
      "Distribuição 3-3 par/ímpar entre as dezenas.",
      "Cobrir 4-5 das 5 faixas de 10 (1-10 ... 41-50).",
      "Aproveitar prêmio mínimo garantido — historicamente o maior no cenário brasileiro.",
    ],
  },
};

export function getLotteryRules(lotteryId: string): LotteryRules {
  return LOTTERY_RULES[lotteryId] || LOTTERY_RULES.lotofacil;
}

/** Primes up to 100 for pattern analysis */
export const PRIMES = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]);
export const FIBONACCI = new Set([1,2,3,5,8,13,21,34,55,89]);

/** Lotofácil frame (border) numbers — 16 cells of the 5×5 grid perimeter */
export const LOTOFACIL_FRAME = new Set([1,2,3,4,5,6,10,11,15,16,20,21,22,23,24,25]);
/** Lotofácil center (miolo) numbers — 9 interior cells */
export const LOTOFACIL_CENTER = new Set([7,8,9,12,13,14,17,18,19]);
/** Physical anchors — the four grid corners */
export const LOTOFACIL_CORNERS = new Set([1, 5, 21, 25]);
/** Multiples of 3 within 1-25 — historically 4-6 hit per draw */
export const LOTOFACIL_MULT3 = new Set([3, 6, 9, 12, 15, 18, 21, 24]);
/** Column index (1..5) for a Lotofácil number in the 5×5 grid */
export const lotofacilCol = (n: number): number => ((n - 1) % 5) + 1;
/** Row index (1..5) for a Lotofácil number in the 5×5 grid */
export const lotofacilRow = (n: number): number => Math.floor((n - 1) / 5) + 1;
/** Sum-range window aligned with 97%+ of historical Lotofácil draws */
export const LOTOFACIL_SUM_RANGE: readonly [number, number] = [180, 220] as const;
/** Repeat count from previous draw — ideal band (observed in ~92% of draws) */
export const LOTOFACIL_REPEAT_RANGE: readonly [number, number] = [7, 11] as const;
/** Repeat count target — median of the ideal band, used by generators */
export const LOTOFACIL_REPEAT_TARGET = 9;
/** Frame count ideal band (observed in ~87% of historical draws) */
export const LOTOFACIL_FRAME_RANGE: readonly [number, number] = [8, 11] as const;
/** Frame count target (bias toward 10 frame / 5 center) */
export const LOTOFACIL_FRAME_TARGET = 10;


/**
 * Ajuda a IA a produzir explicações consistentes: retorna um resumo textual
 * do conhecimento de uma modalidade para injetar no prompt de explicabilidade.
 */
export function summarizeLotteryKnowledge(lotteryId: string): string {
  const r = getLotteryRules(lotteryId);
  const biases = r.knownBiases;
  const parts: string[] = [
    `${r.name}: ${r.totalNumbers} dezenas, marca ${r.pick}, ${r.drawDays.length} sorteios/semana.`,
  ];
  if (biases?.avgSum) parts.push(`Soma média histórica ~${biases.avgSum}.`);
  if (biases?.avgEvens) parts.push(`Média de pares por sorteio ~${biases.avgEvens}.`);
  if (r.bonusPool) parts.push(`Inclui ${r.bonusPool.name} (${r.bonusPool.pickCount}× em ${r.bonusPool.range[0]}-${r.bonusPool.range[1]}).`);
  if (r.recommendedStrategies?.length) parts.push(`Estratégia recomendada: ${r.recommendedStrategies[0]}`);
  return parts.join(" ");
}
