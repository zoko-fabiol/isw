import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Clock, Calendar, 
  TrendingUp, BarChart2, ShieldCheck, UserCheck 
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, formatFCFA } from '../services/exportService';

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [delays, setDelays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleGeneralPDF = async () => {
    setExportingPDF(true);
    try {
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredAtt = attendance.filter(a => a.date && a.date.startsWith(selectedMonth));
      const filteredDel = delays.filter(d => d.date && d.date.startsWith(selectedMonth));
      const filteredPay = payrolls.filter(p => p.monthYear === selectedMonth);
      const filteredOvt = overtime.filter(o => o.monthYear === selectedMonth);

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

      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToPDF('BILAN GÉNÉRAL RH', periodLabel, deptCols, deptRows, `bilan-general-rh-${selectedMonth}`, summary);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  // Subscriptions to database updates
  useEffect(() => {
    const unsubEmp = dbService.subscribeEmployees(setEmployees);
    const unsubAtt = dbService.subscribeAttendance(setAttendance);
    const unsubDel = dbService.subscribeDelays(setDelays);
    const unsubLvs = dbService.subscribeLeaves(setLeaves);
    const unsubOvt = dbService.subscribeOvertime(setOvertime);
    const unsubPay = dbService.subscribePayrolls(setPayrolls);

    return () => {
      unsubEmp();
      unsubAtt();
      unsubDel();
      unsubLvs();
      unsubOvt();
      unsubPay();
    };
  }, []);

  // Filter lists by selected month
  const getFilteredAttendance = () => {
    return attendance.filter(att => att.date && att.date.startsWith(selectedMonth));
  };

  const getFilteredDelays = () => {
    return delays.filter(del => del.date && del.date.startsWith(selectedMonth));
  };

  const getFilteredOvertime = () => {
    return overtime.filter(ot => ot.monthYear === selectedMonth);
  };

  const getFilteredPayrolls = () => {
    return payrolls.filter(pay => pay.monthYear === selectedMonth);
  };

  // 1. Nombre d'employés actifs
  const activeEmployeesCount = employees.filter(emp => emp.status === 'Actif').length;

  // 2. Masse salariale brute totale (Somme des bruts des employés actifs, ou somme brute du mois dans les fiches de paie)
  // Let's calculate the sum of base salaries for active employees + any bonuses/overtime from actual payroll entries in the selected month
  const monthlyPayrolls = getFilteredPayrolls();
  const totalGrossPayroll = monthlyPayrolls.reduce((sum, pay) => {
    const base = Number(pay.baseSalary) || 0;
    const bonus = Number(pay.bonus) || 0;
    const ovt = Number(pay.overtimePay) || 0;
    return sum + base + bonus + ovt;
  }, 0);

  // If no payroll calculations yet, use the sum of active employees' base salaries
  const grossPayrollDisplay = totalGrossPayroll > 0 
    ? totalGrossPayroll 
    : employees.filter(emp => emp.status === 'Actif').reduce((sum, emp) => sum + (Number(emp.baseSalary) || 0), 0);

  // 3. Salaire net total versé (Somme des nets payés)
  const totalNetPaid = monthlyPayrolls
    .filter(pay => pay.paymentStatus === 'Payé')
    .reduce((sum, pay) => sum + (Number(pay.netSalary) || 0), 0);

  // 4. Taux d'absentéisme global de l'entreprise
  // Absences = 'Absence justifiée', 'Absence injustifiée', 'Maladie'. (We exclude 'Congé' from absentéisme since it's planned)
  const monthAttendance = getFilteredAttendance();
  const totalWorkableDays = monthAttendance.reduce((sum, att) => sum + (Number(att.workableDays) || 1), 0);
  const totalAbsentDays = monthAttendance.filter(att => 
    att.status === 'Absence justifiée' || 
    att.status === 'Absence injustifiée' || 
    att.status === 'Maladie'
  ).length;
  
  const absenteeismRate = totalWorkableDays > 0 
    ? ((totalAbsentDays / totalWorkableDays) * 100).toFixed(1) 
    : '0.0';

  // 5. Total des minutes de retard du mois
  const monthDelays = getFilteredDelays();
  const totalDelayMinutes = monthDelays.reduce((sum, del) => sum + (Number(del.delayMinutes) || 0), 0);

  // 6. Total des heures supplémentaires
  const monthOvertime = getFilteredOvertime();
  const totalOvertimeHours = monthOvertime.reduce((sum, ot) => sum + (Number(ot.overtimeHours) || 0), 0);

  // 7. Breakdown of employees by contract type and gender
  const getDemographicsTable = () => {
    const contractTypes = ['CDI', 'CDD', 'Stage', 'Freelance'];
    
    return contractTypes.map(type => {
      const typeEmployees = employees.filter(emp => emp.contractType === type);
      const men = typeEmployees.filter(emp => emp.gender === 'Homme').length;
      const women = typeEmployees.filter(emp => emp.gender === 'Femme').length;
      const total = typeEmployees.length;
      return { type, men, women, total };
    });
  };

  const demographics = getDemographicsTable();

  // Helper formatting currencies
  const formatFCFA = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
      .format(val)
      .replace('XOF', 'FCFA');
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Tableau de Bord RH</h2>
          <p className="text-slate-500 text-sm mt-1">
            Suivi en temps réel des indicateurs de performance RH et paie.
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
            onClick={handleGeneralPDF}
            disabled={exportingPDF}
            className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-isw-blue/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingPDF ? 'Export...' : 'Bilan RH PDF'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* KPI 1: Active Employees */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-isw-blue-50 p-4 rounded-2xl text-isw-blue shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Effectif Actif</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeEmployeesCount}</h3>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <UserCheck className="w-3 h-3" />
              Sur {employees.length} au total
            </span>
          </div>
        </div>

        {/* KPI 2: Gross Payroll Mass */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-isw-blue-100/50 p-4 rounded-2xl text-isw-navy shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Masse Salariale Brute</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatFCFA(grossPayrollDisplay)}</h3>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Base + primes + H.Sup
            </span>
          </div>
        </div>

        {/* KPI 3: Net Salary Paid */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600 shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nets Versés (Payés)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatFCFA(totalNetPaid)}</h3>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {monthlyPayrolls.filter(p => p.paymentStatus === 'Payé').length} bulletins réglés
            </span>
          </div>
        </div>

        {/* KPI 4: Absenteeism Rate */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-rose-100 p-4 rounded-2xl text-rose-600 shadow-sm">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taux d'Absentéisme</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{absenteeismRate} %</h3>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {totalAbsentDays} j d'absence / {totalWorkableDays} ouvrables
            </span>
          </div>
        </div>

        {/* KPI 5: Delay Minutes */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minutes de Retard</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalDelayMinutes} min</h3>
            <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              monthDelays.filter(d => d.status === 'Non justifié').length > 0
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              {monthDelays.filter(d => d.status === 'Non justifié').length} non justifiés
            </span>
          </div>
        </div>

        {/* KPI 6: Overtime Hours */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-isw-teal-50 p-4 rounded-2xl text-isw-teal shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Heures Supplémentaires</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalOvertimeHours} hrs</h3>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-isw-teal bg-isw-teal-50 px-2 py-0.5 rounded-full">
              {monthOvertime.length} collaborateurs concernés
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Statistics and Demographics */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-6">
            <ShieldCheck className="w-5 h-5 text-isw-blue" />
            <h4 className="text-lg font-bold text-slate-800">Effectifs par Contrat & Sexe</h4>
          </div>
          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-4 px-6">Type de Contrat</th>
                  <th className="py-4 px-6 text-center">Hommes</th>
                  <th className="py-4 px-6 text-center">Femmes</th>
                  <th className="py-4 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {demographics.map((row) => (
                  <tr key={row.type} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-bold text-slate-800">{row.type}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{row.men}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{row.women}</td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-block px-3 py-1 bg-isw-blue-50 text-isw-blue rounded-lg font-bold">
                        {row.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel / Quick Info */}
        <div className="bg-gradient-to-br from-isw-navy to-isw-blue text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xl font-extrabold mb-2">Centre RH Technosys</h4>
            <p className="text-isw-teal-50 text-xs leading-relaxed font-medium">
              Ce système de gestion intègre l'ensemble de la base contractuelle, le pointage quotidien des présences, l'enregistrement des retards avec retenues automatiques, et la paie conforme.
            </p>
          </div>
          
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/10 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-white">Mode de connexion :</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Local Storage
              </span>
            </div>
            
            <div className="text-[10px] text-isw-teal-100/80 leading-relaxed font-semibold text-center border-t border-white/10 pt-4">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
