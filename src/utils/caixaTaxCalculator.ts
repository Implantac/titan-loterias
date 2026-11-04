/**
 * Titan Loterias - Calculadora Oficial de Retenção de IRRF e Guia de Resgate Caixa
 * 
 * Regras Oficiais da Caixa Econômica Federal e Receita Federal do Brasil:
 * - Faixa de Isenção Oficial: R$ 2.428,80 (Tabela IRPF)
 * - Alíquota de IRRF: 30% retido na fonte sobre o valor que exceder a faixa de isenção
 * - Caducidade do Prêmio: 90 dias corridos após a data do sorteio (Lei nº 13.756/2018)
 * - Prêmios até R$ 2.428,80: Resgate direto em qualquer Casa Lotérica credenciada ou Agência
 * - Prêmios acima de R$ 2.428,80: Resgate EXCLUSIVO em Agências da Caixa
 * - Prêmios a partir de R$ 10.000,00: Compensação e pagamento em D+2 (dois dias úteis)
 */

export const CAIXA_TAX_RULES = {
  EXEMPTION_THRESHOLD: 2428.80,
  WITHHOLDING_TAX_RATE: 0.30,
  REDEMPTION_DEADLINE_DAYS: 90,
  LOTTERY_SHOP_MAX_PAYOUT: 2428.80,
  BRANCH_IMMEDIATE_MAX_PAYOUT: 10000.00,
  LARGE_PRIZE_PAYOUT_DELAY_DAYS: 2,
} as const;

export interface NetPrizeCalculation {
  grossAmount: number;
  taxWithheld: number;
  netAmount: number;
  isExempt: boolean;
  effectiveTaxRatePercent: number;
}

export interface BolaoShareTaxSplit {
  totalGrossAmount: number;
  totalNetAmount: number;
  totalTaxWithheld: number;
  totalShares: number;
  netPerShare: number;
  grossPerShare: number;
  taxWithheldPerShare: number;
}

export interface CaixaRedemptionStep {
  title: string;
  description: string;
  location: "Loterica" | "Agencia Caixa";
  requirement: string;
}

/**
 * Calcula o valor líquido do prêmio de loteria após retenção do IRRF na fonte
 */
export function calculateNetPrize(grossAmount: number): NetPrizeCalculation {
  if (grossAmount <= 0) {
    return {
      grossAmount: 0,
      taxWithheld: 0,
      netAmount: 0,
      isExempt: true,
      effectiveTaxRatePercent: 0,
    };
  }

  if (grossAmount <= CAIXA_TAX_RULES.EXEMPTION_THRESHOLD) {
    return {
      grossAmount,
      taxWithheld: 0,
      netAmount: grossAmount,
      isExempt: true,
      effectiveTaxRatePercent: 0,
    };
  }

  const taxableBase = grossAmount - CAIXA_TAX_RULES.EXEMPTION_THRESHOLD;
  const taxWithheld = taxableBase * CAIXA_TAX_RULES.WITHHOLDING_TAX_RATE;
  const netAmount = grossAmount - taxWithheld;
  const effectiveTaxRatePercent = (taxWithheld / grossAmount) * 100;

  return {
    grossAmount,
    taxWithheld,
    netAmount,
    isExempt: false,
    effectiveTaxRatePercent,
  };
}

/**
 * Calcula a divisão proporcional líquida por cota para participantes de Bolão
 */
export function calculateBolaoShareSplit(
  totalGrossAmount: number,
  totalShares: number
): BolaoShareTaxSplit {
  const safeShares = Math.max(1, totalShares);
  const netCalc = calculateNetPrize(totalGrossAmount);

  return {
    totalGrossAmount,
    totalNetAmount: netCalc.netAmount,
    totalTaxWithheld: netCalc.taxWithheld,
    totalShares: safeShares,
    netPerShare: netCalc.netAmount / safeShares,
    grossPerShare: totalGrossAmount / safeShares,
    taxWithheldPerShare: netCalc.taxWithheld / safeShares,
  };
}

/**
 * Retorna as orientações oficiais para resgate do prêmio na Caixa
 */
export function getCaixaRedemptionGuidance(grossAmount: number): {
  channel: "Loterica ou Agencia" | "Agencia Caixa Exclusiva";
  timeframe: string;
  deadlineAlert: string;
  steps: CaixaRedemptionStep[];
} {
  const isLargePrize = grossAmount >= CAIXA_TAX_RULES.BRANCH_IMMEDIATE_MAX_PAYOUT;
  const isBranchOnly = grossAmount > CAIXA_TAX_RULES.LOTTERY_SHOP_MAX_PAYOUT;

  const steps: CaixaRedemptionStep[] = [
    {
      title: "Preservação e Identificação do Comprovante",
      description: "Escreva no verso do comprovante original de aposta o seu nome completo, CPF e assinatura para evitar que terceiros resgatem.",
      location: isBranchOnly ? "Agencia Caixa" : "Loterica",
      requirement: "Bilhete impresso original sem rasuras ou danos ao código de barras",
    },
    {
      title: "Documentação Obrigatória",
      description: "Apresente documento oficial de identificação com foto (RG, CNH) e CPF original regularizado.",
      location: isBranchOnly ? "Agencia Caixa" : "Loterica",
      requirement: "Documento oficial original e CPF regular",
    },
  ];

  if (isBranchOnly) {
    steps.push({
      title: "Atendimento no Gerente de Pessoa Física",
      description: isLargePrize
        ? "Prêmios a partir de R$ 10.000,00 são conferidos e pagos após 2 dias úteis (D+2) através de crédito em conta Caixa ou TED/PIX para outro banco."
        : "O resgate é processado e creditado na sua conta ou pago em cheque administrativo no mesmo dia.",
      location: "Agencia Caixa",
      requirement: "Conta corrente/poupança em seu nome ou dados para transferência",
    });
  }

  return {
    channel: isBranchOnly ? "Agencia Caixa Exclusiva" : "Loterica ou Agencia",
    timeframe: isLargePrize ? "Compensação em D+2 úteis" : "Pagamento Imediato",
    deadlineAlert: "Atenção: Os prêmios prescrevem após 90 dias corridos do sorteio. Valores não reclamados são repassados ao FIES.",
    steps,
  };
}
