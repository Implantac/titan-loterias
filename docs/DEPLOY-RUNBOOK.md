# Runbook de implantação — pendências de produção

Gerado em **09/10/2026** a partir da auditoria; verificação pública atualizada em **13/11/2026**.
O frontend foi confirmado pelo usuário no Lovable. O estado de migrations e Edge Functions
no Supabase precisa de confirmação separada com acesso autorizado ao projeto.

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

O bloco abaixo documenta as cinco migrations da auditoria de outubro. **Não execute
`supabase db push` em produção sem revisar o plano completo**: o repositório agora
também contém uma migration de novembro para o cache de IA, ainda não validada
no projeto de homologação. Faça backup, liste diferenças pendentes com o CLI e
valide cada uma em homologação antes de qualquer aplicação em produção.

As cinco migrations históricas de outubro foram validadas em PostgreSQL 17
(aplicação em ordem + 12 testes funcionais de comportamento):

| Migration | O que faz |
|---|---|
| `120000` | Índices de billing, `webhook_events` com `UNIQUE(event_id)`, RLS |
| `120100` | `drawn_at` + trigger, FK em `closing_history`, remoção de órfãos |
| `120200` | `system_config`; tira o e-mail de admin hardcoded da função |
| `120300` | Agendamento do sync via `pg_cron` + `invoke_edge_function()` |
| `120400` | Expiração de links compartilhados |
| `20261113000000` | **Pendente de homologação:** revoga acesso público ao cache de IA e restringe política a `service_role` |

**Cache de IA (migration de novembro):** o código histórico concede `SELECT` público
por RLS e usa políticas de escrita intituladas “Service role” sem `TO service_role`.
Uma sonda pública (`select=id&limit=1`) recebeu HTTP 200 e zero linhas em
13/11/2026; isso **não prova que haja registros expostos**, mas não é uma
negação de acesso. Antes de migrar, revise dependências e permissões efetivas em
homologação. Após a migration, a mesma consulta com chave pública deve ser
negada (não apenas retornar `[]`); consultas das Edge Functions com `service_role`
devem continuar funcionando. Nenhuma mudança no banco foi aplicada por esta auditoria.

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

⚠️ **`ai-closing-recommendation` exige verificação separada do frontend.**
A sonda pública não autenticada abaixo retornou `401` em 13/11/2026 com
`UNAUTHORIZED_NO_AUTH_HEADER`. Isso demonstra rejeição da requisição sem cabeçalho
pelo gateway Supabase, **não** prova qual versão do código da função está implantada,
nem se o novo contrato (sem campos de ROI/cobertura prevista) foi publicado.

```bash
curl -s -i -X POST \
  "$SUPABASE_URL/functions/v1/ai-closing-recommendation" \
  -H "Content-Type: application/json" -d '{}'
```

Para confirmar a versão, um operador autorizado deve comparar o deployment da função
no painel/CLI com o código em `supabase/functions/ai-closing-recommendation/index.ts`,
implantar essa versão se necessário e testar com **conta premium de homologação**.
A resposta autenticada pode depender do saldo do gateway; erro do provedor não
prova que o novo contrato funciona. Uma conta comum sem plano elegível deve receber
negação de acesso antes do gateway. Não use contas de produção nem faça 21 chamadas
pagas para testar o rate limit; teste o limite em homologação isolada com orçamento
controlado e logs.

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

## Revisão de vínculo Stripe (código de novembro, ainda não implantado)

**Não implante apenas uma função:** `create-checkout`, `customer-portal`,
`check-subscription` e `stripe-webhook` agora dependem de
`profiles.stripe_customer_id`. A migração
`20261113000001_protect_stripe_customer_binding.sql` impede que usuários
comuns alterem esse vínculo; depende da coluna introduzida em `120000`.
**Não execute `db push` em produção para aplicar só isto:** ele pode incluir
outras migrations pendentes. Backup, inventário das versões efetivas e ensaio em
homologação são pré-requisitos.

Antes do deploy, com acesso administrativo autorizado, confira em homologação:

```sql
-- Não exporte e-mails, IDs ou resultados individuais para o chat.
SELECT count(*) AS paid_without_binding FROM public.profiles
 WHERE plan IN ('premium', 'professional', 'lifetime') AND stripe_customer_id IS NULL;
SELECT stripe_customer_id, count(*) FROM public.profiles
 WHERE stripe_customer_id IS NOT NULL GROUP BY stripe_customer_id HAVING count(*) > 1;
```

Reconcilie vínculos legados a partir de evidências Stripe verificadas (não apenas
e-mail), incluindo assinaturas e compras vitalícias. Teste tentativa de alterar
`stripe_customer_id` por uma conta `authenticated` comum (deve falhar), criação
de checkout, pagamento teste, webhook assinado, portal e consulta do plano em
**duas contas comuns distintas**. Eventos sem vínculo ficam registrados como
`plan_sync.missing_binding` para reconciliação manual; não concedem plano por
e-mail. Confirmar se o webhook de teste efetivamente entregou o evento e se o
plano foi atualizado no perfil correto. Testar também estorno/cancelamento.
Sem estas verificações, checkout e billing permanecem **não homologados**.

## Aviso pré-sorteio suspenso (até calendário futuro verificável)

A função `pre-draw-alert` anterior assumia uma janela fixa de 17h BRT em todos
os dias, dizia "sorteio em 2h" sem confirmar o próximo horário oficial e enviava
um payload que `send-push` não reconhecia. A versão do código agora exige chave
de serviço e responde `suspended: true`, `notified: 0`, sem enviar push. A opção
T-2h foi removida da interface (preferências antigas não foram apagadas).
**A suspensão só vale após deploy da Edge Function e do frontend**; publicar só
o frontend deixa o cron antigo executando. Para reativar, é necessário calendário
futuro verificável por modalidade, fuso horário correto, idempotência de aviso
e teste da integração entre funções. Não prometer alertas de 2h antes disso.
