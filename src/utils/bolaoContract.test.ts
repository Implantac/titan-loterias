import { describe, it, expect } from "vitest";
import { createBolaoContract, calculateBolaoSha256 } from "./bolaoContract";

describe("bolaoContract", () => {
  it("calculates a valid 64-character SHA-256 hash for canonical bolao payload", async () => {
    const hash = await calculateBolaoSha256("TEST_CANONICAL_PAYLOAD_TITAN");
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("creates an internal record without claiming official or legal proof", async () => {
    const config = {
      lotteryId: "megasena",
      lotteryName: "Mega-Sena",
      concurso: 2800,
      organizerName: "Carlos Silva",
      organizerPixKey: "11999998888",
      organizerCity: "SAO PAULO",
      totalCost: 120.0,
      totalShares: 10,
      costPerShare: 12.0,
      participants: [
        { name: "Carlos Silva", shares: 2, cost: 24.0, paid: true },
        { name: "Mariana Souza", shares: 3, cost: 36.0, paid: true },
      ],
      games: [
        [4, 12, 23, 31, 42, 58],
        [1, 5, 10, 20, 30, 40],
      ],
    };

    const contract = await createBolaoContract(config);

    expect(contract.contractId).toContain("BOL-MEGA-");
    expect(contract.sha256Seal.length).toBe(64);
    expect(contract.legalTerms.length).toBe(4);
    expect(contract.legalTerms.join(" ")).toContain("Não é bilhete");
    expect(contract.legalTerms.join(" ")).toContain("não prova autoria");
    expect(contract.legalTerms.join(" ")).not.toContain("Art. 1.314");
  });
});
