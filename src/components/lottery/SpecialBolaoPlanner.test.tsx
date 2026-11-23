import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("jspdf", () => ({ default: class {} }));
import { SpecialBolaoPlanner } from "./SpecialBolaoPlanner";

describe("checklist temporário das modalidades especiais", () => {
  it("limpa as marcações ao mudar as cotas e não as trata como prova", () => {
    render(<SpecialBolaoPlanner kind="supersete" />);
    const checkbox = screen.getByLabelText(/Conferi regras, preço/);
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.change(screen.getByLabelText(/Cotas privadas de planejamento/), { target: { value: "3" } });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/não são salvas, exportadas ou prova/)).toBeTruthy();
  });
});
