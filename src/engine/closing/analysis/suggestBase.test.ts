import { describe, expect, it } from 'vitest';
import { suggestBase } from './suggestBase';

const input = { totalNumbers: 25, pick: 15, ticketPrice: 3.5, targetGuarantee: 12, recentDraws: [] as number[][] };

describe('sugestão de bases candidatas', () => {
  it('entrega bases completas e distintas também sem histórico', () => {
    const results = suggestBase(input);
    expect(results.length).toBeGreaterThan(0);
    for (const candidate of results) {
      expect(candidate.numbers).toHaveLength(candidate.baseSize);
      expect(new Set(candidate.numbers).size).toBe(candidate.baseSize);
      expect(candidate.rationale.join(' ')).not.toMatch(/cobre garantia|garantia matemática/i);
    }
  });
  it('ignora dezenas históricas fora da modalidade', () => {
    const results = suggestBase({ ...input, recentDraws: [[0, 26, 100, 1]] });
    expect(results.every(c => c.numbers.every(n => n >= 1 && n <= 25))).toBe(true);
  });
  it('não oferece sugestão com entrada inválida', () => {
    expect(suggestBase({ ...input, targetGuarantee: 16 })).toEqual([]);
    expect(suggestBase({ ...input, ticketPrice: 0 })).toEqual([]);
  });
});
