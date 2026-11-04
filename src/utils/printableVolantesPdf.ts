/**
 * Titan Loterias - Printable Volantes Gabarito PDF Generator
 * 
 * Gera um PDF formatado em A4 pronto para impressão, facilitando a
 * marcação manual de volantes na casa lotérica sem erros de digitação.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface VolantesGabaritoConfig {
  games: number[][];
  lotteryName: string;
  lotteryId: string;
  concurso?: number;
}

export function generateVolantesGabaritoPdf({
  games,
  lotteryName,
  lotteryId,
  concurso,
}: VolantesGabaritoConfig) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TITAN LOTERIAS — GABARITO DE MARCAÇÃO DE VOLANTES", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Modalidade: ${lotteryName.toUpperCase()}${concurso ? ` | Concurso Previsto: #${concurso}` : ""} | Total de Jogos: ${games.length} | Gerado em: ${dateFormatted}`,
    14,
    19
  );

  // Subtitle Instructions
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(
    "INSTRUÇÕES: Utilize este gabarito para assinalar com caneta preta ou azul os volantes oficiais na Casa Lotérica.",
    14,
    33
  );

  // Table Body
  const tableRows = games.map((game, idx) => {
    const sorted = [...game].sort((a, b) => a - b);
    const formattedNumbers = sorted.map((n) => String(n).padStart(2, "0")).join("   ");
    return [
      `Volante #${String(idx + 1).padStart(3, "0")}`,
      formattedNumbers,
      `${sorted.length} dezenas`,
      "[   ] Conferido",
    ];
  });

  autoTable(doc, {
    startY: 37,
    head: [["Volante / Jogo", "Dezenas a Marcar no Volante", "Qtd", "Check"]],
    body: tableRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "center",
    },
    styles: {
      font: "courier",
      fontSize: 9,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold", halign: "center", font: "helvetica" },
      1: { cellWidth: 110, fontStyle: "bold", halign: "left" },
      2: { cellWidth: 24, halign: "center", font: "helvetica" },
      3: { cellWidth: 24, halign: "center", font: "helvetica", textColor: [100, 116, 139] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(14, 285, 196, 285);
    doc.text(
      "Titan Loterias — Inteligência Matemática & Automação para Loterias Caixa",
      14,
      290
    );
    doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: "right" });
  }

  const filename = `Gabarito_Marcacao_${lotteryId}_${games.length}_jogos.pdf`;
  doc.save(filename);
}
