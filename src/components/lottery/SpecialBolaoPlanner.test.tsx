import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("jspdf", () => ({ default: class {} }));
import { SpecialBolaoPlanner } from "./SpecialBolaoPlanner";

describe("checklist temporário das modalidades especiais", () => {
  it("não usa preço de referência silenciosamente quando preço manual é inválido", () => {
    render(<SpecialBolaoPlanner kind="supersete" />);
    for (let i = 1; i <= 7; i++)
      fireEvent.change(screen.getByLabelText(`Coluna ${i}`), { target: { value: String(i % 10) } });
    fireEvent.click(screen.getByText("Adicionar jogo ao planejamento"));
    expect(screen.getByText(/Custo estimado:/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Preço manual por jogo/), { target: { value: "0" } });
    expect(screen.queryByText(/Custo estimado:/)).toBeNull();
    expect(screen.getByText(/Custo e rateio indisponíveis/)).toBeTruthy();
    expect((screen.getByText("Baixar TXT interno") as HTMLButtonElement).disabled).toBe(true);
  });
  it("permite digitar cotas intermediárias sem travar o campo", () => {
    render(<SpecialBolaoPlanner kind="supersete" />);
    const input = screen.getByLabelText(/Cotas privadas de planejamento/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1" } });
    expect(input.value).toBe("1");
    expect(screen.getByText(/Informe de 2 a 100 cotas/)).toBeTruthy();
    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.queryByText(/Informe de 2 a 100 cotas/)).toBeNull();
  });
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
