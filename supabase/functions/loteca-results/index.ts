// Proxy público para resultados oficiais da Loteca (Caixa). Dados públicos — sem dados de usuário.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const url = new URL(req.url);
    let concurso = url.searchParams.get("concurso");
    if (!concurso && req.method === "POST") {
      try { concurso = (await req.json())?.concurso?.toString() ?? null; } catch { /* sem corpo */ }
    }
    if (concurso && !/^\d{1,5}$/.test(concurso)) {
      return new Response(JSON.stringify({ error: "concurso inválido" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const res = await fetch(concurso ? `${BASE}/${concurso}` : BASE, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
    if (!res.ok) throw new Error(`Caixa respondeu ${res.status}`);
    const d = await res.json();
    const jogos = (d.listaResultadoEquipeEsportiva ?? []).map((j: any) => {
      const g1 = j.nuGolEquipeUm, g2 = j.nuGolEquipeDois;
      const resultado = g1 == null || g2 == null ? null : g1 > g2 ? "1" : g1 < g2 ? "2" : "X";
      return { seq: j.nuSequencial, casa: j.nomeEquipeUm, fora: j.nomeEquipeDois, golsCasa: g1, golsFora: g2, resultado, data: j.dtJogo, dia: j.diaSemana };
    }).sort((a: any, b: any) => a.seq - b.seq);
    const body = {
      concurso: d.numero, data: d.dataApuracao, acumulado: d.acumulado,
      proximoConcurso: d.numeroConcursoProximo, dataProximo: d.dataProximoConcurso,
      estimativaProximo: d.valorEstimadoProximoConcurso, arrecadado: d.valorArrecadado,
      faixas: (d.listaRateioPremio ?? []).map((f: any) => ({ descricao: f.descricaoFaixa, ganhadores: f.numeroDeGanhadores, premio: f.valorPremio })),
      jogos,
    };
    return new Response(JSON.stringify(body), { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
