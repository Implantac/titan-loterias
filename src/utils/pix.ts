/**
 * Titan Loterias — Gerador local de payload PIX (BR Code; sem validação bancária)
 *
 * Gera payloads EMV QR Code estático, sujeitos à validação pelo aplicativo bancário
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

/** Validação sintática; não comprova titularidade, existência ou aceitação bancária. */
export function isValidPixKey(value: string): boolean {
  const key = value.trim();
  return (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && key.length <= 77)
    || /^\+55[1-9][0-9]{10}$/.test(key)
    || /^\d{11}$/.test(key)
    || /^\d{14}$/.test(key)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
}

/** Gera payload PIX localmente; chave inválida ou valor não representável não gera código. */
export function generatePixPayload(config: PixConfig): string {
  const rawKey = config.key.trim();
  if (!isValidPixKey(rawKey)) return "";
  if (config.amount !== undefined && (!Number.isFinite(config.amount) || config.amount <= 0 || config.amount > 9999999999.99)) return "";

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
  organizerFeeAmount?: number;
  costPerShare: number;
  totalShares: number;
  pixKey: string;
  pixPayload?: string;
  organizerName?: string;
  strategySummary?: string;
}

/**
 * Monta mensagem de planejamento de bolão; não confirma aposta ou recebimento.
 */
export function formatBolaoWhatsAppMessage(config: BolaoWhatsAppConfig): string {
  const lines: string[] = [
    `🎲 *${config.bolaoTitle.toUpperCase()}*`,
    `🏆 Modalidade: *${config.lotteryName}*${config.concurso ? ` (Concurso #${config.concurso})` : ""}`,
    "",
    `📊 *ESTRUTURA DO JOGO:*`,
    `• Jogos planejados: *${config.gamesCount}*`,
    config.strategySummary ? `• Estratégia: *${config.strategySummary}*` : `• Estratégia: *Filtros Titan & Desdobramento Quantitativo*`,
    `• Custo total planejado: *R$ ${config.totalCost.toFixed(2).replace(".", ",")}*`,
    `• Inclui taxa privada do organizador (não é tarifa Caixa): *R$ ${(config.organizerFeeAmount ?? 0).toFixed(2).replace(".", ",")}*`,
    `• Total de Cotas: *${config.totalShares} cotas*`,
    "",
    `💰 *VALOR POR COTA:*`,
    `👉 *R$ ${config.costPerShare.toFixed(2).replace(".", ",")}*`,
    "",
  ].filter(Boolean);

  if (isValidPixKey(config.pixKey)) {
    lines.push("", `⚡ *CHAVE PIX INFORMADA PELO ORGANIZADOR:*`, `• Chave: \`${config.pixKey.trim()}\``);
    if (config.organizerName) lines.push(`• Nome informado: *${config.organizerName}* (confira titular no banco)`);
  }

  if (config.pixPayload && isValidPixKey(config.pixKey)) {
    lines.push(
      "",
      `📱 *PIX COPIA E COLA — VALOR DE UMA COTA:*`,
      `\`${config.pixPayload}\``,
      "",
      `_O código representa apenas uma cota. Confira destinatário e valor no aplicativo do banco; para várias cotas, confirme o total individual com o organizador._`
    );
  }

  lines.push(
    "",
    `Este é um planejamento interno: não comprova aposta na Caixa, pagamento nem participação oficial. Confirme as regras e exija o comprovante oficial da aposta.`
  );

  return lines.join("\n");
}
