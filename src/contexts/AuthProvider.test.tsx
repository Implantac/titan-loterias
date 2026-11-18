import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./AuthContext";

const state = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: Session | null) => void),
  getProfile: vi.fn(),
  checkAdmin: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    onAuthStateChange: (cb: typeof state.callback) => { state.callback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
    getSession: async () => ({ data: { session: null }, error: null }),
  } },
}));
vi.mock("@/services/auth/auth.service", () => ({ AuthService: { getProfile: state.getProfile, signOut: vi.fn() } }));
vi.mock("@/features/auth/services/auth-queries", () => ({
  checkAdminStatus: state.checkAdmin,
  syncSubscriptionPlan: vi.fn().mockResolvedValue(null),
}));

function Viewer() {
  const { user, profile } = useAuth();
  return <div>{user?.id ?? "anon"}:{profile?.id ?? "sem-perfil"}</div>;
}

const session = (id: string) => ({ user: { id, email: `${id}@example.com` }, access_token: `test-${id}` }) as Session;

describe("isolamento de conta no AuthProvider", () => {
  beforeEach(() => {
    state.callback = null;
    state.getProfile.mockReset();
    state.checkAdmin.mockReset().mockResolvedValue({ isAdmin: false, isSuperAdmin: false, roles: [] });
  });

  it("limpa consultas da conta anterior e ignora resposta antiga de perfil", async () => {
    let finishOld!: (value: unknown) => void;
    state.getProfile.mockImplementation((id: string) => id === "A"
      ? new Promise(resolve => { finishOld = resolve; })
      : Promise.resolve({ id: "B", plan: "free" }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AuthProvider><Viewer /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(state.callback).not.toBeNull());
    await act(async () => { state.callback!("SIGNED_IN", session("A")); });
    client.setQueryData(["saved-bets", "megasena"], ["dados-A"]);
    await act(async () => { state.callback!("SIGNED_IN", session("B")); });
    expect(client.getQueryData(["saved-bets", "megasena"])).toBeUndefined();
    await waitFor(() => expect(screen.getByText("B:B")).toBeInTheDocument());
    await act(async () => { finishOld({ id: "A", plan: "lifetime" }); });
    expect(screen.getByText("B:B")).toBeInTheDocument();
    client.setQueryData(["saved-bets"], ["dados-B"]);
    await act(async () => { state.callback!("SIGNED_OUT", null); });
    expect(client.getQueryData(["saved-bets"])).toBeUndefined();
    expect(screen.getByText("anon:sem-perfil")).toBeInTheDocument();
  });
});
