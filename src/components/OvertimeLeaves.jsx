import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Check, X as CancelIcon, Trash2, CalendarDays, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, exportToExcel, formatFCFA } from '../services/exportService';
import { usePermissions } from '../context/PermissionsContext';

export default function OvertimeLeaves() {
  const { can } = usePermissions();
  const canAddOvertime = can('leaves', 'add');
  const canEditLeave = can('leaves', 'edit');
  const canDeleteLeavePermission = can('leaves', 'delete');
  const [activeSubTab, setActiveSubTab] = useState('overtime');
  const [employees, setEmployees] = useState([]);
  const [overtimeList, setOvertimeList] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [settings, setSettings] = useState({ standardHours: 173, expectedTime: '08:00' });
  const [selectedMonth, setSelectedMonth] = useState('2026-06');

  const [otEmpId, setOtEmpId] = useState('');
  const [otActualHours, setOtActualHours] = useState('');
  const [otContractHours, setOtContractHours] = useState(173);

  const [lvEmpId, setLvEmpId] = useState('');
  const [lvType, setLvType] = useState('Congé annuel');
  const [lvStart, setLvStart] = useState('');
  const [lvEnd, setLvEnd] = useState('');
  const [lvDays, setLvDays] = useState(0);
  const [lvStatus, setLvStatus] = useState('En attente');
  const [lvNotes, setLvNotes] = useState('');

  const [selectedOtEmp, setSelectedOtEmp] = useState(null);
  const [selectedLvEmp, setSelectedLvEmp] = useState(null);
  const [otErrors, setOtErrors] = useState({});
  const [lvErrors, setLvErrors] = useState({});
  
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleOvertimePDF = async () => {
    setExportingPDF(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'H. Contractuelles', 'H. Réelles', 'Écart (h)', 'Taux/h (FCFA)', 'Rémun. H.Sup (FCFA)'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredOvt = overtimeList.filter(o => o.monthYear === selectedMonth);
      const rows = activeEmps.map(emp => {
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
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToPDF('BILAN HEURES SUPPLÉMENTAIRES', periodLabel, cols, rows, `bilan-heures-sup-${selectedMonth}`, summary);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleOvertimeExcel = async () => {
    setExportingExcel(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'H. Contractuelles', 'H. Réelles', 'Écart (h)', 'Taux/h (FCFA)', 'Rémun. H.Sup (FCFA)'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredOvt = overtimeList.filter(o => o.monthYear === selectedMonth);
      const rows = activeEmps.map(emp => {
        const ot = filteredOvt.find(o => o.employeeId === emp.id);
        const contract = ot ? ot.contractualHours : (settings.standardHours || 173);
        const actual = ot ? ot.actualHours : 0;
        const diff = ot ? ot.overtimeHours : 0;
        const hr = Math.round((Number(emp.baseSalary) || 0) / (settings.standardHours || 173));
        const pay = ot ? Math.round(Number(ot.overtimePay) || 0) : 0;
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, contract, actual, diff, hr, pay];
      });
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToExcel('H.Sup ' + periodLabel, cols, rows, `bilan-heures-sup-${selectedMonth}`);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    dbService.getEmployees().then(setEmployees);
    dbService.getSettings().then(s => {
      setSettings(s);
      setOtContractHours(s.standardHours || 173);
    });
    const unsubOt = dbService.subscribeOvertime(setOvertimeList);
    const unsubLv = dbService.subscribeLeaves(setLeavesList);
    return () => { unsubOt(); unsubLv(); };
  }, []);

  useEffect(() => {
    if (otEmpId) setSelectedOtEmp(employees.find(e => e.id === otEmpId) || null);
    else setSelectedOtEmp(null);
    setOtErrors(prev => ({ ...prev, empId: null }));
  }, [otEmpId, employees]);

  useEffect(() => {
    if (lvEmpId) setSelectedLvEmp(employees.find(e => e.id === lvEmpId) || null);
    else setSelectedLvEmp(null);
    setLvErrors(prev => ({ ...prev, empId: null }));
  }, [lvEmpId, employees]);

  useEffect(() => {
    if (lvStart && lvEnd) {
      const start = new Date(lvStart);
      const end = new Date(lvEnd);
      if (end < start) { setLvDays(0); return; }
      let count = 0;
      let cur = new Date(start);
      while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      setLvDays(count);
    } else { setLvDays(0); }
  }, [lvStart, lvEnd]);

  const handleOtSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!otEmpId) newErrors.empId = "Veuillez sélectionner un employé.";
    if (!otActualHours) newErrors.actualHours = "Les heures réelles sont requises.";
    else if (Number(otActualHours) < 0) newErrors.actualHours = "Les heures doivent être positives.";
    if (Object.keys(newErrors).length > 0) { setOtErrors(newErrors); return; }
    const baseSalary = selectedOtEmp ? Number(selectedOtEmp.baseSalary) : 0;
    const hourlyRate = baseSalary / Number(otContractHours);
    const overtimeHours = Number(otActualHours) - Number(otContractHours);
    const overtimePay = overtimeHours > 0 ? overtimeHours * (hourlyRate * 1.25) : 0;
    const otData = { employeeId: otEmpId, monthYear: selectedMonth, contractualHours: Number(otContractHours), actualHours: Number(otActualHours), overtimeHours, hourlyRate, overtimePay };
    try {
      await dbService.saveOvertime(otData);
      setOtEmpId(''); setOtActualHours('');
      alert("Heures enregistrées avec succès !");
    } catch { alert("Erreur lors de l'enregistrement des heures."); }
  };

  const handleLvSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!lvEmpId) newErrors.empId = "Veuillez sélectionner un employé.";
    if (!lvStart) newErrors.startDate = "Date de début requise.";
    if (!lvEnd) newErrors.endDate = "Date de fin requise.";
    if (lvDays <= 0 && lvStart && lvEnd) newErrors.endDate = "La date de fin doit être supérieure ou égale à la date de début.";
    if (Object.keys(newErrors).length > 0) { setLvErrors(newErrors); return; }
    const leaveData = { employeeId: lvEmpId, leaveType: lvType, startDate: lvStart, endDate: lvEnd, days: Number(lvDays), status: lvStatus, notes: lvNotes };
    try {
      await dbService.saveLeave(leaveData);
      setLvEmpId(''); setLvStart(''); setLvEnd(''); setLvNotes(''); setLvStatus('En attente');
      alert("Demande de congé enregistrée avec succès !");
    } catch { alert("Erreur lors de l'enregistrement du congé."); }
  };

  const handleUpdateLeaveStatus = async (leave, newStatus) => {
    try { await dbService.saveLeave({ ...leave, status: newStatus }); }
    catch { alert("Erreur de mise à jour du statut."); }
  };

  const handleDeleteLeave = async (id) => {
    if (window.confirm("Supprimer ce congé ?")) {
      try { await dbService.deleteLeave(id); }
      catch { alert("Erreur de suppression."); }
    }
  };

  const filteredOvertimes = overtimeList.filter(ot => ot.monthYear === selectedMonth);
  const filteredLeaves = leavesList.filter(lv =>
    (lv.startDate && lv.startDate.startsWith(selectedMonth)) ||
    (lv.endDate && lv.endDate.startsWith(selectedMonth)) ||
    lv.status === 'En attente'
  );

  const formatFCFA = (val) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
      .format(val).replace('XOF', 'FCFA');

  const getInitials = (emp) => emp ? `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase() : '??';

  const leaveTypeBadge = (type) => {
    switch (type) {
      case 'Congé annuel': return 'bg-isw-blue-50 text-isw-blue';
      case 'Maladie': return 'bg-blue-100 text-blue-700';
      case 'Maternité': return 'bg-pink-100 text-pink-700';
      case 'Sans solde': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const leaveStatusBadge = (status) => {
    switch (status) {
      case 'Approuvé': return 'bg-emerald-100 text-emerald-700';
      case 'Refusé': return 'bg-rose-100 text-rose-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  // Stats for overtime tab
  const totalOtHours = filteredOvertimes.reduce((s, o) => s + (o.overtimeHours > 0 ? o.overtimeHours : 0), 0);
  const totalOtPay = filteredOvertimes.reduce((s, o) => s + (Number(o.overtimePay) || 0), 0);
  const totalLeaveDays = filteredLeaves.reduce((s, l) => s + (Number(l.days) || 0), 0);
  const pendingLeaves = filteredLeaves.filter(l => l.status === 'En attente').length;

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Temps de Travail & Congés</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>Déclarez les heures réelles et planifiez les absences de vos collaborateurs.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Tab Toggle */}
          <div style={{ display: 'flex', background: 'white', padding: '0.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', gap: '0.25rem' }}>
            {['overtime', 'leaves'].map(tab => (
              <button key={tab} onClick={() => setActiveSubTab(tab)} style={{
                padding: '0.5rem 1rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.75rem',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeSubTab === tab ? '#2E8BC0' : 'transparent',
                color: activeSubTab === tab ? 'white' : '#64748b'
              }}>
                {tab === 'overtime' ? '⏱ Heures Supp.' : '🌴 Congés'}
              </button>
            ))}
          </div>
          {/* Month */}
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '0.5rem 1rem', border: '2px solid #D6EBF7', borderRadius: '0.75rem', fontWeight: 700, color: '#374151', outline: 'none', fontSize: '0.875rem' }} />
          {activeSubTab === 'overtime' && (
            <>
              <button
                onClick={handleOvertimePDF}
                disabled={exportingPDF}
                style={{
                  padding: '0.5rem 1rem', background: '#2E8BC0', color: 'white', borderRadius: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.75rem', boxShadow: '0 4px 6px -1px rgba(46, 139, 192, 0.1)'
                }}
              >
                {exportingPDF ? 'Export...' : 'PDF'}
              </button>
              <button
                onClick={handleOvertimeExcel}
                disabled={exportingExcel}
                style={{
                  padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.75rem', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)'
                }}
              >
                {exportingExcel ? 'Export...' : 'Excel'}
              </button>
            </>
          )}
        </div>
      </div>

      {activeSubTab === 'overtime' ? (
        <>
          {/* Overtime KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { icon: '⏱', label: 'Déclarations ce mois', value: filteredOvertimes.length, color: '#2E8BC0', bg: '#EBF5FB' },
              { icon: '📈', label: 'H. Sup totales', value: `${totalOtHours} h`, color: '#059669', bg: '#ecfdf5' },
              { icon: '💰', label: 'Rémunération H.Sup', value: formatFCFA(totalOtPay), color: '#0369a1', bg: '#eff6ff' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.875rem', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>{kpi.icon}</div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>{kpi.label}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '1.375rem', fontWeight: 800, color: '#1e293b' }}>{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Overtime Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Form */}
            <div style={{ background: 'white', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 10, height: 24, background: '#2E8BC0', borderRadius: 999 }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Déclarer des Heures</h3>
              </div>
              {canAddOvertime ? (
              <form onSubmit={handleOtSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Code Employé</label>
                  <select value={otEmpId} onChange={e => setOtEmpId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: `1px solid ${otErrors.empId ? '#f43f5e' : '#e2e8f0'}`, borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', outline: 'none' }}>
                    <option value="">Sélectionnez un employé...</option>
                    {employees.filter(e => e.status === 'Actif').map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.id} - {emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                  {otErrors.empId && <p style={{ color: '#f43f5e', fontSize: '0.7rem', marginTop: '0.25rem', fontWeight: 600 }}>{otErrors.empId}</p>}
                </div>

                {selectedOtEmp ? (
                  <div style={{ padding: '0.875rem', background: '#EBF5FB', border: '1px solid #D6EBF7', borderRadius: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Collaborateur :</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{selectedOtEmp.firstName} {selectedOtEmp.lastName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Salaire Brut :</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{formatFCFA(selectedOtEmp.baseSalary)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Département :</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2E8BC0', background: '#D6EBF7', padding: '0.125rem 0.5rem', borderRadius: '0.375rem' }}>{selectedOtEmp.department}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 1rem', border: '2px dashed #e2e8f0', borderRadius: '0.875rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>Aucun employé sélectionné.</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>H. Contractuelles</label>
                    <input type="number" disabled value={otContractHours}
                      style={{ width: '100%', padding: '0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 700, color: '#94a3b8', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Heures Réelles</label>
                    <input type="number" value={otActualHours} onChange={e => setOtActualHours(e.target.value)} placeholder="185"
                      style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: `1px solid ${otErrors.actualHours ? '#f43f5e' : '#e2e8f0'}`, borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {otActualHours && selectedOtEmp && (
                  <div style={{ padding: '0.875rem', background: Number(otActualHours) > otContractHours ? '#ecfdf5' : '#fff1f2', border: `1px solid ${Number(otActualHours) > otContractHours ? '#a7f3d0' : '#fecdd3'}`, borderRadius: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>
                      {Number(otActualHours) - otContractHours >= 0 ? '⬆ H. Supplémentaires' : '⬇ Déficit d\'heures'}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: Number(otActualHours) > otContractHours ? '#059669' : '#e11d48' }}>
                      {Number(otActualHours) - otContractHours >= 0 ? '+' : ''}{Number(otActualHours) - otContractHours} h
                    </span>
                  </div>
                )}

                <button type="submit" style={{ padding: '0.875rem', background: '#2E8BC0', color: 'white', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(46,139,192,0.3)' }}>
                  Enregistrer la Déclaration
                </button>
              </form>
              ) : (
                <div style={{ padding: '1rem', borderRadius: '0.875rem', border: '1px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                  La saisie des heures supplémentaires est réservée aux comptes autorisés.
                </div>
              )}
            </div>

            {/* Overtime Cards */}
            <div className="lg:col-span-2">
              {filteredOvertimes.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱</div>
                  <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>Aucune déclaration d'heures pour ce mois.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {employees.map(emp => {
                    const ot = filteredOvertimes.find(o => o.employeeId === emp.id);
                    if (!ot) return null;
                    const isPositive = ot.overtimeHours >= 0;
                    return (
                      <div key={emp.id} style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        {/* Card Header */}
                        <div style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1rem', flexShrink: 0 }}>
                            {getInitials(emp)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{emp.firstName} {emp.lastName}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)' }}>{emp.id} • {emp.department}</p>
                          </div>
                        </div>
                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1px solid #f1f5f9' }}>
                          {[
                            { label: 'Contractuelles', value: `${ot.contractualHours} h`, color: '#64748b' },
                            { label: 'Réelles', value: `${ot.actualHours} h`, color: '#1e293b' },
                            { label: 'Écart', value: `${isPositive ? '+' : ''}${ot.overtimeHours} h`, color: isPositive ? '#059669' : '#e11d48' },
                          ].map((stat, i) => (
                            <div key={i} style={{ padding: '1rem 0.75rem', textAlign: 'center', borderRight: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                              <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em' }}>{stat.label}</p>
                              <p style={{ margin: '0.375rem 0 0', fontSize: '1.125rem', fontWeight: 800, color: stat.color }}>{stat.value}</p>
                            </div>
                          ))}
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Rémunération H.Sup</span>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: ot.overtimePay > 0 ? '#059669' : '#94a3b8' }}>
                            {ot.overtimePay > 0 ? `+${formatFCFA(ot.overtimePay)}` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Leaves KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { icon: '📋', label: 'Demandes ce mois', value: filteredLeaves.length, color: '#2E8BC0', bg: '#EBF5FB' },
              { icon: '⏳', label: 'En attente', value: pendingLeaves, color: '#d97706', bg: '#fffbeb' },
              { icon: '📅', label: 'Jours ouvrés', value: `${totalLeaveDays} j`, color: '#0369a1', bg: '#eff6ff' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.875rem', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>{kpi.icon}</div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>{kpi.label}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '1.375rem', fontWeight: 800, color: '#1e293b' }}>{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Leaves Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Leave Form */}
            <div style={{ background: 'white', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 10, height: 24, background: '#2E8BC0', borderRadius: 999 }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Saisir un Congé</h3>
              </div>
              {canAddOvertime ? (
              <form onSubmit={handleLvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Code Employé</label>
                  <select value={lvEmpId} onChange={e => setLvEmpId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: `1px solid ${lvErrors.empId ? '#f43f5e' : '#e2e8f0'}`, borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', outline: 'none' }}>
                    <option value="">Sélectionnez un employé...</option>
                    {employees.filter(e => e.status === 'Actif').map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.id} - {emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                  {lvErrors.empId && <p style={{ color: '#f43f5e', fontSize: '0.7rem', marginTop: '0.25rem', fontWeight: 600 }}>{lvErrors.empId}</p>}
                </div>

                {selectedLvEmp && (
                  <div style={{ padding: '0.875rem', background: '#EBF5FB', border: '1px solid #D6EBF7', borderRadius: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Collaborateur :</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{selectedLvEmp.firstName} {selectedLvEmp.lastName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Département :</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2E8BC0', background: '#D6EBF7', padding: '0.125rem 0.5rem', borderRadius: '0.375rem' }}>{selectedLvEmp.department}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Type de Congé</label>
                  <select value={lvType} onChange={e => setLvType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', outline: 'none' }}>
                    <option value="Congé annuel">Congé annuel</option>
                    <option value="Maladie">Maladie</option>
                    <option value="Maternité">Maternité</option>
                    <option value="Sans solde">Sans solde</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Date Début</label>
                    <input type="date" value={lvStart} onChange={e => setLvStart(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: `1px solid ${lvErrors.startDate ? '#f43f5e' : '#e2e8f0'}`, borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Date Fin</label>
                    <input type="date" value={lvEnd} onChange={e => setLvEnd(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: `1px solid ${lvErrors.endDate ? '#f43f5e' : '#e2e8f0'}`, borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {lvDays > 0 && (
                  <div style={{ padding: '0.75rem', background: '#EBF5FB', border: '1px solid #D6EBF7', borderRadius: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E8BC0' }}>Jours ouvrés décomptés :</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#2E8BC0' }}>{lvDays} jours</span>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Remarques</label>
                  <textarea value={lvNotes} onChange={e => setLvNotes(e.target.value)} placeholder="Notes de congé..."
                    style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.875rem', fontSize: '0.875rem', color: '#374151', minHeight: '70px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Statut Initial</label>
                  <select value={lvStatus} onChange={e => setLvStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', outline: 'none' }}>
                    <option value="En attente">En attente</option>
                    <option value="Approuvé">Approuvé</option>
                    <option value="Refusé">Refusé</option>
                  </select>
                </div>

                <button type="submit" style={{ padding: '0.875rem', background: '#2E8BC0', color: 'white', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(46,139,192,0.3)' }}>
                  Enregistrer la Demande
                </button>
              </form>
              ) : (
                <div style={{ padding: '1rem', borderRadius: '0.875rem', border: '1px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                  La saisie des congés est réservée aux comptes autorisés.
                </div>
              )}
            </div>

            {/* Leave Cards */}
            <div className="lg:col-span-2">
              {filteredLeaves.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌴</div>
                  <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>Aucun congé enregistré pour cette période.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {employees.map(emp => {
                    const empLeaves = filteredLeaves.filter(lv => lv.employeeId === emp.id);
                    if (empLeaves.length === 0) return null;
                    const totalDays = empLeaves.reduce((s, lv) => s + (Number(lv.days) || 0), 0);
                    return (
                      <div key={emp.id} style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        {/* Card Header */}
                        <div style={{ background: 'linear-gradient(135deg, #1B3A5C, #2E8BC0)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '0.875rem', flexShrink: 0 }}>
                              {getInitials(emp)}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 800, color: 'white', fontSize: '0.875rem' }}>{emp.firstName} {emp.lastName}</p>
                              <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)' }}>{emp.id} • {emp.department}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', padding: '0.25rem 0.625rem', borderRadius: '999px' }}>{empLeaves.length} demande(s)</span>
                            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem', fontWeight: 700 }}>Total : {totalDays} j. ouvrés</span>
                          </div>
                        </div>
                        {/* Leave entries */}
                        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                          {empLeaves.map(lv => (
                            <div key={lv.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.875rem', border: '1px solid #f1f5f9' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '999px', background: leaveTypeBadge(lv.leaveType).split(' ')[0].replace('bg-', '').includes('isw') ? '#EBF5FB' : '#dbeafe', color: '#2E8BC0' }} className={leaveTypeBadge(lv.leaveType)}>
                                {lv.leaveType}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600 }}>📅 {lv.startDate} → {lv.endDate}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{lv.days} j</span>
                              {lv.notes && <span style={{ fontSize: '0.7rem', color: '#94a3b8', flex: 1, minWidth: '80px' }} title={lv.notes}>📝 {lv.notes.substring(0, 30)}{lv.notes.length > 30 ? '…' : ''}</span>}
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '999px',
                                background: lv.status === 'Approuvé' ? '#d1fae5' : lv.status === 'Refusé' ? '#fee2e2' : '#fef3c7',
                                color: lv.status === 'Approuvé' ? '#065f46' : lv.status === 'Refusé' ? '#991b1b' : '#92400e'
                              }}>
                                {lv.status}
                              </span>
                              <div style={{ display: 'flex', gap: '0.375rem', marginLeft: 'auto' }}>
                                {lv.status === 'En attente' && canEditLeave && (
                                  <>
                                    <button onClick={() => handleUpdateLeaveStatus(lv, 'Approuvé')} title="Approuver"
                                      style={{ width: 28, height: 28, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>✓</button>
                                    <button onClick={() => handleUpdateLeaveStatus(lv, 'Refusé')} title="Refuser"
                                      style={{ width: 28, height: 28, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>✕</button>
                                  </>
                                )}
                                {canDeleteLeavePermission && (
                                  <button onClick={() => handleDeleteLeave(lv.id)} title="Supprimer"
                                    style={{ width: 28, height: 28, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>🗑</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
