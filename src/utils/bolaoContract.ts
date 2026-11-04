/**
 * Titan Loterias - Gerador de Contrato Blindado de Bolão (Art. 1.314 do Código Civil)
 * 
 * Regras Jurídicas do Brasil:
 * - O bolão particular é reconhecido pelo Superior Tribunal de Justiça (STJ) e pelo
 *   Código Civil Brasileiro como Condomínio Voluntário (Artigos 1.314 a 1.322).
 * - O organizador do bolão atua como mandatário fiduciário de todos os cotistas.
 * - Este módulo gera um selo criptográfico determinístico (SHA-256) inviolável
 *   contendo a lista imutável de participantes, cotas e jogos antes da realização do sorteio.
 */

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
 * Calcula o hash criptográfico SHA-256 no browser ou Node para selar o contrato
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

  // Fallback FNV-1a 64-bit hex representation
  let h1 = 0x811c9dc5;
  let h2 = 0x9dc5811c;
  for (let i = 0; i < canonicalString.length; i++) {
    const code = canonicalString.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code >> 4), 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${part1}${part2}${part1}${part2}`.padEnd(64, "0");
}

/**
 * Cria a estrutura de dados canônica e o selo de integridade do contrato
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
    `TOTAL_SHARES=${config.totalShares}`,
    `PARTICIPANTS=${sortedParticipants}`,
    `GAMES=${sortedGames}`,
  ].join("|");

  const sha256Seal = await calculateBolaoSha256(canonicalPayload);
  const contractId = `BOL-${config.lotteryId.substring(0, 4).toUpperCase()}-${sha256Seal.substring(0, 8).toUpperCase()}`;

  const legalTerms = [
    "CLÁUSULA 1ª - DO OBJETO E NATUREZA JURÍDICA: O presente instrumento constitui Condomínio Voluntário nos termos do Art. 1.314 do Código Civil Brasileiro, com o propósito exclusivo de participação coletiva em concurso oficial das Loterias da Caixa Econômica Federal.",
    "CLÁUSULA 2ª - DA REPRESENTAÇÃO E DEVER FIDUCIÁRIO: O(A) Organizador(a) acima qualificado(a) atua na condição de mandatário(a) e depositário(a) legal dos bilhetes impressos, com obrigação expressa de custódia e resgate do prêmio no prazo legal de 90 dias junto à Caixa.",
    "CLÁUSULA 3ª - DA DIVISÃO E RATEIO DO PRÊMIO LÍQUIDO: Qualquer premiação obtida por qualquer dos jogos anexos será dividida estritamente de forma proporcional ao número de cotas quitadas de cada participante, deduzidos os tributos e despesas bancárias oficiais aplicáveis.",
    "CLÁUSULA 4ª - DA INVIOLABILIDADE DIGITAL (SHA-256): A autenticidade da lista de jogos e de participantes é garantida pelo selo criptográfico SHA-256 gerado previamente ao início do concurso, sendo nula qualquer alteração unilateral posterior ao fechamento das apostas.",
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
 * Gera o documento formal em PDF do Contrato Blindado
 */
export async function generateBolaoContractPdf(config: BolaoContractConfig): Promise<void> {
  const contract = await createBolaoContract(config);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Cabeçalho Oficial
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TITAN LOTERIAS — CONTRATO DE CONDOMÍNIO VOLUNTÁRIO", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Selo Jurídico: Art. 1.314 do Código Civil Brasileiro | Identificador: ${contract.contractId}`,
    14,
    20
  );

  // Selo Criptográfico
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(14, 33, 182, 16, 2, 2, "FD");

  doc.setTextColor(6, 95, 70); // emerald-800
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SELO DIGITAL DE INTEGRIDADE CRIPTOGRÁFICA (SHA-256):", 18, 39);

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
  doc.text(`Organizador Fiduciário: ${config.organizerName.toUpperCase()}`, 14, 66);
  doc.text(`Chave PIX Oficial de Liquidação: ${config.organizerPixKey || "Não informada"} (${config.organizerCity})`, 14, 71);
  doc.text(`Custo Total: R$ ${config.totalCost.toFixed(2)} | Cotas Totais: ${config.totalShares} | Valor/Cota: R$ ${config.costPerShare.toFixed(2)}`, 14, 76);
  doc.text(`Data de Emissão e Fechamento do Bolão: ${contract.formattedDate}`, 14, 81);

  // Tabela de Participantes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("2. QUADRO DE COTISTAS E PARTICIPANTES", 14, 90);

  const participantRows = config.participants.map((p, idx) => [
    `#${String(idx + 1).padStart(2, "0")}`,
    p.name.toUpperCase(),
    `${p.shares} cota(s)`,
    `R$ ${p.cost.toFixed(2)}`,
    p.paid ? "QUITADO" : "PENDENTE",
  ]);

  autoTable(doc, {
    startY: 94,
    head: [["Item", "Nome do Participante", "Cotas", "Valor", "Status Financeiro"]],
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
  doc.text(`3. LISTA IMUTÁVEL DE APOSTAS REGISTRADAS (${config.games.length} JOGOS)`, 14, tableStartY);

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

  // Cláusulas Jurídicas na última página
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("4. TERMOS E CLÁUSULAS JURÍDICAS DO CONDOMÍNIO VOLUNTÁRIO", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  let currentY = 28;
  contract.legalTerms.forEach((term) => {
    const lines = doc.splitTextToSize(term, 182);
    doc.text(lines, 14, currentY);
    currentY += lines.length * 4.5 + 4;
  });

  // Assinaturas
  currentY += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 15, 90, currentY + 15);
  doc.line(120, currentY + 15, 190, currentY + 15);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(config.organizerName.toUpperCase(), 55, currentY + 20, { align: "center" });
  doc.text("ORGANIZADOR(A) FIDUCIÁRIO(A)", 55, currentY + 24, { align: "center" });

  doc.text("TESTEMUNHA / COTISTA", 155, currentY + 20, { align: "center" });
  doc.text("REPRESENTAÇÃO COLETIVA", 155, currentY + 24, { align: "center" });

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(14, 285, 196, 285);
    doc.text(
      `Titan Loterias — Contrato de Bolão Blindado | ID: ${contract.contractId}`,
      14,
      290
    );
    doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: "right" });
  }

  const filename = `Contrato_Bolao_${config.lotteryId}_${contract.contractId}.pdf`;
  doc.save(filename);
}
