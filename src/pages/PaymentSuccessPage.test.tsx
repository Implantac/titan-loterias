import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockSession = vi.fn();
const mockSync = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: () => mockSession() } } }));
vi.mock("@/modules/subscriptions/application/subscriptionService", () => ({ syncSubscription: (...args: unknown[]) => mockSync(...args) }));
vi.mock("framer-motion", () => ({ motion: { div: "div" } }));
import PaymentSuccessPage from "./PaymentSuccessPage";

describe("retorno do checkout", () => {
  beforeEach(() => { vi.clearAllMocks(); mockSession.mockResolvedValue({ data: { session: { access_token: "test" } } }); });
  it("não afirma pagamento confirmado quando verificação falha", async () => {
    mockSync.mockRejectedValue(new Error("edge unavailable"));
    render(<MemoryRouter initialEntries={["/payment-success?plan=lifetime"]}><PaymentSuccessPage /></MemoryRouter>);
    expect(await screen.findByText("Ativação ainda não confirmada")).toBeTruthy();
    expect(screen.queryByText("Pagamento confirmado!")).toBeNull();
  });
  it("mostra somente plano verificado, não o plano da URL", async () => {
    mockSync.mockResolvedValue({ plan: "premium", subscribed: true });
    render(<MemoryRouter initialEntries={["/payment-success?plan=lifetime"]}><PaymentSuccessPage /></MemoryRouter>);
    expect(await screen.findByText("Acesso verificado")).toBeTruthy();
    expect(screen.getByText(/Plano Premium informado/)).toBeTruthy();
    expect(screen.queryByText(/Plano Vitalício informado/)).toBeNull();
  });
  it("permite verificar novamente após resposta pendente", async () => {
    mockSync.mockResolvedValueOnce({ plan: "free", subscribed: false }).mockResolvedValueOnce({ plan: "professional", subscribed: true });
    render(<MemoryRouter><PaymentSuccessPage /></MemoryRouter>);
    fireEvent.click(await screen.findByText("Verificar novamente"));
    await waitFor(() => expect(screen.getByText("Acesso verificado")).toBeTruthy());
  });
});
