import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { supabaseDefine } from "./supabase-env";

export default defineConfig({
  plugins: [react()],
  // Sem isto, qualquer teste que importe o cliente Supabase quebra num clone
  // limpo (sem .env) com "supabaseUrl is required" — o createClient roda no
  // topo do módulo. Mesmo fallback do build, mesma fonte.
  define: supabaseDefine(),
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
