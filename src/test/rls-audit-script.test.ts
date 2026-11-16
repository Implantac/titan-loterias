import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve(process.cwd(), 'scripts/audit-rls-readonly.mjs');

describe('auditoria RLS somente leitura', () => {
  it('aborta antes de conectar quando faltam duas contas de teste', () => {
    const run = spawnSync(process.execPath, [script], {
      env: { PATH: process.env.PATH || '' }, encoding: 'utf8', timeout: 5000,
    });
    expect(run.status).toBe(2);
    expect(run.stdout).toBe('');
    expect(run.stderr).toContain('DUAS contas comuns');
  });
  it('não aprova ausência de fixtures nem papel não verificável', () => {
    const source = readFileSync(script, 'utf8');
    expect(source).toContain("if (!roles?.length)");
    expect(source).toContain("expected === 'own' && !error && data?.length === 0");
    expect(source).toContain('process.exitCode = failures ? 1 : inconclusive ? 2 : 0');
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});
