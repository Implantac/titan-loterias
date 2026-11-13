import { describe, expect, it } from "vitest";
import { simulateRoi } from "./roiSimulator";

const prizeTiers = {
  premiacoes: [
    { faixa: 1, descricao: "Sena", ganhadores: 0, valorPremio: 0 },
    { faixa: 2, descricao: "Quina", ganhadores: 1, valorPremio: 1500 },
    { faixa: 3, descricao: "Quadra", ganhadores: 5, valorPremio: 100 },
  ],
  acumulou: true, valorAcumulado: 10000, valorEstimado: 20000, valorArrecadado: 50000,
};
const base = {
  lotteryId: "megasena", ticketPrice: 5,
  games: [[1, 2, 3, 4, 5, 6]],
  recentDraws: [{ concurso: 1, numbers: [1, 2, 3, 4, 7, 8], prizeTiers }],
};

describe("retrospectiva monetária sem prêmios inventados", () => {
  it("usa o rateio da faixa no concurso, inclusive custo fornecido", () => {
    expect(simulateRoi(base)).toMatchObject({
      totalPrize: 100, totalCost: 5, netResult: 95, roiPercent: 1900,
    });
  });
  it("não inventa retorno quando faltam rateios ou modalidade exige regras especiais", () => {
    expect(simulateRoi({ ...base, recentDraws: [{ concurso: 1, numbers: [1, 2, 3, 4, 7, 8] }] })).toBeNull();
    expect(simulateRoi({ ...base, lotteryId: "supersete" })).toBeNull();
    expect(simulateRoi({ ...base, recentDraws: [base.recentDraws[0], { concurso: 2, numbers: [1, 2, 3, 4, 5, 6] }] })).toBeNull();
  });
  it("conta todas as apostas da mesma faixa no mesmo concurso", () => {
    expect(simulateRoi({ ...base, games: [base.games[0], [...base.games[0]]] }))
      .toMatchObject({ totalPrize: 200, totalCost: 10 });
  });
});
