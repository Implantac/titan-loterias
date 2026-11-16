import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'scripts/audit-ai-cache-readonly.mjs');

describe('sonda de isolamento do cache de IA', () => {
  it('não conecta sem credenciais de homologação', () => {
    const run = spawnSync(process.execPath, [path], {
      env: { PATH: process.env.PATH || '' }, encoding: 'utf8', timeout: 5000,
    });
    expect(run.status).toBe(2);
    expect(run.stdout).toBe('');
  });
  it('não considera HTTP 200 com tabela vazia uma aprovação', () => {
    const source = readFileSync(path, 'utf8');
    expect(source).toContain('response.status === 401 || response.status === 403');
    expect(source).toContain('else if (response.ok)');
    expect(source).toContain('process.exitCode = 1');
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});
