/** Registro interno de organização de bolão. Hash detecta alterações no conteúdo,
 * mas não autentica participantes, pagamentos ou data perante terceiros. */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface BolaoContractParticipant {
  name: string;
  shares: number;
  cost: number;
  phone?: string;
  cpf?: string;
  paid: boolean;
}

export interface BolaoContractConfig {
  lotteryId: string;
  lotteryName: string;
  concurso?: number;
  drawDate?: string;
  organizerName: string;
  organizerCpf?: string;
  organizerPixKey: string;
  organizerCity: string;
  totalCost: number;
  organizerFeeAmount?: number;
  priceReference?: string;
  totalShares: number;
  costPerShare: number;
  participants: BolaoContractParticipant[];
  games: number[][];
}

export interface BolaoContractData {
  sha256Seal: string;
  contractId: string;
  timestampIso: string;
  formattedDate: string;
  legalTerms: string[];
}

/**
 * Calcula SHA-256 dos campos selecionados do planejamento no ambiente Web Crypto
 */
export async function calculateBolaoSha256(canonicalString: string): Promise<string> {
  // Use Web Crypto API
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("SHA-256 indisponível neste ambiente; não é seguro emitir hash alternativo.");
}

/**
 * Cria resumo de campos selecionados para comparação interna (não autentica o PDF)
 */
export async function createBolaoContract(config: BolaoContractConfig): Promise<BolaoContractData> {
  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // String canônica normalizada
  const sortedGames = config.games.map((g) => [...g].sort((a, b) => a - b).join("-")).join(";");
  const sortedParticipants = [...config.participants]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `${p.name}:${p.shares}:${p.paid ? "PAGO" : "PENDENTE"}`)
    .join(";");

  const canonicalPayload = [
    `LOTTERY=${config.lotteryId.toUpperCase()}`,
    `CONCURSO=${config.concurso || "NA"}`,
    `ORGANIZER=${config.organizerName.toUpperCase()}`,
    `PIX=${config.organizerPixKey}`,
    `TOTAL_COST=${config.totalCost.toFixed(2)}`,
    `ORGANIZER_FEE=${(config.organizerFeeAmount ?? 0).toFixed(2)}`,
    `PRICE_REFERENCE=${config.priceReference ?? "TABELA_INTERNA_TITAN"}`,
    `TOTAL_SHARES=${config.totalShares}`,
    `PARTICIPANTS=${sortedParticipants}`,
    `GAMES=${sortedGames}`,
  ].join("|");

  const sha256Seal = await calculateBolaoSha256(canonicalPayload);
  const contractId = `BOL-${config.lotteryId.substring(0, 4).toUpperCase()}-${sha256Seal.substring(0, 8).toUpperCase()}`;

  const legalTerms = [
    "REGISTRO INTERNO: Este documento lista uma proposta de organização entre participantes. Não é bilhete, recibo de aposta, comprovante de pagamento, contrato validado juridicamente nem confirmação de participação em Bolão Caixa.",
    "APOSTAS OFICIAIS: O organizador deve registrar e conferir os jogos nos canais oficiais da Caixa. Sem comprovante oficial, a lista abaixo não demonstra que qualquer aposta foi realizada.",
    "COTAS E PAGAMENTOS: Participantes, valores e status refletem apenas informações declaradas no Titan. Confirme individualmente transferências, divisão acordada e comprovantes de cada participante.",
    "HASH SHA-256: O resumo permite comparar os campos selecionados do planejamento com outra cópia calculada pela mesma versão do aplicativo; não autentica o PDF inteiro. Sem assinatura digital confiável ou carimbo de tempo independente, ele não prova autoria, data anterior ao sorteio ou validade jurídica. Consulte orientação profissional para acordos formais.",
  ];

  return {
    sha256Seal,
    contractId,
    timestampIso,
    formattedDate,
    legalTerms,
  };
}

/**
 * Gera o PDF de registro interno, sem efeito de comprovante oficial
 */
