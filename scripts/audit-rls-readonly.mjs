/**
 * Auditoria RLS SOMENTE LEITURA. Exige duas contas comuns distintas (não admin).
 * Não imprime IDs, e-mails, senhas, tokens ou conteúdo dos registros.
 * Uso: veja docs/rls-audit.md. Não usa service_role.
 */
import { createClient } from '@supabase/supabase-js';

const { RLS_SUPABASE_URL: url, RLS_SUPABASE_ANON_KEY: key,
  RLS_USER_A_EMAIL: emailA, RLS_USER_A_PASSWORD: passwordA,
  RLS_USER_B_EMAIL: emailB, RLS_USER_B_PASSWORD: passwordB } = process.env;
if (![url, key, emailA, passwordA, emailB, passwordB].every(Boolean)) {
  console.error('Defina URL, chave anon e credenciais de DUAS contas comuns; consulte docs/rls-audit.md.');
  process.exit(2);
}
if (emailA.toLowerCase() === emailB.toLowerCase()) {
  console.error('As duas contas devem ser distintas.');
  process.exit(2);
}

const makeClient = () => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const a = makeClient();
const b = makeClient();
const anonymous = makeClient();
const tables = [
  ['profiles', 'id'],
  ['saved_bets', 'user_id'],
  ['generation_history', 'user_id'],
  ['closing_history', 'user_id'],
];

async function login(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user?.id) throw new Error('Autenticação de conta de teste falhou.');
  const id = data.user.id;
  const { data: roles, error: rolesError } = await client.from('user_roles').select('role').eq('user_id', id);
  if (rolesError) throw new Error('Falha ao verificar papel da conta de teste.');
  if (roles?.some(r => r.role !== 'user')) throw new Error('Conta privilegiada detectada: abortando auditoria.');
  return id;
}

let failures = 0;
async function check(client, table, column, id, expected, label) {
  // select apenas id, sem ler campos pessoais nem salvar respostas.
  const { data, error } = await client.from(table).select(column).eq(column, id).limit(1);
  const ok = !error && (expected === 'own' ? data?.length === 1 : data?.length === 0);
  console.log(`${ok ? 'OK' : 'FALHA'} ${label}: ${table}`);
  if (!ok) failures++;
}

try {
  const [idA, idB] = await Promise.all([
    login(a, emailA, passwordA), login(b, emailB, passwordB),
  ]);
  if (idA === idB) throw new Error('As credenciais resolveram para a mesma conta.');
  for (const [table, column] of tables) {
    if (table === 'profiles') {
      await check(a, table, column, idA, 'own', 'A lê seu perfil');
      await check(b, table, column, idB, 'own', 'B lê seu perfil');
    }
    await check(a, table, column, idB, 'other', 'A não lê B');
    await check(b, table, column, idA, 'other', 'B não lê A');
  }
  const { data: anonRows, error: anonError } = await anonymous.from('profiles').select('id').limit(1);
  const anonOk = (anonError?.code === '42501') || (!anonError && anonRows?.length === 0);
  console.log(`${anonOk ? 'OK' : 'FALHA'} anônimo não lista perfis`);
  if (!anonOk) failures++;
  console.log(failures ? `${failures} verificação(ões) falharam.` : 'Verificações de leitura passaram; escrita ainda NÃO foi auditada.');
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  // Nunca registrar objetos de erro do SDK: podem incluir URLs/tokens.
  console.error(error instanceof Error ? error.message : 'Erro não identificado.');
  process.exitCode = 2;
} finally {
  await Promise.all([a.auth.signOut({ scope: 'local' }), b.auth.signOut({ scope: 'local' })]);
}
