# Verificação de isolamento RLS — somente leitura

Este script **não cria contas, não modifica dados e não prova segurança completa**. Use duas contas comuns de teste, distintas, em um projeto Supabase de homologação com migrações equivalentes às de produção. **Não use a conta proprietária/superadministradora nem a chave `service_role`.** A auditoria aborta se `user_roles` indicar papel privilegiado.

Variáveis obrigatórias (forneça no terminal/gerenciador de segredos; não crie `.env` versionado):

- `RLS_SUPABASE_URL`: URL do projeto de homologação.
- `RLS_SUPABASE_ANON_KEY`: chave pública anon do projeto.
- `RLS_USER_A_EMAIL`, `RLS_USER_A_PASSWORD`: primeira conta comum.
- `RLS_USER_B_EMAIL`, `RLS_USER_B_PASSWORD`: segunda conta comum.

Execute `npm ci` e depois `node scripts/audit-rls-readonly.mjs`. O script consulta apenas identificadores e não imprime IDs nem dados pessoais. Ele verifica perfis próprios, ausência de leitura cruzada em `profiles`, `saved_bets`, `generation_history`, `closing_history` e ausência de listagem anônima de perfis. O script agora exige ao menos um registro próprio por usuário em **cada** tabela auditada; sem fixtures, marca a verificação **INCONCLUSIVA** e retorna código 2, em vez de aprovação. Prepare esses registros previamente apenas em homologação com contas comuns; o script não cria, edita nem remove registros. Ausência de dados não demonstra isolamento. A auditoria **não cobre INSERT/UPDATE/DELETE, funções SECURITY DEFINER, links de compartilhamento, storage ou outras tabelas**. Resultados da homologação não provam políticas idênticas em produção.

Se uma verificação falhar, não use dados retornados nem divulgue identificadores: interrompa a publicação, corrija a política e repita o teste. Nunca registre senhas, tokens ou resultados integrais em CI.

Códigos de saída: `0` = leitura verificada com fixtures, `1` = pelo menos uma falha de isolamento/consulta, `2` = pré-condição não atendida ou auditoria inconclusiva. Mesmo `0` não cobre escrita nem políticas fora das tabelas listadas.
