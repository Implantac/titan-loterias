# Titan Loterias

Plataforma de análise estatística de loterias brasileiras. Gera jogos com estratégias
auditáveis, monta fechamentos com garantia de cobertura, roda backtests walk-forward e
acompanha ROI — sempre sobre o histórico oficial de concursos.

> **Aviso:** este sistema é uma ferramenta de apoio à decisão baseada em dados históricos.
> Loteria é um jogo de azar: **não existe método que aumente a probabilidade de premiação**.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind · shadcn/ui · TanStack Query |
| Estado/dados | Supabase (Postgres + Auth + RLS) · TanStack Query · 7 Web Workers |
| Backend | 21 Supabase Edge Functions (Deno) |
| Pagamentos | Stripe (Checkout, Billing Portal, Webhooks) |
| PWA | vite-plugin-pwa (Workbox) |
| Observabilidade | Sentry · web-vitals |
| Testes | Vitest (unit) · Playwright (E2E) |

---

## Rodando localmente

```bash
# 1. Instalar (use npm ci em clone limpo — o lockfile é versionado)
npm ci

# 2. Configurar variáveis
cp .env.example .env     # e preencher os valores

# 3. Subir o app
npm run dev
```

### Variáveis de ambiente

**Frontend** (`.env`, prefixo `VITE_`):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | sim | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sim | Chave publishable/anon. **O nome é este** — um exemplo antigo usava `VITE_SUPABASE_ANON_KEY`, que o código não lê |
| `VITE_SUPABASE_PROJECT_ID` | sim | ID do projeto |
| `VITE_SENTRY_DSN` | não | Sem ela o Sentry **não é inicializado** |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | não | Fração de transações enviadas. Padrão `0.1` |

**Edge Functions** (`supabase secrets set`):
`SUPABASE_SERVICE_ROLE_KEY` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` ·
`APP_ORIGIN` · `ALLOWED_ORIGINS` · `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` ·
`VAPID_SUBJECT` · `LOVABLE_API_KEY`.

Os IDs de produto/preço do Stripe têm fallback em
`supabase/functions/_shared/billing.ts`. Para criar um ambiente de homologação, defina
`STRIPE_PRODUCT_*` / `STRIPE_PRICE_*` por segredo — não é preciso tocar em código.

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (com heap elevado — ver abaixo) |
| `npm run preview` | Serve o build localmente |
| `npm test` | Vitest (80 testes) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint 9 (flat config) |
| `npm run test:e2e` | Playwright contra a URL publicada |

**Sobre o heap do build:** o bundle tem chunks acima de 1 MB e estoura o heap padrão do
Node (~944 MB) com `Ineffective mark-compacts near heap limit`. Por isso o script `build`
já usa `--max-old-space-size=1536`. Se o bundle crescer e o build voltar a falhar, aumente
esse valor (2048, 3072) — máquinas com menos de 2 GB de RAM precisam de um valor menor.

---

## Banco de dados

As migrations ficam em `supabase/migrations/` e são aplicadas em ordem pelo Supabase.

```bash
supabase db push          # aplica migrations pendentes
supabase functions deploy # publica as Edge Functions
```

Pontos de atenção do schema:

- **RLS está ativo em todas as tabelas.** Autorização é resolvida no banco
  (`user_roles` + `has_role()`), nunca no cliente.
- **`lottery_draws.draw_date` é TEXT** em `DD/MM/AAAA`. Para ordenar ou filtrar por data
  use a coluna **`drawn_at` (DATE)**, mantida automaticamente por trigger. Nunca faça
  `new Date(draw_date)` no frontend — use `parseDrawDate()` de `src/lib/draw-date.ts`.
- **`profiles.plan` não pode ser alterado pelo próprio usuário** (trigger
  `enforce_profile_plan_changes`). A fonte de verdade do plano é o webhook do Stripe.
- **`profiles.stripe_customer_id`** é o vínculo com o Stripe. Não resolva cliente por
  e-mail: com e-mail nulo, `customers.list({ email: undefined })` lista **todos** os
  clientes da conta.
- **`webhook_events`** garante idempotência dos eventos do Stripe.
- **`system_config.full_access_email`** define a conta dona. Troque por `UPDATE`, não por
  migration.

### Health check dos dados

```sql
SELECT * FROM public.lottery_data_freshness();
-- days_stale > 3 indica que o cron de sincronização parou
```

---

## Sincronização dos resultados

O histórico vem de `sync-lottery-draws`, que lê uma API externa e faz `upsert` idempotente
por `(lottery_id, concurso)`.

**Importante:** a fonte atual é `https://loteriascaixa-api.herokuapp.com/api` — uma API
comunitária, **não oficial da Caixa**, sem SLA. Isso é um risco de negócio conhecido:
antes de escalar, contrate uma fonte licenciada e adicione um segundo provedor.

