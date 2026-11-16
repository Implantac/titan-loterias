import { describe, expect, it } from 'vitest';
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
  it('aponta para notícia oficial', () => {
    expect(MEGA_VIRADA_2026_SOURCE).toMatch(/^https:\/\/caixanoticias\.caixa\.gov\.br\//);
  });
});
