import { describe, expect, it } from "vitest";
import { isRestorableBolaoParticipants, normalizeShareCount } from "./bolaoParticipants";

describe("cotas no rascunho local", () => {
  it("normaliza input sem criar cotas fracionárias ou infinitas", () => {
    expect(normalizeShareCount("2.5")).toBe(1);
    expect(normalizeShareCount("3")).toBe(3);
    expect(normalizeShareCount(200)).toBe(100);
    expect(normalizeShareCount(Infinity)).toBe(1);
    expect(normalizeShareCount(-2)).toBe(1);
  });
  it("rejeita participantes com cotas inválidas, status falso ou ids duplicados", () => {
    const valid = [{ id: "a", name: "A", shares: 1 }, { id: "b", name: "B", shares: 2, paid: false }];
    expect(isRestorableBolaoParticipants(valid)).toBe(true);
    expect(isRestorableBolaoParticipants([{ ...valid[0], shares: 1.5 }, valid[1]])).toBe(false);
    expect(isRestorableBolaoParticipants([{ ...valid[0], paid: "true" }, valid[1]])).toBe(false);
    expect(isRestorableBolaoParticipants([valid[0], { ...valid[1], id: "a" }])).toBe(false);
  });
});
