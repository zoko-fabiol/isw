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

import { logoBase64 } from './logoBase64';

// ─── En-tête ISW pour PDF ─────────────────────────────────────────────────────
const addPdfHeader = (doc, title, period) => {
  const pageW = doc.internal.pageSize.getWidth();

  // Bande de couleur en haut (isw-blue: RGB 46, 139, 192)
  doc.setFillColor(46, 139, 192); 
  doc.rect(0, 0, pageW, 28, 'F');

  // Essayer de charger le logo de l'entreprise si présent
  try {
    if (logoBase64) {
      // Dessine le logo découpé directement en haut à gauche
      doc.addImage(logoBase64, 'PNG', 12, 7, 14, 14);
    }
  } catch (e) {
    console.error("Erreur d'insertion du logo PDF :", e);
  }

  // Titre de l'entreprise (décalé à gauche pour laisser place au logo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('ISW TECHNOSYS SARL', 29, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(210, 235, 250);
  doc.text('Système Intégré de Ressources Humaines', 29, 19);

  // Titre du rapport (droite)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW - 14, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(210, 235, 250);
  doc.text(`Période : ${period}`, pageW - 14, 19, { align: 'right' });

  // Ligne de séparation
  doc.setDrawColor(165, 215, 245);
  doc.setLineWidth(0.3);
  doc.line(0, 28, pageW, 28);
};

// ─── Pied de page PDF ─────────────────────────────────────────────────────────
const addPdfFooter = (doc) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  doc.setDrawColor(220, 230, 240);
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

  // Optimisé pour le format Portrait A4
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  addPdfHeader(doc, title, period);

  // Résumé rapide (optionnel)
  let lastFinalY = 34;
  if (summaryRows.length > 0) {
    autoTable(doc, {
      startY: 34,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [46, 139, 192] },
        1: { fontStyle: 'bold', textColor: [30, 41, 59] }
      },
      tableWidth: 'wrap',
      margin: { left: 14 }
    });
    lastFinalY = (doc.lastAutoTable?.finalY ?? 34) + 6;
  }

  autoTable(doc, {
    startY: lastFinalY,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [46, 139, 192],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    margin: { left: 10, right: 10 },
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

  // Style en-tête (isw-blue ARGB: FF2DE5C0/FF2E8BC0 -> FF2E8BC0)
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E8BC0' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF1C5E83' } }
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
  infoWs.getRow(1).font = { bold: true, size: 12, color: { argb: 'FF2E8BC0' } };

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

// ─── Export Liste du Personnel personnalisé sous Word (.doc / .docx compatible) ───
export const exportEmployeesWord = (columns, rows, title) => {
  // Construire un document HTML structuré pour Word avec des styles CSS en ligne
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #334155; }
        .header { background-color: #2e8bc0; color: white; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
        .header-content { display: table; width: 100%; }
        .header-logo { display: table-cell; vertical-align: middle; width: 50px; }
        .header-text { display: table-cell; vertical-align: middle; padding-left: 15px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0 0 0; font-size: 11px; color: #d2ebfa; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background-color: #2e8bc0; color: white; font-weight: bold; font-size: 11px; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
        td { padding: 8px; border: 1px solid #e2e8f0; font-size: 10px; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        .footer { margin-top: 30px; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-content">
          <div class="header-logo">
            <img src="${logoBase64}" width="40" height="40" alt="Logo" style="border-radius: 6px;"/>
          </div>
          <div class="header-text">
            <h1>ISW TECHNOSYS SARL</h1>
            <p>Rapport : ${title} &bull; Généré le ${now}</p>
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell || ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        Généré via ISW TECHNOSYS SIRH — Document compatible Microsoft Word
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

