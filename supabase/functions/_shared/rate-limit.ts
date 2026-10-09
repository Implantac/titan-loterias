/**
 * Rate limiting simples por usuário para funções caras (chamadas de IA).
 *
 * LIMITAÇÃO CONHECIDA E ACEITA: o contador vive na memória do isolate do
 * Edge Function. Ele é reiniciado em cold start e não é compartilhado entre
 * regiões. Ou seja, isto NÃO é um limite duro — é uma proteção barata contra
 * o caso comum (um usuário logado em loop, ou um script batendo na função),
 * sem exigir tabela nem roundtrip extra no banco a cada chamada.
 *
 * Se o custo de IA se tornar material, troque por um contador no Postgres
 * (tabela + `INSERT ... ON CONFLICT`) ou por rate limiting no gateway.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Evita crescimento ilimitado do Map em isolates de vida longa. */
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitOptions {
  /** Máximo de chamadas dentro da janela. */
  max: number;
  /** Janela em milissegundos. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Segundos até a janela liberar uma nova chamada. */
  retryAfterSec: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    // Controle de memória: se o Map cresceu demais, descarta chaves ociosas.
    if (buckets.size >= MAX_TRACKED_KEYS) {
      for (const [k, b] of buckets) {
        if (b.hits.every((t) => t < cutoff)) buckets.delete(k);
      }
      // Se mesmo assim continuar cheio, limpa tudo — pior caso o limite
      // reinicia, o que é aceitável para uma proteção não-dura.
      if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    }
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  bucket.hits = bucket.hits.filter((t) => t >= cutoff);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.hits.push(now);
  return { allowed: true, remaining: opts.max - bucket.hits.length, retryAfterSec: 0 };
}

/** Resposta 429 padronizada. */
export function rateLimited(retryAfterSec: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "Muitas solicitações. Aguarde alguns segundos e tente novamente.",
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

/**
 * Limites por função. Chamadas de IA são as mais caras e por isso as mais
 * restritas. Ajuste aqui, não espalhado pelos handlers.
 */
export const AI_RATE_LIMIT: RateLimitOptions = { max: 20, windowMs: 60_000 };
