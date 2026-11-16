import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMegaViradaCampaignActive, MEGA_VIRADA_2026_SOURCE } from './megaViradaCampaign';

describe('campanha Mega da Virada 2026', () => {
  it('exibe apenas após início divulgado pela Caixa', () => {
    expect(isMegaViradaCampaignActive(new Date('2026-11-02T23:59:00-03:00'))).toBe(false);
    expect(isMegaViradaCampaignActive(new Date('2026-11-03T00:00:00-03:00'))).toBe(true);
  });
  it('encerra no horário de fechamento de apostas em São Paulo', () => {
    expect(isMegaViradaCampaignActive(new Date('2026-12-31T21:59:00-03:00'))).toBe(true);
    expect(isMegaViradaCampaignActive(new Date('2026-12-31T22:00:00-03:00'))).toBe(false);
    expect(isMegaViradaCampaignActive(new Date('2027-01-01T12:00:00-03:00'))).toBe(false);
    expect(isMegaViradaCampaignActive(new Date('invalid'))).toBe(false);
  });
  it('oferece vídeo leve, silencioso e controle acessível', () => {
    const component = readFileSync(resolve(process.cwd(), 'src/components/landing/MegaViradaBanner.tsx'), 'utf8');
    const file = resolve(process.cwd(), 'public/media/mega-virada-2026.mp4');
    expect(statSync(file).size).toBeLessThan(2_000_000);
    expect(component).toContain('muted');
    expect(component).toContain('playsInline');
    expect(component).toContain('prefers-reduced-motion: reduce');
    expect(component).toContain('Pausar vídeo da Mega da Virada');
    expect(component).toContain('poster="/media/mega-virada-2026-poster.jpg"');
  });
  it('aponta para notícia oficial', () => {
    expect(MEGA_VIRADA_2026_SOURCE).toMatch(/^https:\/\/caixanoticias\.caixa\.gov\.br\//);
  });
});
