import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TransparentDemo } from "@/components/landing/TransparentDemo";
import { LOTTERIES } from "@/data/lotteries";

describe("prévia pública responsável", () => {
  it("mostra exemplo sem cadastro, deixa claros seus limites e discrimina modalidades", () => {
    render(<MemoryRouter><TransparentDemo /></MemoryRouter>);
    expect(screen.getByText(/Prévia estática e ilustrativa/)).toBeTruthy();
    expect(screen.getByText(/R\$ 18,00 no total/)).toBeTruthy();
    expect(screen.getAllByText(/não salva no formato genérico/i)).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(LOTTERIES.length + 1);
    expect(screen.getByRole("link", { name: /Comparar planos/ }).getAttribute("href")).toBe("/planos");
  });
});
