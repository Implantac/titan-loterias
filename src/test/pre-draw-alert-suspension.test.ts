import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("aviso pré-sorteio", () => {
  it("não dispara alerta de horário presumido e ainda exige chave de serviço", () => {
    const edge = readFileSync("supabase/functions/pre-draw-alert/index.ts", "utf8");
    expect(edge).toContain('req.headers.get("x-service-key")');
    expect(edge).toContain('notified: 0, suspended: true');
    expect(edge).not.toContain('/functions/v1/send-push');
  });
  it("não oferece ativação de T-2h na interface", () => {
    const ui = readFileSync("src/components/settings/PushNotificationsCard.tsx", "utf8");
    expect(ui).not.toContain('key: "pre_draw"');
    expect(ui).toContain('Avisos T-2h suspensos');
  });
});
