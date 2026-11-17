import { beforeEach, describe, expect, it } from "vitest";
import { scrubLegacyBolaoStorage } from "./bolaoLocalPrivacy";

describe("limpeza de dados pessoais antigos do bolão", () => {
  beforeEach(() => localStorage.clear());
  it("preserva só modalidade e jogos, removendo nome, telefone, pagamento e chave PIX", () => {
    localStorage.setItem("titan_bolao_pix_key", "12345678900");
    localStorage.setItem("titan_bolao_pix_name", "Pessoa");
    localStorage.setItem("titan_bolao_draft_v1", JSON.stringify({
      lotteryId: "megasena", games: [[1, 2, 3, 4, 5, 6]], title: "Equipe da Pessoa",
      participants: [{ name: "Pessoa", phone: "11999999999", paid: true, shares: 1 }],
    }));
    scrubLegacyBolaoStorage(localStorage);
    expect(localStorage.getItem("titan_bolao_pix_key")).toBeNull();
    expect(localStorage.getItem("titan_bolao_pix_name")).toBeNull();
    expect(localStorage.getItem("titan_bolao_draft_v1")).toBe('{"lotteryId":"megasena","games":[[1,2,3,4,5,6]]}');
  });
  it("não preserva campos pessoais escondidos dentro dos jogos", () => {
    localStorage.setItem("titan_bolao_draft_v1", JSON.stringify({ lotteryId: "megasena", games: [[{ phone: "11999999999" }]] }));
    scrubLegacyBolaoStorage(localStorage);
    expect(localStorage.getItem("titan_bolao_draft_v1")).toBeNull();
  });
  it("remove rascunho malformado sem falhar", () => {
    localStorage.setItem("titan_bolao_draft_v1", "{");
    scrubLegacyBolaoStorage(localStorage);
    expect(localStorage.getItem("titan_bolao_draft_v1")).toBeNull();
  });
});
