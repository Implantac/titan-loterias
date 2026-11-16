import { describe, expect, it } from "vitest";
import { bolaoWhatsAppUrl } from "./bolaoWhatsApp";

describe("destino WhatsApp do participante", () => {
  it("aceita DDD e celular brasileiro com ou sem +55", () => {
    const expected = "https://wa.me/5511999998888?text=Ol%C3%A1";
    expect(bolaoWhatsAppUrl("(11) 99999-8888", "Olá")).toBe(expected);
    expect(bolaoWhatsAppUrl("+55 (11) 99999-8888", "Olá")).toBe(expected);
  });
  it("não envia mensagem para destinatário malformado", () => {
    expect(bolaoWhatsAppUrl("55", "Oi")).toBe("https://wa.me/?text=Oi");
    expect(bolaoWhatsAppUrl(undefined, "Oi")).toBe("https://wa.me/?text=Oi");
  });
});
