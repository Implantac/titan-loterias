/** Sonda RLS do cache de IA: somente SELECT id LIMIT 1, sem imprimir dados. */
const url = process.env.RLS_SUPABASE_URL;
const key = process.env.RLS_SUPABASE_ANON_KEY;
if (!url || !key || !/^https:\/\//.test(url)) {
  console.error('Defina URL HTTPS e chave pública anon de homologação; consulte docs/rls-audit.md.');
  process.exit(2);
}
try {
  const endpoint = new URL('/rest/v1/ai_analysis_cache', url);
  endpoint.searchParams.set('select', 'id');
  endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  });
  // 200 [] ainda significa que SELECT foi aceito; não é prova de isolamento.
  if (response.status === 401 || response.status === 403) {
    console.log('OK: SELECT público negado (HTTP 401/403).');
  } else if (response.ok) {
    console.error('FALHA: SELECT público aceito, mesmo que a tabela esteja vazia.');
    process.exitCode = 1;
  } else {
    console.error(`INCONCLUSIVO: resposta HTTP ${response.status}; investigar sem imprimir corpo.`);
    process.exitCode = 2;
  }
} catch {
  console.error('INCONCLUSIVO: conexão/timeout; sem acesso a dados.');
  process.exitCode = 2;
}