A sincronização roda de duas formas:

1. **Automática** — `pg_cron` a cada 30 minutos (migration
   `20261009120300_audit_scheduled_sync.sql`), chamando a função com `x-service-key`.
2. **Manual** — o app dispara ao carregar, com cooldown de 30 s.

---

## Testes

```bash
npm test                                  # unit (engine + lib)
npm run test:e2e                          # contra a URL publicada
E2E_BASE_URL=https://staging.exemplo.com npm run test:e2e
```

O cenário autenticado (`e2e/gerador.spec.ts`) exige `E2E_TEST_EMAIL` e
`E2E_TEST_PASSWORD`; sem elas ele é **pulado**. No CI, cadastre-as como secrets.

---

## CI

`.github/workflows/ci.yml` roda em todo push/PR: `npm ci` → lint → typecheck → testes →
build. `.github/workflows/e2e.yml` roda Playwright em Chromium, Firefox e WebKit contra a
URL publicada.

---

## Deploy

O projeto foi criado no Lovable e é publicado por lá. Para hospedar por conta própria:

1. `npm run build` e sirva `dist/` (é uma SPA — configure fallback para `index.html`).
2. Defina as variáveis `VITE_*` **no build**, não em runtime: o Vite as inlineia.
3. Publique as Edge Functions e os segredos no Supabase.
4. Aplique as migrations.
5. No Stripe, aponte o webhook para
   `https://<projeto>.supabase.co/functions/v1/stripe-webhook` e cadastre
   `STRIPE_WEBHOOK_SECRET`.
6. Configure `APP_ORIGIN` / `ALLOWED_ORIGINS` com o domínio final — os redirecionamentos
   de checkout só aceitam origens nessa lista.
7. Confirme o cron: `SELECT * FROM cron.job;`

**Backup:** use o backup automático do Supabase (PITR) e teste uma restauração antes de
cobrar o primeiro cliente. Não há procedimento de restore documentado além deste.

---

## Arquitetura

```
src/
  ai/          orquestrador e engines estatísticas (Markov, Bayes, HMM, padrões)
  core/        contratos/DTOs de borda (AI, worker, subscription, auth)
  engine/      domínio: fechamentos, estatística, evidência, backtest, banca
  components/  UI (246 componentes)
  pages/       40 páginas
  hooks/       efeitos colaterais de dados
  workers/     7 Web Workers para cálculo pesado
  lib/         utilitários (incl. draw-date, o parser de datas de concurso)
supabase/
  functions/   21 Edge Functions
  migrations/  schema, RLS, triggers, cron
```

Regras de engenharia do projeto em `AGENTS.md`. Roadmap em `roadmap.md` e `docs/`.

### Sobre a "IA"

Não há modelo treinado. O `NativeAIOrchestrator` é um despachante determinístico sobre
engines estatísticas, com seed reproduzível (`xorshift32`). `src/engine/ml/modelRegistry.ts`
classifica cada modelo como heurístico, estatístico ou ML justamente para que a comunicação
externa não prometa o que o código não faz. **Mantenha o material de venda alinhado a isso.**
