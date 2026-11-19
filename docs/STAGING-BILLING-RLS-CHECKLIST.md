# Homologação em staging — billing e RLS (não executada)

**Estado:** preparação somente. Não presume migrações aplicadas, funções publicadas, pagamentos aprovados nem isolamento comprovado. Não executar em produção como atalho. A conexão Supabase e duas contas comuns de teste ainda precisam ser disponibilizadas por meio seguro.

## 1. Identificar e isolar o ambiente

- Confirmar URL e referência do projeto de **staging** e registrar um identificador não sensível do ambiente. Não reutilizar projeto de produção nem chaves Stripe live.
- Confirmar que o frontend de staging aponta ao Supabase de staging e usa preços Stripe **test**; não inferir isso pelo nome do host.
- Criar duas contas comuns A e B, com dados próprios nas tabelas da auditoria. Não enviar senhas ou tokens no chat e não colocar credenciais em arquivos versionados.
- Fazer inventário de migrações já aplicadas e versões reais das quatro funções de billing. Comparar diferenças antes de qualquer `db push`.
- Backup restaurável e plano de rollback testado **antes** de alterações. Verificar assinatura/segredo do webhook de teste sem divulgar o valor.

## 2. Pré-condições das migrações

- Confirmar existência e unicidade de `profiles.stripe_customer_id` (migration `20261009120000`). Não aplicar `20261113000001` sem essa coluna.
- Levantar **contagem**, sem exportar dados pessoais: perfis pagos sem vínculo Stripe, vínculos duplicados e eventos `plan_sync.missing_binding`. Qualquer divergência bloqueia a publicação até reconciliação manual com evidência Stripe independente do e-mail.
- Revisar a fila completa: `20261113000000` restringe cache de IA; `20261113000001` protege vínculo Stripe. Um `db push` pode aplicar **ambas** e outras pendências. Validar em staging isolado, sem executar automaticamente em produção.
- Testar que usuário `authenticated` não consegue inserir nem alterar `stripe_customer_id`, incluindo `NULL -> ID` e `ID -> outro ID`; confirmar que serviço autorizado ainda consegue vincular cliente.

## 3. RLS somente leitura

- Rodar `node scripts/audit-rls-readonly.mjs` com seis variáveis `RLS_*` descritas em `docs/rls-audit.md`, fornecidas apenas pelo mecanismo seguro do ambiente. Código 2 significa **inconclusivo**; código 0 cobre somente SELECT das tabelas listadas.
- Rodar `node scripts/audit-ai-cache-readonly.mjs` com chave pública de staging após a migração; 200 com `[]` **não é aprovação**. Confirmar separadamente que serviço autorizado ainda funciona.
- Planejar testes de escrita cruzada, storage e políticas de funções privilegiadas; scripts de leitura não cobrem essas superfícies.

## 4. Checkout e webhook Stripe test

- Implantar coordenadamente `create-checkout`, `check-subscription`, `customer-portal` e `stripe-webhook`, com secrets Stripe **test**, depois das migrações e da reconciliação de perfis. `APP_ORIGIN` e origens permitidas devem apontar para staging.
- Com A, abrir checkout de teste e verificar **antes de pagar** que o cliente Stripe foi vinculado somente ao perfil A. Confirmar que B não abre portal de A nem assume o plano de A, mesmo com alteração de e-mail de teste.
- Testar pagamento anual (renovação automática), pagamento único vitalício, compra pendente/assíncrona, checkout cancelado e retorno sem sessão. URL de retorno não comprova pagamento.
- Verificar assinatura de cada evento, gravação em `webhook_events`, reenvio idempotente, plano correto no perfil correspondente, falha do ledger retornando HTTP 500 e eventos sem vínculo registrados para reconciliação sem concessão por e-mail.
- Testar cancelamento, expiração e falha de pagamento; registrar expectativa de acesso e diferença entre cancelamento imediato e fim do período contratado.
- Validar página `/payment-success`: pendente/erro não deve afirmar confirmação e resultado verificado não deve confiar no parâmetro `plan` da URL.

## 5. Go/no-go e produção

Registrar apenas resultados agregados e evidências sem credenciais, tokens ou dados pessoais. **Go** somente com migrations, funções, RLS, billing e rollback verificados em staging. Antes de produção: novo backup, análise do diff real e autorização explícita para implantação. Commit na `main` não prova deploy em Lovable nem Supabase.
