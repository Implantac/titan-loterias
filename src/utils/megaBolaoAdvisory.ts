/** Alertas informativos; NÃO certificam ou criam recibo oficial da Caixa. */
export function megaBolaoAdvisory(gameCount: number, shares: number, baseCost: number): string[] {
  const alerts: string[] = [];
  if (gameCount === 0) return alerts;
  if (shares < 2 || shares > 100) alerts.push("Bolão Caixa Mega-Sena: faixa geral informada de 2 a 100 cotas; o limite específico depende da quantidade de dezenas.");
  if (gameCount > 10) alerts.push("Bolão Caixa Mega-Sena: até 10 jogos em um recibo; este planejamento não equivale a um único recibo oficial.");
  if (baseCost < 18) alerts.push("Bolão Caixa Mega-Sena: valor mínimo divulgado de R$ 18,00 por bolão, sem considerar taxa privada do organizador.");
  if (shares > 0 && baseCost / shares < 7) alerts.push("Bolão Caixa Mega-Sena: cota mínima divulgada de R$ 7,00; taxa privada do organizador não substitui o valor da aposta.");
  return alerts;
}
