import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, FileSpreadsheet, Download, Users, Clock, AlarmClock, CreditCard, TrendingUp, Loader2, CheckCircle2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, exportToExcel, formatFCFA } from '../services/exportService';

// ─── Composant de carte de rapport ───────────────────────────────────────────
function ReportCard({ icon: Icon, iconColor, iconBg, gradient, title, description, stats, onExportPDF, onExportExcel, loading, pdfOnly }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      {/* Bandeau coloré */}
      <div className={`h-1.5 w-full ${gradient}`} />

      <div className="p-6 flex-1 flex flex-col gap-4">
        {/* En-tête */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-800 text-base leading-tight">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          {stats.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600">
              <span className="text-isw-blue">{s.icon}</span>
              {s.label}
            </span>
          ))}
        </div>

        {/* Boutons */}
        <div className="mt-auto flex gap-2 pt-2 border-t border-slate-50">
          <button
            onClick={onExportPDF}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-isw-blue hover:bg-isw-blue-light disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm shadow-isw-blue/10 transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            PDF
          </button>
          {!pdfOnly && (
            <button
              onClick={onExportExcel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-200 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale Bilans ────────────────────────────────────────────────────
export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [delaysList, setDelaysList] = useState([]);
  const [overtimeList, setOvertimeList] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [settings, setSettings] = useState({ standardHours: 173, socialContributionRate: 12 });
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [selectedDept, setSelectedDept] = useState('Tous');
  const [loading, setLoading] = useState({});
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    dbService.getEmployees().then(setEmployees);
    dbService.getSettings().then(setSettings);
    const unsubAtt = dbService.subscribeAttendance(setAttendanceList);
    const unsubDel = dbService.subscribeDelays(setDelaysList);
    const unsubOvt = dbService.subscribeOvertime(setOvertimeList);
    const unsubPay = dbService.subscribePayrolls(setPayrolls);
    return () => { unsubAtt(); unsubDel(); unsubOvt(); unsubPay(); };
  }, []);

  const showToast = (msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  // Mois affiché en format lisible
  const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Départements uniques
  const depts = ['Tous', ...new Set(employees.map(e => e.department).filter(Boolean))];

  // Employés filtrés
  const filteredEmps = selectedDept === 'Tous' ? employees : employees.filter(e => e.department === selectedDept);

  // Données filtrées
  const filteredAtt = attendanceList.filter(a => a.date && a.date.startsWith(selectedMonth));
  const filteredDel = delaysList.filter(d => d.date && d.date.startsWith(selectedMonth));
  const filteredOvt = overtimeList.filter(o => o.monthYear === selectedMonth);
  const filteredPay = payrolls.filter(p => p.monthYear === selectedMonth);

  // ── BILAN PRÉSENCE ──────────────────────────────────────────────────────────
  const handlePresencePDF = async () => {
    setLoad('presencePDF', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Poste', 'Présents', 'Abs. Justifiées', 'Abs. Injustifiées', 'Congés', 'Maladie', 'Taux'];
      const rows = filteredEmps.map(emp => {
        const empAtt = filteredAtt.filter(a => a.employeeId === emp.id);
        const present = empAtt.filter(a => a.status === 'Présent').length;
        const absJ = empAtt.filter(a => a.status === 'Absence justifiée').length;
        const absI = empAtt.filter(a => a.status === 'Absence injustifiée').length;
        const conge = empAtt.filter(a => a.status === 'Congé').length;
        const mal = empAtt.filter(a => a.status === 'Maladie').length;
        const total = empAtt.length;
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : 'N/A';
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, emp.role, present, absJ, absI, conge, mal, rate];
      });
      const totalPresent = filteredAtt.filter(a => a.status === 'Présent').length;
      const totalWorkable = filteredAtt.length;
      const avgRate = totalWorkable > 0 ? ((totalPresent / totalWorkable) * 100).toFixed(1) + '%' : 'N/A';
      const summary = [
        ['Effectif analysé :', `${filteredEmps.length} employés`],
        ['Taux de présence moyen :', avgRate],
        ['Total jours de présence :', `${totalPresent} jours`],
        ['Total pointages :', `${totalWorkable} entrées`],
      ];
      await exportToPDF('BILAN DE PRÉSENCE', periodLabel, cols, rows, `bilan-presence-${selectedMonth}`, summary);
      showToast('✅ Bilan de présence PDF téléchargé !');
    } finally { setLoad('presencePDF', false); }
  };

  const handlePresenceExcel = async () => {
    setLoad('presenceExcel', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Poste', 'Présents', 'Abs. Justifiées', 'Abs. Injustifiées', 'Congés', 'Maladie', 'Taux (%)'];
      const rows = filteredEmps.map(emp => {
        const empAtt = filteredAtt.filter(a => a.employeeId === emp.id);
        const present = empAtt.filter(a => a.status === 'Présent').length;
        const absJ = empAtt.filter(a => a.status === 'Absence justifiée').length;
        const absI = empAtt.filter(a => a.status === 'Absence injustifiée').length;
        const conge = empAtt.filter(a => a.status === 'Congé').length;
        const mal = empAtt.filter(a => a.status === 'Maladie').length;
        const total = empAtt.length;
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, emp.role, present, absJ, absI, conge, mal, rate];
      });
      await exportToExcel('Présence ' + periodLabel, cols, rows, `bilan-presence-${selectedMonth}`);
      showToast('✅ Bilan de présence Excel téléchargé !');
    } finally { setLoad('presenceExcel', false); }
  };

  // ── BILAN RETARDS ────────────────────────────────────────────────────────────
  const handleRetardsPDF = async () => {
    setLoad('retardsPDF', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Nb Retards', 'Total Min.', 'Min. Non Just.', 'Min. Just.', 'Retenue (FCFA)'];
      const rows = filteredEmps.map(emp => {
        const empDel = filteredDel.filter(d => d.employeeId === emp.id);
        const totalMin = empDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const unjMin = empDel.filter(d => d.status === 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const justMin = empDel.filter(d => d.status !== 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const penalty = unjMin * (hr / 60);
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, empDel.length, totalMin, unjMin, justMin, formatFCFA(penalty)];
      }).filter(r => r[3] > 0);
      const totalPenalty = filteredEmps.reduce((s, emp) => {
        const unjMin = filteredDel.filter(d => d.employeeId === emp.id && d.status === 'Non justifié').reduce((s2, d) => s2 + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        return s + unjMin * (hr / 60);
      }, 0);
      const summary = [
        ['Employés avec retards :', `${rows.length}`],
        ['Total retards enregistrés :', `${filteredDel.length}`],
        ['Total minutes cumulées :', `${filteredDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0)} min`],
        ['Total retenues estimées :', formatFCFA(totalPenalty)],
      ];
      await exportToPDF('BILAN DES RETARDS', periodLabel, cols, rows, `bilan-retards-${selectedMonth}`, summary);
      showToast('✅ Bilan des retards PDF téléchargé !');
    } finally { setLoad('retardsPDF', false); }
  };

  const handleRetardsExcel = async () => {
    setLoad('retardsExcel', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Nb Retards', 'Total Min.', 'Min. Non Just.', 'Min. Just.', 'Retenue (FCFA)'];
      const rows = filteredEmps.map(emp => {
        const empDel = filteredDel.filter(d => d.employeeId === emp.id);
        const totalMin = empDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const unjMin = empDel.filter(d => d.status === 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const justMin = empDel.filter(d => d.status !== 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const penalty = unjMin * (hr / 60);
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, empDel.length, totalMin, unjMin, justMin, Math.round(penalty)];
      });
      await exportToExcel('Retards ' + periodLabel, cols, rows, `bilan-retards-${selectedMonth}`);
      showToast('✅ Bilan des retards Excel téléchargé !');
    } finally { setLoad('retardsExcel', false); }
  };

  // ── BILAN H. SUPPLÉMENTAIRES ─────────────────────────────────────────────────
  const handleOvertimePDF = async () => {
    setLoad('overtimePDF', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'H. Contractuelles', 'H. Réelles', 'Écart (h)', 'Taux/h (FCFA)', 'Rémun. H.Sup (FCFA)'];
      const rows = filteredEmps.map(emp => {
        const ot = filteredOvt.find(o => o.employeeId === emp.id);
        const contract = ot ? ot.contractualHours : (settings.standardHours || 173);
        const actual = ot ? ot.actualHours : 0;
        const diff = ot ? ot.overtimeHours : 0;
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const pay = ot ? (Number(ot.overtimePay) || 0) : 0;
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, contract, actual, diff > 0 ? `+${diff}` : diff, formatFCFA(hr), formatFCFA(pay)];
      }).filter(r => r[5] !== 0 && r[5] !== '0');
      const totalPay = filteredOvt.reduce((s, o) => s + (Number(o.overtimePay) || 0), 0);
      const summary = [
        ['Employés avec H.Sup :', `${rows.length}`],
        ['Total H. Supplémentaires :', `${filteredOvt.reduce((s, o) => s + (o.overtimeHours > 0 ? o.overtimeHours : 0), 0)} h`],
        ['Total rémunération H.Sup :', formatFCFA(totalPay)],
      ];
      await exportToPDF('BILAN HEURES SUPPLÉMENTAIRES', periodLabel, cols, rows, `bilan-heures-sup-${selectedMonth}`, summary);
      showToast('✅ Bilan H.Sup PDF téléchargé !');
    } finally { setLoad('overtimePDF', false); }
  };

  const handleOvertimeExcel = async () => {
    setLoad('overtimeExcel', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'H. Contractuelles', 'H. Réelles', 'Écart (h)', 'Taux/h (FCFA)', 'Rémun. H.Sup (FCFA)'];
      const rows = filteredEmps.map(emp => {
        const ot = filteredOvt.find(o => o.employeeId === emp.id);
        const contract = ot ? ot.contractualHours : (settings.standardHours || 173);
        const actual = ot ? ot.actualHours : 0;
        const diff = ot ? ot.overtimeHours : 0;
        const hr = Math.round((Number(emp.baseSalary) || 0) / (settings.standardHours || 173));
        const pay = ot ? Math.round(Number(ot.overtimePay) || 0) : 0;
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, contract, actual, diff, hr, pay];
      });
      await exportToExcel('H.Sup ' + periodLabel, cols, rows, `bilan-heures-sup-${selectedMonth}`);
      showToast('✅ Bilan H.Sup Excel téléchargé !');
    } finally { setLoad('overtimeExcel', false); }
  };

  // ── BILAN DE PAIE ────────────────────────────────────────────────────────────
  const handlePaiePDF = async () => {
    setLoad('paiePDF', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Poste', 'Salaire Base', 'Prime', 'H.Sup', 'Brut', 'Cotisations', 'Retard', 'Net à Payer', 'Statut'];
      const rows = filteredPay.map(pay => {
        const emp = employees.find(e => e.id === pay.employeeId);
        const gross = pay.baseSalary + pay.bonus + pay.overtimePay;
        return [
          pay.employeeId,
          emp ? `${emp.firstName} ${emp.lastName}` : pay.employeeId,
          emp ? emp.role : '—',
          formatFCFA(pay.baseSalary),
          pay.bonus > 0 ? formatFCFA(pay.bonus) : '—',
          pay.overtimePay > 0 ? formatFCFA(pay.overtimePay) : '—',
          formatFCFA(gross),
          formatFCFA(pay.socialContribution),
          pay.delayDeduction > 0 ? formatFCFA(pay.delayDeduction) : '—',
          formatFCFA(pay.netSalary),
          pay.paymentStatus
        ];
      });
      const totalBrut = filteredPay.reduce((s, p) => s + p.baseSalary + p.bonus + p.overtimePay, 0);
      const totalNet = filteredPay.reduce((s, p) => s + p.netSalary, 0);
      const totalCot = filteredPay.reduce((s, p) => s + p.socialContribution, 0);
      const totalRetard = filteredPay.reduce((s, p) => s + p.delayDeduction, 0);
      const pays = filteredPay.filter(p => p.paymentStatus === 'Payé').length;
      const summary = [
        ['Bulletins générés :', `${filteredPay.length}`],
        ['Bulletins réglés :', `${pays} / ${filteredPay.length}`],
        ['Masse salariale brute :', formatFCFA(totalBrut)],
        ['Total cotisations sociales :', formatFCFA(totalCot)],
        ['Total retenues retards :', formatFCFA(totalRetard)],
        ['Masse salariale nette :', formatFCFA(totalNet)],
      ];
      await exportToPDF('BILAN DE PAIE — MASSE SALARIALE', periodLabel, cols, rows, `bilan-paie-${selectedMonth}`, summary);
      showToast('✅ Bilan de paie PDF téléchargé !');
    } finally { setLoad('paiePDF', false); }
  };

  const handlePaieExcel = async () => {
    setLoad('paieExcel', true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Poste', 'Salaire Base', 'Prime', 'H.Sup', 'Brut Total', 'Cotisations Soc.', 'Retenue Retard', 'Net à Payer', 'Statut'];
      const rows = filteredPay.map(pay => {
        const emp = employees.find(e => e.id === pay.employeeId);
        const gross = pay.baseSalary + pay.bonus + pay.overtimePay;
        return [
          pay.employeeId,
          emp ? `${emp.firstName} ${emp.lastName}` : pay.employeeId,
          emp ? emp.role : '—',
          pay.baseSalary,
          pay.bonus,
          pay.overtimePay,
          gross,
          pay.socialContribution,
          pay.delayDeduction,
          pay.netSalary,
          pay.paymentStatus
        ];
      });
      await exportToExcel('Paie ' + periodLabel, cols, rows, `bilan-paie-${selectedMonth}`);
      showToast('✅ Bilan de paie Excel téléchargé !');
    } finally { setLoad('paieExcel', false); }
  };

  // ── BILAN GÉNÉRAL RH ─────────────────────────────────────────────────────────
  const handleGeneralPDF = async () => {
    setLoad('generalPDF', true);
    try {
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const totalPresent = filteredAtt.filter(a => a.status === 'Présent').length;
      const totalWorkable = filteredAtt.length;
      const avgRate = totalWorkable > 0 ? ((totalPresent / totalWorkable) * 100).toFixed(1) : '0';
      const totalDelayMin = filteredDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
      const totalNetPay = filteredPay.reduce((s, p) => s + p.netSalary, 0);
      const totalBrutPay = filteredPay.reduce((s, p) => s + p.baseSalary + p.bonus + p.overtimePay, 0);
      const totalOtHours = filteredOvt.reduce((s, o) => s + (o.overtimeHours > 0 ? o.overtimeHours : 0), 0);

      const summary = [
        ['Effectif actif :', `${activeEmps.length} employés`],
        ['Bulletins de paie générés :', `${filteredPay.length}`],
        ['Taux de présence moyen :', `${avgRate}%`],
        ['Total retards cumulés :', `${totalDelayMin} minutes`],
        ['Total heures supplémentaires :', `${totalOtHours} heures`],
        ['Masse salariale brute :', formatFCFA(totalBrutPay)],
        ['Masse salariale nette :', formatFCFA(totalNetPay)],
      ];

      // Tableau par département
      const deptMap = {};
      activeEmps.forEach(emp => {
        if (!deptMap[emp.department]) deptMap[emp.department] = { emps: 0, present: 0, workable: 0, delays: 0, netPay: 0 };
        deptMap[emp.department].emps++;
        const ea = filteredAtt.filter(a => a.employeeId === emp.id);
        deptMap[emp.department].present += ea.filter(a => a.status === 'Présent').length;
        deptMap[emp.department].workable += ea.length;
        deptMap[emp.department].delays += filteredDel.filter(d => d.employeeId === emp.id).reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const pay = filteredPay.find(p => p.employeeId === emp.id);
        if (pay) deptMap[emp.department].netPay += pay.netSalary;
      });

      const deptCols = ['Département', 'Effectif', 'Taux Présence', 'Total Retards (min)', 'Masse Nette (FCFA)'];
      const deptRows = Object.entries(deptMap).map(([dept, d]) => [
        dept,
        d.emps,
        d.workable > 0 ? ((d.present / d.workable) * 100).toFixed(1) + '%' : 'N/A',
        d.delays,
        formatFCFA(d.netPay)
      ]);

      await exportToPDF('BILAN GÉNÉRAL RH', periodLabel, deptCols, deptRows, `bilan-general-rh-${selectedMonth}`, summary);
      showToast('✅ Bilan Général RH PDF téléchargé !');
    } finally { setLoad('generalPDF', false); }
  };

  // ── Stats globales pour affichage ─────────────────────────────────────────────
  const totalPresent = filteredAtt.filter(a => a.status === 'Présent').length;
  const totalWorkable = filteredAtt.length;
  const avgRate = totalWorkable > 0 ? ((totalPresent / totalWorkable) * 100).toFixed(1) : '0';
  const totalNetPay = filteredPay.reduce((s, p) => s + p.netSalary, 0);
  const totalDelayMin = filteredDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
  const totalOtHours = filteredOvt.reduce((s, o) => s + (o.overtimeHours > 0 ? o.overtimeHours : 0), 0);

  const isAnyLoading = Object.values(loading).some(Boolean);

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">

      {/* Toast notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Bilans & Exports</h2>
          <p className="text-slate-500 text-sm mt-1">
            Téléchargez vos rapports consolidés en PDF ou Excel en un clic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-isw-blue font-semibold text-sm"
          >
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="text-sm font-semibold text-slate-600">Période :</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-isw-blue/30 bg-white rounded-xl text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-isw-blue font-semibold"
          />
        </div>
      </div>

      {/* KPI résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Taux de présence', value: `${avgRate}%`, icon: '📊', color: 'text-isw-blue', bg: 'bg-isw-blue-50' },
          { label: 'Retards cumulés', value: `${totalDelayMin} min`, icon: '⏱', color: 'text-rose-700', bg: 'bg-rose-50' },
          { label: 'Heures supplémentaires', value: `${totalOtHours} h`, icon: '📈', color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Masse salariale nette', value: formatFCFA(totalNetPay), icon: '💳', color: 'text-isw-navy', bg: 'bg-isw-blue-50/50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl ${kpi.bg} flex-shrink-0`}>{kpi.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
              <p className={`text-lg font-black ${kpi.color} truncate`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grille de cartes de rapports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

        <ReportCard
          icon={Clock}
          iconColor="text-isw-blue"
          iconBg="bg-isw-blue-50"
          gradient="bg-gradient-to-r from-isw-blue to-isw-teal"
          title="Bilan de Présence"
          description="Taux de présence, absences justifiées/injustifiées et congés par collaborateur pour le mois sélectionné."
          stats={[
            { icon: '👥', label: `${filteredEmps.length} employés` },
            { icon: '✅', label: `${totalPresent} jours présents` },
            { icon: '📊', label: `Taux : ${avgRate}%` },
          ]}
          onExportPDF={handlePresencePDF}
          onExportExcel={handlePresenceExcel}
          loading={loading.presencePDF || loading.presenceExcel}
        />

        <ReportCard
          icon={AlarmClock}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          gradient="bg-gradient-to-r from-rose-500 to-amber-500"
          title="Bilan des Retards"
          description="Nombre de retards, minutes cumulées non justifiées et retenues financières calculées automatiquement."
          stats={[
            { icon: '⏱', label: `${filteredDel.length} retards` },
            { icon: '🕐', label: `${totalDelayMin} min` },
          ]}
          onExportPDF={handleRetardsPDF}
          onExportExcel={handleRetardsExcel}
          loading={loading.retardsPDF || loading.retardsExcel}
        />

        <ReportCard
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
          title="Bilan Heures Supplémentaires"
          description="Comparatif heures contractuelles vs réelles, écart et rémunération des heures supplémentaires (+25%)."
          stats={[
            { icon: '📈', label: `${filteredOvt.length} déclarations` },
            { icon: '⏰', label: `${totalOtHours} h supplémentaires` },
          ]}
          onExportPDF={handleOvertimePDF}
          onExportExcel={handleOvertimeExcel}
          loading={loading.overtimePDF || loading.overtimeExcel}
        />

        <ReportCard
          icon={CreditCard}
          iconColor="text-isw-blue"
          iconBg="bg-isw-blue-50"
          gradient="bg-gradient-to-r from-isw-navy to-isw-blue"
          title="Bilan de Paie — Masse Salariale"
          description="Récapitulatif complet de la paie mensuelle : brut, cotisations, retenues retards, net à payer et statut de règlement."
          stats={[
            { icon: '📋', label: `${filteredPay.length} bulletins` },
            { icon: '✅', label: `${filteredPay.filter(p => p.paymentStatus === 'Payé').length} réglés` },
            { icon: '💰', label: formatFCFA(totalNetPay) },
          ]}
          onExportPDF={handlePaiePDF}
          onExportExcel={handlePaieExcel}
          loading={loading.paiePDF || loading.paieExcel}
        />

        <ReportCard
          icon={BarChart3}
          iconColor="text-isw-gold"
          iconBg="bg-isw-gold-100/30"
          gradient="bg-gradient-to-r from-isw-gold to-amber-500"
          title="Bilan Général RH"
          description="Rapport de synthèse RH complet : indicateurs clés par département, masse salariale globale et vue d'ensemble de la période."
          stats={[
            { icon: '🏢', label: `${[...new Set(employees.map(e => e.department))].length} départements` },
            { icon: '👥', label: `${employees.filter(e => e.status === 'Actif').length} actifs` },
          ]}
          onExportPDF={handleGeneralPDF}
          loading={loading.generalPDF}
          pdfOnly={true}
        />

      </div>

      {/* Indicateur global de chargement */}
      {isAnyLoading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
          <Loader2 className="w-4 h-4 animate-spin text-isw-teal" />
          Génération du rapport en cours…
        </div>
      )}
    </div>
  );
}
