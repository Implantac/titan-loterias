/** Janela promocional conforme comunicado Caixa de 03/11/2026.
 * Encerramento de apostas: 31/12/2026 22:00 America/Sao_Paulo.
 * É uma estimativa inicial, não um feed de prêmio em tempo real. */
export const MEGA_VIRADA_2026_SOURCE = 'https://caixanoticias.caixa.gov.br/Paginas/Not%C3%ADcias/2026/11-NOVEMBRO/Premio-da-Mega-da-Virada-2026-deve-ultrapassar-R-1-bilhao.aspx';

export function isMegaViradaCampaignActive(now: Date): boolean {
  if (Number.isNaN(now.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const local = `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}`;
  return local >= '202611030000' && local < '202612312200';
}