export async function generateBolaoContractPdf(config: BolaoContractConfig): Promise<void> {
  const contract = await createBolaoContract(config);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Cabeçalho do registro interno
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TITAN LOTERIAS — REGISTRO INTERNO DE BOLÃO", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Identificador interno: ${contract.contractId}`,
    14,
    20
  );

  // Hash de conteúdo (não é carimbo de tempo)
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(14, 33, 182, 16, 2, 2, "FD");

  doc.setTextColor(6, 95, 70); // emerald-800
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("HASH DE CONTEÚDO SHA-256 (SEM CARIMBO DE TEMPO):", 18, 39);

  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text(contract.sha256Seal, 18, 44);

  // Resumo Operacional
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("1. DADOS DA OPERAÇÃO E DO ORGANIZADOR", 14, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Modalidade: ${config.lotteryName.toUpperCase()}${config.concurso ? ` | Concurso: #${config.concurso}` : ""}`, 14, 61);
  doc.text(`Organizador informado: ${config.organizerName.toUpperCase()}`, 14, 66);
  doc.text(`Chave PIX informada pelo organizador: ${config.organizerPixKey || "Não informada"} (${config.organizerCity})`, 14, 71);
  doc.text(`Custo Total: R$ ${config.totalCost.toFixed(2)} | Cotas Totais: ${config.totalShares} | Valor/Cota: R$ ${config.costPerShare.toFixed(2)}`, 14, 76);
  doc.text(`Data local de geração do registro: ${contract.formattedDate}`, 14, 81);
  doc.text(`Inclui taxa privada do organizador (não Caixa): R$ ${(config.organizerFeeAmount ?? 0).toFixed(2)}`, 14, 85);
  doc.text(`Preço: ${config.priceReference ? `manual (${config.priceReference})` : "tabela interna Titan"}; confirme na Caixa`, 14, 88);

  // Tabela de Participantes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("2. QUADRO DE COTISTAS E PARTICIPANTES", 14, 98);

  const participantRows = config.participants.map((p, idx) => [
    `#${String(idx + 1).padStart(2, "0")}`,
    p.name.toUpperCase(),
    `${p.shares} cota(s)`,
    `R$ ${p.cost.toFixed(2)}`,
    p.paid ? "MARCADO PAGO" : "PENDENTE",
  ]);

  autoTable(doc, {
    startY: 102,
    head: [["Item", "Nome do Participante", "Cotas", "Valor", "Status informado"]],
    body: participantRows,
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Tabela de Jogos
  const afterParticipantsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (afterParticipantsY > 230) {
    doc.addPage();
  }

  const tableStartY = afterParticipantsY > 230 ? 20 : afterParticipantsY;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`3. JOGOS PLANEJADOS (NÃO REGISTRADOS NA CAIXA) (${config.games.length} JOGOS)`, 14, tableStartY);

  const gamesRows = config.games.map((game, idx) => {
    const sorted = [...game].sort((a, b) => a - b).map((n) => String(n).padStart(2, "0")).join(" ");
    return [`Jogo #${String(idx + 1).padStart(3, "0")}`, sorted, `${game.length} dezenas`];
  });

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [["Jogo", "Dezenas Assinaladas", "Tipo"]],
    body: gamesRows,
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    styles: { font: "courier", fontSize: 8, cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Avisos e limitações na última página
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("4. AVISOS E LIMITAÇÕES DO REGISTRO INTERNO", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  let currentY = 28;
  contract.legalTerms.forEach((term) => {
    const lines = doc.splitTextToSize(term, 182);
    doc.text(lines, 14, currentY);
    currentY += lines.length * 4.5 + 4;
  });

  // Espaço opcional para ciência manuscrita; não autentica o arquivo
  currentY += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 15, 90, currentY + 15);
  doc.line(120, currentY + 15, 190, currentY + 15);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(config.organizerName.toUpperCase(), 55, currentY + 20, { align: "center" });
  doc.text("ORGANIZADOR(A) INFORMADO(A)", 55, currentY + 24, { align: "center" });

  doc.text("TESTEMUNHA / COTISTA", 155, currentY + 20, { align: "center" });
  doc.text("CIÊNCIA DOS PARTICIPANTES (SE ASSINADO)", 155, currentY + 24, { align: "center" });

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(14, 285, 196, 285);
    doc.text(
      `Titan Loterias — Registro interno, sem comprovante oficial | ID: ${contract.contractId}`,
      14,
      290
    );
    doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: "right" });
  }

  const filename = `Registro_Interno_Bolao_${config.lotteryId}_${contract.contractId}.pdf`;
  doc.save(filename);
}
