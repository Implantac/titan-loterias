import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261113000000_restrict_ai_analysis_cache.sql'), 'utf8');

describe('migração de restrição do cache de IA', () => {
  it('retira acesso público e escopa a política ao papel de serviço', () => {
    expect(sql).toContain('REVOKE ALL ON TABLE public.ai_analysis_cache FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('DROP POLICY IF EXISTS "Anyone can read AI cache"');
    expect(sql).toMatch(/FOR ALL TO service_role USING \(true\) WITH CHECK \(true\)/);
  });
  it('não apaga dados do cache', () => {
    expect(sql).not.toMatch(/DELETE FROM|TRUNCATE|DROP TABLE/i);
  });
});
