/**
 * exportService.js — ISW SIRH
 * Fonctions utilitaires pour l'export en PDF (jsPDF) et Excel (SheetJS)
 */

// ─── Formatage FCFA ───────────────────────────────────────────────────────────
// NB : Intl('XOF') produit des espaces insécables (U+202F et U+00A0) que jsPDF
// (police standard WinAnsi) ne sait pas encoder → montants corrompus dans le PDF
// (ex. « 465 /000 F /CFA »). On formate en nombre pur, on normalise les espaces
// en ASCII (0x20) via \s (couvre U+202F/U+00A0), puis on colle le suffixe FCFA.
export const formatFCFA = (val) => {
  const num = Math.round(Number(val) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
};

// ─── En-tête ISW pour PDF ─────────────────────────────────────────────────────
const addPdfHeader = (doc, title, period) => {
  const pageW = doc.internal.pageSize.getWidth();

  // Bande de couleur en haut
  doc.setFillColor(109, 40, 217); // violet-700
  doc.rect(0, 0, pageW, 28, 'F');

  // Titre de l'entreprise
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('ISW TECHNOSYS SARL', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 200, 255);
  doc.text('Système Intégré de Ressources Humaines', 14, 19);

  // Titre du rapport (droite)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW - 14, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 200, 255);
  doc.text(`Période : ${period}`, pageW - 14, 19, { align: 'right' });

  // Ligne de séparation
  doc.setDrawColor(200, 180, 255);
  doc.setLineWidth(0.3);
  doc.line(0, 28, pageW, 28);
};

// ─── Pied de page PDF ─────────────────────────────────────────────────────────
const addPdfFooter = (doc) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(14, pageH - 15, pageW - 14, pageH - 15);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Généré le ${now} — ISW TECHNOSYS SIRH v1.0`, 14, pageH - 8);
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageW - 14, pageH - 8, { align: 'right' });
};

// ─── Export PDF générique ─────────────────────────────────────────────────────
// NB : jspdf-autotable v5 a changé d'API. Le plugin ne s'applique plus
// automatiquement sur le prototype jsPDF : il faut utiliser la forme
// fonctionnelle autoTable(doc, options) au lieu de doc.autoTable(options).
export const exportToPDF = async (title, period, columns, rows, filename, summaryRows = []) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  addPdfHeader(doc, title, period);

  // Résumé rapide (optionnel)
  let lastFinalY = 34;
  if (summaryRows.length > 0) {
    autoTable(doc, {
      startY: 34,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [109, 40, 217] },
        1: { fontStyle: 'bold', textColor: [30, 41, 59] }
      },
      tableWidth: 'wrap',
      margin: { left: 14 }
    });
    lastFinalY = (doc.lastAutoTable?.finalY ?? 34) + 8;
  }

  autoTable(doc, {
    startY: lastFinalY,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [109, 40, 217],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => addPdfFooter(doc),
  });

  doc.save(`${filename}.pdf`);
};

// ─── Export Excel générique (exceljs) ────────────────────────────────────────
export const exportToExcel = async (sheetName, columns, rows, filename) => {
  const ExcelJS = (await import('exceljs')).default;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ISW TECHNOSYS SIRH v1.0';
  wb.created = new Date();

  // Feuille de données
  const ws = wb.addWorksheet(sheetName.substring(0, 31));

  // Colonnes avec largeur auto
  ws.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(col.length + 6, 18),
  }));

  // Style en-tête
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF4C1D95' } }
    };
  });
  ws.getRow(1).height = 20;

  // Données
  rows.forEach((row, rowIdx) => {
    const wsRow = ws.addRow(row);
    wsRow.eachCell((cell) => {
      cell.font = { size: 9 };
      cell.alignment = { vertical: 'middle' };
      if (rowIdx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // Feuille info
  const infoWs = wb.addWorksheet('Infos');
  infoWs.addRow(['ISW TECHNOSYS SARL — SIRH v1.0']);
  infoWs.addRow([`Rapport : ${sheetName}`]);
  infoWs.addRow([`Généré le : ${new Date().toLocaleDateString('fr-FR')}`]);
  infoWs.getRow(1).font = { bold: true, size: 12, color: { argb: 'FF6D28D9' } };

  // Téléchargement
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
