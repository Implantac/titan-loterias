# Runbook de implantação — pendências de produção

Gerado em **09/10/2026** a partir da auditoria. Todo o código já está no `main`;
**o que falta é implantação**, e nada disso pode ser feito a partir do
repositório — exige o Supabase CLI autenticado e acesso ao painel.

Cada passo tem o comando **e** como confirmar que funcionou. Não pule a
verificação: foi justamente assumir que algo estava aplicado que deixou o
sistema com a base desatualizada.

---

## 0. Pré-requisitos

```bash
supabase login
supabase link --project-ref <seu-project-ref>
supabase --version    # confirme que o CLI responde
```

O `project-ref` é o `VITE_SUPABASE_PROJECT_ID` do `.env`.

---

## 1. Backup (obrigatório antes de qualquer coisa)

A migration `20261009120100` contém um `DELETE FROM closing_history` para
registros órfãos. Foi testada em PostgreSQL 17 e comprovadamente apaga **só**
órfãos — mas faça o backup assim mesmo.

```bash
pg_dump "$SUPABASE_DB_URL" -Fc -f titan-$(date +%F).dump
```

**Verificar:** `ls -lh titan-*.dump` deve mostrar um arquivo não vazio.

---

## 2. Habilitar as extensões no painel

**Antes** do `db push`. A migration `120300` é defensiva e não falha sem elas,
mas nesse caso o agendamento simplesmente não é criado.

Painel do Supabase → **Database → Extensions** → ative:
- `pg_cron`
- `pg_net`

---

## 3. Aplicar as migrations

```bash
supabase db push
```

São 5 novas, todas validadas em PostgreSQL 17 real (aplicação em ordem +
12 testes funcionais de comportamento):

| Migration | O que faz |
|---|---|
| `120000` | Índices de billing, `webhook_events` com `UNIQUE(event_id)`, RLS |
| `120100` | `drawn_at` + trigger, FK em `closing_history`, remoção de órfãos |
| `120200` | `system_config`; tira o e-mail de admin hardcoded da função |
| `120300` | Agendamento do sync via `pg_cron` + `invoke_edge_function()` |
| `120400` | Expiração de links compartilhados |

**Verificar** — as duas tabelas que hoje devolvem 404 precisam existir:

```bash
curl -s "$SUPABASE_URL/rest/v1/webhook_events?select=id&limit=1" -H "apikey: $ANON_KEY"
curl -s "$SUPABASE_URL/rest/v1/system_config?select=key&limit=1"  -H "apikey: $ANON_KEY"
```

Antes do push: `404`. Depois: `200` com `[]` (vazio é correto — RLS nega leitura
para a chave anônima, mas a tabela existe).

---

## 4. Publicar as Edge Functions

13 funções mudaram. Para não esquecer nenhuma:

```bash
supabase functions deploy \
  ai-closing-recommendation \
  ai-chat \
  ai-lottery-predict \
  ai-pattern-analysis \
  ai-simulation-analysis \
  ai-massive-simulation \
  ai-autonomous-learning \
  pre-draw-alert \
  stripe-webhook \
  check-subscription \
  create-checkout \
  customer-portal \
  sync-lottery-draws
```

⚠️ **`ai-closing-recommendation` é a mais urgente.** Enquanto ela não for
publicada, continua no ar a versão **sem autenticação** que expõe o gateway de
IA pago.

**Verificar** — a sonda que antes atravessava até o gateway agora deve parar no 401:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "$SUPABASE_URL/functions/v1/ai-closing-recommendation" \
  -H "Content-Type: application/json" -d '{}'
```

Antes: `500`. Depois: **`401`**.

E o rate limit deve existir (chame 21x autenticado; a 21ª devolve `429`).

---

## 5. Recarregar os créditos de IA

O gateway respondeu, em sonda real:

```
402 {"type":"payment_required","title":"Not enough credits","requires":"top_up"}
```

Isso é estado da conta, não do código. Enquanto não houver crédito, todo
recurso de IA cai no fallback estatístico local — que funciona, mas o cliente
que pagou por IA recebe um aviso de "IA indisponível" em toda operação.

**Verificar:** com um usuário `lifetime`, abrir a Central de Análise e acionar
a análise de padrões. O toast deve ser de sucesso, não "IA indisponível".

---

## 6. Confirmar que o sync automático roda

```sql
-- jobs criados pela migration 120300
select jobname, schedule, active from cron.job order by jobname;
```

Esperado: `sync-lottery-draws` (`*/30 * * * *`), `sync-lottery-draws-alerts`
(`40 * * * *`), `pre-draw-alert` (`*/30 * * * *`), `cleanup-expired-shares`
(`15 3 * * *`).

Depois de ~30 minutos:

```sql
select * from cron.job_run_details order by start_time desc limit 10;
```

**`status` deve ser `succeeded`.** Se aparecer `failed`, o `command` traz o
motivo — foi para isso que `invoke_edge_function()` passou a levantar exceção
em vez de concatenar `NULL` em silêncio.

**Verificar o resultado de negócio:**

```sql
select lottery_id, max(concurso), max(drawn_at),
       (current_date - max(drawn_at)) as dias_atraso
  from lottery_draws group by 1 order by 1;
```

Na auditoria, Lotofácil estava em **3798 (06/10)** enquanto a fonte oficial
tinha **3800 (08/10)**. Depois do sync, `dias_atraso` deve cair para 0–1.

---

## 7. Sentry (opcional, mas recomendado)

`VITE_SENTRY_DSN` está vazio, então o Sentry está inerte: erros em produção
não chegam a lugar nenhum. Configure o DSN na hospedagem e refaça o build.

---

## Rollback

```bash
supabase db reset --linked        # NÃO use em produção: recria o banco
```

Para produção, o caminho é restaurar o dump do passo 1 e republicar a versão
anterior das funções a partir do commit `fda524fa`.

---

## O que continua aberto depois de tudo isso

Não são bloqueadores, mas ficam registrados:

- **Fonte de dados é um Herokuapp de terceiro** (`loteriascaixa-api.herokuapp.com`),
  não a Caixa. Sem SLA, sem fallback. Decisão de negócio.
- **Gaps históricos** não preenchidos: Timemania −17, Federal −18, Dia de Sorte −3.
- **`signup-guard` é chamado do frontend**, então o limite de contas por IP é
  burlável chamando a API de signup diretamente. Mitigado pelo fato de conta
  `free` não ter acesso a nenhum recurso pago (as 7 funções de IA exigem plano).
- **`LotteryConfig` × `LotteryProfile`** descrevem a mesma loteria em dois
  lugares. Fundir é refatoração com risco de regressão; deixado de propósito.
- **`read-create-play-main/`** (7,3 MB) permanece: `roadmap.md` registra que a
  remoção foi vetada.
