/**
 * Titan Loterias — Utilitário Oficial de PIX (Padrão Banco Central do Brasil / BR Code)
 *
 * Gera payloads EMV QR Code estático compatíveis com qualquer aplicativo bancário (Nubank, Itaú, Bradesco, BB, Inter, etc.)
 * e mensagens automáticas formatadas para grupos de Bolão no WhatsApp.
 */

import QRCode from "qrcode";

export interface PixConfig {
  key: string;
  name: string;
  city?: string;
  amount?: number;
  txid?: string;
  description?: string;
}

/**
 * Remove acentos e caracteres especiais incompatíveis com a especificação EMV do BACEN.
 */
function sanitizeAscii(str: string, maxLen: number): string {
  const normalized = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toUpperCase();
  return normalized.slice(0, maxLen);
}

/**
 * Formata campo TLV (Tag - Length - Value) padrão EMV.
 */
function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Cálculo do CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 * Conforme Manual de Padrões para Iniciação do PIX — Banco Central do Brasil.
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o payload PIX Copia e Cola padrão Banco Central.
 */
export function generatePixPayload(config: PixConfig): string {
  const rawKey = config.key.trim();
  if (!rawKey) return "";

  const merchantName = sanitizeAscii(config.name || "ORGANIZADOR BOLAO", 25) || "ORGANIZADOR BOLAO";
  const merchantCity = sanitizeAscii(config.city || "SAO PAULO", 15) || "SAO PAULO";
  const txid = config.txid ? sanitizeAscii(config.txid, 25) : "***";

  // ID 00: Payload Format Indicator (versão 01)
  let payload = formatTLV("00", "01");

  // ID 26: Merchant Account Information - GUI br.gov.bcb.pix
  let merchantInfo = formatTLV("00", "br.gov.bcb.pix") + formatTLV("01", rawKey);
  if (config.description) {
    const desc = sanitizeAscii(config.description, 25);
    if (desc) {
      merchantInfo += formatTLV("02", desc);
    }
  }
  payload += formatTLV("26", merchantInfo);

  // ID 52: Merchant Category Code (0000 = Geral)
  payload += formatTLV("52", "0000");

  // ID 53: Transaction Currency (986 = BRL Real)
  payload += formatTLV("53", "986");

  // ID 54: Transaction Amount (opcional se for 0 ou indefinido)
  if (config.amount && config.amount > 0) {
    const formattedAmount = config.amount.toFixed(2);
    payload += formatTLV("54", formattedAmount);
  }

  // ID 58: Country Code (BR)
  payload += formatTLV("58", "BR");

  // ID 59: Merchant Name
  payload += formatTLV("59", merchantName);

  // ID 60: Merchant City
  payload += formatTLV("60", merchantCity);

  // ID 62: Additional Data Field (Reference Label / TXID)
  payload += formatTLV("62", formatTLV("05", txid));

  // ID 63: CRC16 (Calculado sobre toda a string incluindo '6304')
  payload += "6304";
  const checksum = calculateCRC16(payload);
  payload += checksum;

  return payload;
}

/**
 * Gera o Data URL do QR Code em PNG diretamente no cliente (100% offline).
 */
export async function generatePixQrCodeDataUrl(payload: string): Promise<string> {
  if (!payload) return "";
  try {
    return await QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar QR Code PIX:", error);
    return "";
  }
}

export interface BolaoWhatsAppConfig {
  bolaoTitle: string;
  lotteryName: string;
  concurso?: number;
  gamesCount: number;
  totalCost: number;
  costPerShare: number;
  totalShares: number;
  pixKey: string;
  pixPayload?: string;
  organizerName?: string;
  strategySummary?: string;
}

/**
 * Monta mensagem padronizada para convocação e cobrança de Bolão no WhatsApp.
 */
export function formatBolaoWhatsAppMessage(config: BolaoWhatsAppConfig): string {
  const lines: string[] = [
    `🎲 *${config.bolaoTitle.toUpperCase()}*`,
    `🏆 Modalidade: *${config.lotteryName}*${config.concurso ? ` (Concurso #${config.concurso})` : ""}`,
    "",
    `📊 *ESTRUTURA DO JOGO:*`,
    `• Total de Apostas: *${config.gamesCount} jogos*`,
    config.strategySummary ? `• Estratégia: *${config.strategySummary}*` : `• Estratégia: *Filtros Titan & Desdobramento Quantitativo*`,
    `• Custo Total das Apostas: *R$ ${config.totalCost.toFixed(2).replace(".", ",")}*`,
    `• Total de Cotas: *${config.totalShares} cotas*`,
    "",
    `💰 *VALOR POR COTA:*`,
    `👉 *R$ ${config.costPerShare.toFixed(2).replace(".", ",")}*`,
    "",
    `⚡ *DADOS PARA PAGAMENTO PIX:*`,
    `• Chave PIX: \`${config.pixKey}\``,
    config.organizerName ? `• Titular: *${config.organizerName}*` : "",
  ].filter(Boolean);

  if (config.pixPayload) {
    lines.push(
      "",
      `📱 *PIX COPIA E COLA:*`,
      `\`${config.pixPayload}\``,
      "",
      `_(Basta copiar o código acima e colar no app do seu banco na opção 'PIX Copia e Cola')_`
    );
  }

  lines.push(
    "",
    `🚀 *Participe confirmando sua cota! Vamos juntos em busca do prêmio máximo!*`
  );

  return lines.join("\n");
}
