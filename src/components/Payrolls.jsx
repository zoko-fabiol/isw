import React, { useState, useEffect } from 'react';
import { CreditCard, Printer, Sparkles, CheckCircle, FileText, X, Banknote, Wallet, Building2, TrendingDown } from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, exportToExcel, formatFCFA } from '../services/exportService';
import { usePermissions } from '../context/PermissionsContext';

export default function Payrolls() {
  const { can } = usePermissions();
  const canGeneratePayroll = can('payrolls', 'add');
  const canSettlePayroll = can('payrolls', 'edit');
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [delays, setDelays] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [settings, setSettings] = useState({ standardHours: 173, socialContributionRate: 12 });
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [bonuses, setBonuses] = useState({});
  
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePaiePDF = async () => {
    setExportingPDF(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Poste', 'Salaire Base', 'Prime', 'H.Sup', 'Brut', 'Cotisations', 'Retard', 'Net à Payer', 'Statut'];
      const filteredPay = payrolls.filter(p => p.monthYear === selectedMonth);
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
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToPDF('BILAN DE PAIE — MASSE SALARIALE', periodLabel, cols, rows, `bilan-paie-${selectedMonth}`, summary);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePaieExcel = async () => {
    setExportingExcel(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Poste', 'Salaire Base', 'Prime', 'H.Sup', 'Brut Total', 'Cotisations Soc.', 'Retenue Retard', 'Net à Payer', 'Statut'];
      const filteredPay = payrolls.filter(p => p.monthYear === selectedMonth);
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
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToExcel('Paie ' + periodLabel, cols, rows, `bilan-paie-${selectedMonth}`);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    dbService.getEmployees().then(setEmployees);
    dbService.getSettings().then(setSettings);

    const unsubPay = dbService.subscribePayrolls((data) => {
      setPayrolls(data);
    });
    const unsubAtt = dbService.subscribeAttendance(setAttendance);
    const unsubDel = dbService.subscribeDelays(setDelays);
    const unsubOvt = dbService.subscribeOvertime(setOvertime);

    return () => {
      unsubPay();
      unsubAtt();
      unsubDel();
      unsubOvt();
    };
  }, []);

  const filteredPayrolls = payrolls.filter(p => p.monthYear === selectedMonth);

  const handleGeneratePayrolls = async () => {
    const activeEmployees = employees.filter(emp => emp.status === 'Actif');
    if (activeEmployees.length === 0) {
      alert("Aucun employé actif à traiter.");
      return;
    }

    try {
      const standardHours = settings.standardHours || 173;
      const socRate = (settings.socialContributionRate || 12) / 100;

      for (const emp of activeEmployees) {
        const baseSalary = Number(emp.baseSalary) || 0;
        const hourlyRate = baseSalary / standardHours;

        const empOt = overtime.find(ot => ot.employeeId === emp.id && ot.monthYear === selectedMonth);
        const overtimePay = empOt ? (Number(empOt.overtimePay) || 0) : 0;
        const overtimeHours = empOt ? (Number(empOt.overtimeHours) || 0) : 0;

        const empDelays = delays.filter(d => 
          d.employeeId === emp.id && 
          d.date && d.date.startsWith(selectedMonth) && 
          d.status === 'Non justifié'
        );
        const delayMinutes = empDelays.reduce((sum, d) => sum + (Number(d.delayMinutes) || 0), 0);
        const delayDeduction = delayMinutes * (hourlyRate / 60);

        const bonus = Number(bonuses[emp.id]) || 0;
        const grossSalary = baseSalary + bonus + overtimePay;
        const socialContribution = grossSalary * socRate;
        const netSalary = grossSalary - (socialContribution + delayDeduction);

        const payrollData = {
          id: `${emp.id}_${selectedMonth}`,
          employeeId: emp.id,
          monthYear: selectedMonth,
          baseSalary,
          bonus,
          delayDeduction: Number(delayDeduction.toFixed(2)),
          socialContribution: Number(socialContribution.toFixed(2)),
          overtimePay: Number(overtimePay.toFixed(2)),
          netSalary: Number(netSalary.toFixed(2)),
          paymentStatus: 'En attente',
          paymentDate: null
        };

        await dbService.savePayroll(payrollData);
      }
      alert(`Calcul des bulletins pour le mois de ${selectedMonth} effectué avec succès !`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération des bulletins de paie.");
    }
  };

  const handleMarkAsPaid = async (payroll) => {
    try {
      const updated = {
        ...payroll,
        paymentStatus: 'Payé',
        paymentDate: new Date().toISOString().split('T')[0]
      };
      await dbService.savePayroll(updated);
      if (selectedPayroll && selectedPayroll.id === payroll.id) {
        setSelectedPayroll(updated);
      }
    } catch (err) {
      alert("Erreur lors du règlement du bulletin.");
    }
  };

  const handleBonusChange = (empId, val) => {
    setBonuses(prev => ({
      ...prev,
      [empId]: val
    }));
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'ID inconnu';
  };

  const getEmployeeDept = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.department : 'Inconnu';
  };

  const getEmployeeRole = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.role : 'Inconnu';
  };

  const getEmployeeStartDate = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.startDate : 'Inconnu';
  };

  const formatFCFA = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
      .format(val)
      .replace('XOF', 'FCFA');
  };

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return '??';
    return `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}`.toUpperCase();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Gestion des Paies</h2>
          <p className="text-slate-500 text-sm mt-1">
            Générez les bulletins mensuels et enregistrez les règlements des salaires.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-600">Période :</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-isw-blue/30 bg-white rounded-xl text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-isw-blue font-semibold"
            />
          </div>
          <button
            onClick={handlePaiePDF}
            disabled={exportingPDF}
            className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-isw-blue/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingPDF ? 'Export...' : 'PDF'}
          </button>
          <button
            onClick={handlePaieExcel}
            disabled={exportingExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl font-bold shadow-md shadow-emerald-600/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingExcel ? 'Export...' : 'Excel'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Payroll Actions Panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-5 h-5 text-isw-blue" />
            <h3 className="text-lg font-bold text-slate-800">Générer les Bulletins</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Le calcul automatise : le salaire horaire contractuel (173h), la majoration des heures sup. (+25%), les cotisations sociales (12% du brut) et la déduction à la minute des retards non justifiés.
          </p>

          {/* Bonus configuration table for active employees before generating */}
          <div className="border border-slate-100 rounded-2xl p-4 mb-6 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Ajustement Primes (Optionnel)</h4>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {employees.filter(e => e.status === 'Actif').map(emp => (
                <div key={emp.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-700 truncate w-32">{emp.firstName} {emp.lastName}</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder="Prime (FCFA)"
                      value={bonuses[emp.id] || ''}
                      onChange={(e) => handleBonusChange(emp.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-bold text-slate-700 focus:outline-none focus:border-isw-blue"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canGeneratePayroll && (
            <button
              onClick={handleGeneratePayrolls}
              className="w-full py-4 bg-isw-blue hover:bg-isw-blue-light text-white font-bold rounded-2xl text-sm shadow-lg shadow-isw-blue/25 flex items-center justify-center gap-2 transition-all duration-200"
            >
              <CreditCard className="w-4 h-4" />
              <span>Générer et Calculer la Paie</span>
            </button>
          )}
        </div>

        {/* List of Generated payroll slips — REDESIGNED TO CARDS */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Bulletins du Mois</h3>
            <span className="text-xs font-bold bg-isw-blue-50 text-isw-blue px-3 py-1 rounded-xl">
              {filteredPayrolls.length} bulletins calculés
            </span>
          </div>

          {filteredPayrolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-500 text-sm">Aucun bulletin généré</p>
                <p className="text-xs text-slate-400 mt-1">Lancez le calcul pour ce mois depuis le panneau de gauche.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto pr-1">
              {filteredPayrolls.map((pay) => {
                const gross = pay.baseSalary + pay.bonus + pay.overtimePay;
                const deductions = pay.socialContribution + pay.delayDeduction;
                const isPaid = pay.paymentStatus === 'Payé';
                const initials = getInitials(pay.employeeId);
                const name = getEmployeeName(pay.employeeId);
                const role = getEmployeeRole(pay.employeeId);
                const dept = getEmployeeDept(pay.employeeId);

                return (
                  <div 
                    key={pay.id} 
                    className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col bg-white"
                  >
                    {/* Card Header */}
                    <div 
                      className="px-5 py-4 flex items-center gap-3"
                      style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2E8BC0 100%)' }}
                    >
                      <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 flex-shrink-0">
                        <span className="text-white font-black text-sm tracking-wide">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-extrabold text-sm leading-tight truncate">{name}</p>
                        <p className="text-isw-teal-50 text-[11px] font-semibold truncate mt-0.5">{role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold bg-white/15 text-white/90 px-2 py-0.5 rounded-full">
                            {pay.employeeId}
                          </span>
                          <span className="text-[10px] text-isw-teal-50 font-medium flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            {dept}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="px-5 py-4 flex-1 space-y-3">
                      {/* Gross */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Banknote className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Salaire Brut</p>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                Base <span className="font-semibold text-slate-600">{formatFCFA(pay.baseSalary)}</span>
                              </span>
                              {pay.bonus > 0 && (
                                <span className="text-[10px] text-emerald-500 font-semibold">
                                  + Prime {formatFCFA(pay.bonus)}
                                </span>
                              )}
                              {pay.overtimePay > 0 && (
                                <span className="text-[10px] text-emerald-500 font-semibold">
                                  + H.Sup {formatFCFA(pay.overtimePay)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-extrabold text-slate-800 whitespace-nowrap">{formatFCFA(gross)}</span>
                      </div>

                      <div className="border-t border-slate-100" />

                      {/* Deductions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Retenues</p>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                              <span className="text-[10px] text-rose-400 font-semibold">
                                −Cotisations {formatFCFA(pay.socialContribution)}
                              </span>
                              {pay.delayDeduction > 0 && (
                                <span className="text-[10px] text-rose-400 font-semibold">
                                  −Retard {formatFCFA(pay.delayDeduction)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-extrabold text-rose-600 whitespace-nowrap">−{formatFCFA(deductions)}</span>
                      </div>

                      <div className="border-t border-slate-100" />

                      {/* Net to pay */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-3.5 h-3.5 text-white" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net à Payer</p>
                        </div>
                        <span className="text-base font-black text-white px-3 py-1 rounded-xl bg-slate-800">
                          {formatFCFA(pay.netSalary)}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="bg-slate-50 px-5 py-3.5 flex items-center justify-between border-t border-slate-100">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {pay.paymentStatus}
                      </span>
                      <div className="flex gap-2">
                        {!isPaid && canSettlePayroll && (
                          <button
                            onClick={() => handleMarkAsPaid(pay)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition-all"
                            title="Régler"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPayroll(pay);
                            setIsSlipOpen(true);
                          }}
                          className="p-1.5 bg-isw-blue-50 hover:bg-isw-blue text-isw-blue hover:text-white rounded-lg transition-all"
                          title="Voir Bulletin"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PRINTABLE SLIP MODAL */}
      {isSlipOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:p-0">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-isw-blue" />
                <h3 className="text-xl font-bold text-slate-800">Aperçu du Bulletin de Paie</h3>
              </div>
              <div className="flex items-center gap-3">
                {selectedPayroll.paymentStatus === 'En attente' && canSettlePayroll && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedPayroll)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
                  >
                    Régler le bulletin
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimer (PDF)
                </button>
                <button
                  onClick={() => setIsSlipOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div id="payslip-sheet" className="p-8 font-sans text-xs text-slate-700 overflow-y-auto flex-1 print:overflow-visible print:p-0 bg-white">
              {/* Top Banner / Corporate Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">ISW TECHNOSYS SARL</h1>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Zone 4C, Rue des Carrossiers, Abidjan</p>
                  <p className="text-[10px] text-slate-400 font-medium">N° RCCM: CI-ABJ-03-2024-B12-00542</p>
                  <p className="text-[10px] text-slate-400 font-medium">SIRET : 847 294 001 00021</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-black tracking-widest text-isw-blue bg-isw-blue-50 px-3 py-1 rounded-full uppercase mb-2">
                    Bulletin de Paie
                  </span>
                  <div className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg">
                    Période : <span className="text-slate-800">{selectedPayroll.monthYear}</span>
                  </div>
                </div>
              </div>

              {/* Employer / Employee Info Cards */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
                  <h3 className="font-extrabold text-[9px] text-isw-teal uppercase tracking-widest mb-2">Employeur</h3>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <p className="font-bold text-slate-800 text-sm">ISW TECHNOSYS</p>
                    <p>Convention collective : Syntec Informatique</p>
                    <p>Organisme : CNPS / IGR / ITS</p>
                  </div>
                </div>
                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
                  <h3 className="font-extrabold text-[9px] text-isw-teal uppercase tracking-widest mb-2">Salarié</h3>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <p className="font-bold text-slate-900 text-sm">
                      {getEmployeeName(selectedPayroll.employeeId)}
                    </p>
                    <p><span className="font-semibold text-slate-400">Matricule :</span> {selectedPayroll.employeeId}</p>
                    <p><span className="font-semibold text-slate-400">Poste :</span> {getEmployeeRole(selectedPayroll.employeeId)}</p>
                    <p><span className="font-semibold text-slate-400">Date d'entrée :</span> {getEmployeeStartDate(selectedPayroll.employeeId)}</p>
                  </div>
                </div>
              </div>

              {/* Earnings Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3">Désignation</th>
                      <th className="p-3 text-right">Base / Nb</th>
                      <th className="p-3 text-right">Taux</th>
                      <th className="p-3 text-right">Gains (+)</th>
                      <th className="p-3 text-right">Retenues (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Salaire de base (Temps plein)</td>
                      <td className="p-3 text-right">{settings.standardHours || 173} h</td>
                      <td className="p-3 text-right">{(selectedPayroll.baseSalary / (settings.standardHours || 173)).toFixed(0)}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{formatFCFA(selectedPayroll.baseSalary)}</td>
                      <td className="p-3 text-right">—</td>
                    </tr>

                    {selectedPayroll.overtimePay > 0 && (
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Heures supplémentaires (Majoration 25%)</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right font-bold text-emerald-600">+{formatFCFA(selectedPayroll.overtimePay)}</td>
                        <td className="p-3 text-right">—</td>
                      </tr>
                    )}

                    {selectedPayroll.bonus > 0 && (
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Prime exceptionnelle / d'ancienneté</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right font-bold text-emerald-600">+{formatFCFA(selectedPayroll.bonus)}</td>
                        <td className="p-3 text-right">—</td>
                      </tr>
                    )}

                    <tr className="bg-slate-50/20">
                      <td className="p-3 font-semibold text-slate-800">Cotisations de Sécurité Sociale (12%)</td>
                      <td className="p-3 text-right">{formatFCFA(selectedPayroll.baseSalary + selectedPayroll.bonus + selectedPayroll.overtimePay)}</td>
                      <td className="p-3 text-right">{settings.socialContributionRate || 12}%</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-right font-bold text-rose-600">-{formatFCFA(selectedPayroll.socialContribution)}</td>
                    </tr>

                    {selectedPayroll.delayDeduction > 0 && (
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Retenues sur retards non justifiés</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right font-bold text-rose-600">-{formatFCFA(selectedPayroll.delayDeduction)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6 mb-6">
                <div className="flex flex-col justify-center">
                  <table className="w-full text-[11px] text-slate-500">
                    <tbody>
                      <tr className="border-b border-slate-100 pb-1">
                        <td className="py-1.5 font-bold uppercase text-[9px] tracking-wider text-slate-400">TOTAL SALAIRE BRUT</td>
                        <td className="py-1.5 text-right font-bold text-slate-800">
                          {formatFCFA(selectedPayroll.baseSalary + selectedPayroll.bonus + selectedPayroll.overtimePay)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold uppercase text-[9px] tracking-wider text-slate-400">TOTAL RETENUES</td>
                        <td className="py-1.5 text-right font-bold text-rose-600">
                          -{formatFCFA(selectedPayroll.socialContribution + selectedPayroll.delayDeduction)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-gradient-to-br from-isw-navy to-isw-blue text-white rounded-2xl p-5 flex flex-col justify-between items-center text-center shadow-md shadow-isw-blue/10">
                  <span className="text-[9px] uppercase font-bold text-isw-teal-50 tracking-widest">Net à Payer (CFA)</span>
                  <span className="text-2xl font-black mt-1.5 tracking-tight">
                    {formatFCFA(selectedPayroll.netSalary)}
                  </span>
                </div>
              </div>

              {/* Payment Details & Signature Footer */}
              <div className="mt-8 border-t border-slate-100 pt-6 flex justify-between items-end text-[10px] text-slate-400 font-medium">
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <p><span className="font-bold text-slate-500">Mode de règlement :</span> Virement bancaire</p>
                  <p><span className="font-bold text-slate-500">Statut du paiement :</span> <span className={`font-extrabold uppercase ${selectedPayroll.paymentStatus === 'Payé' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedPayroll.paymentStatus}</span></p>
                  {selectedPayroll.paymentDate && <p><span className="font-bold text-slate-500">Date de règlement :</span> {selectedPayroll.paymentDate}</p>}
                </div>
                <div className="text-right pr-4">
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[8px] mb-8">Pour l'employeur</p>
                  <p className="text-isw-blue font-black tracking-wide text-xs">DIRECTION ISW</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
