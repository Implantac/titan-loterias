import { describe, expect, it } from "vitest";
import { calculateCRC16, generatePixPayload, generatePixQrCodeDataUrl, formatBolaoWhatsAppMessage } from "./pix";

describe("PIX & WhatsApp Bolão Generator (BACEN EMV Standard)", () => {
  it("calcula CRC16-CCITT de acordo com a especificação padrão do BACEN", () => {
    // Vetor de teste clássico CRC16-CCITT 0xFFFF
    expect(calculateCRC16("123456789")).toBe("29B1");
  });

  it("gera payload PIX completo com chave, valor e identificadores EMV", () => {
    const payload = generatePixPayload({
      key: "financeiro@titanloterias.com.br",
      name: "João Silva",
      city: "São Paulo",
      amount: 35.5,
      txid: "BOLAO101",
    });

    expect(payload).toContain("000201");
    expect(payload).toContain("br.gov.bcb.pix");
    expect(payload).toContain("financeiro@titanloterias.com.br");
    expect(payload).toContain("540535.50");
    expect(payload).toContain("5802BR");
    expect(payload).toContain("JOAO SILVA");
    expect(payload).toContain("SAO PAULO");
    expect(payload).toContain("BOLAO101");
    expect(payload).toContain("6304");

    // Verifica que o CRC no fim confere
    const body = payload.slice(0, payload.length - 4);
    const expectedCrc = calculateCRC16(body);
    expect(payload.slice(-4)).toBe(expectedCrc);
  });

  it("gera payload sem valor quando amount não é informado", () => {
    const payload = generatePixPayload({
      key: "11999998888",
      name: "Maria Organizadora",
      city: "Campinas",
    });

    expect(payload).not.toContain("540"); // Sem tag de valor
    expect(payload).toContain("MARIA ORGANIZADORA");
    expect(payload).toContain("11999998888");
  });

  it("gera QR code Data URL em PNG offline", async () => {
    const payload = generatePixPayload({
      key: "teste@chave.com",
      name: "Teste",
      amount: 10,
    });

    const qrDataUrl = await generatePixQrCodeDataUrl(payload);
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("formata mensagem completa para WhatsApp de Bolão", () => {
    const msg = formatBolaoWhatsAppMessage({
      bolaoTitle: "Bolão da Virada Titan",
      lotteryName: "Mega-Sena",
      concurso: 2800,
      gamesCount: 20,
      totalCost: 120,
      costPerShare: 12,
      totalShares: 10,
      pixKey: "12345678900",
      pixPayload: "00020126330014br.gov.bcb.pix...",
      organizerName: "Carlos Silva",
    });

    expect(msg).toContain("BOLÃO DA VIRADA TITAN");
    expect(msg).toContain("*Mega-Sena* (Concurso #2800)");
    expect(msg).toContain("R$ 12,00");
    expect(msg).toContain("12345678900");
    expect(msg).toContain("PIX COPIA E COLA");
  });
});
