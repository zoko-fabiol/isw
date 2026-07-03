import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Scale, Trash2, ShieldAlert } from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, exportToExcel, formatFCFA } from '../services/exportService';
import { usePermissions } from '../context/PermissionsContext';

export default function Delays() {
  const { can } = usePermissions();
  const canAddDelay = can('delays', 'add');
  const canDeleteDelay = can('delays', 'delete');
  const [employees, setEmployees] = useState([]);
  const [delaysList, setDelaysList] = useState([]);
  const [settings, setSettings] = useState({ expectedTime: '08:00', standardHours: 173 });
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedTime, setExpectedTime] = useState('08:00');
  const [arrivalTime, setArrivalTime] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [status, setStatus] = useState('Non justifié');
  const [reason, setReason] = useState('');
  
  const [errors, setErrors] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleRetardsPDF = async () => {
    setExportingPDF(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Nb Retards', 'Total Min.', 'Min. Non Just.', 'Min. Just.', 'Retenue (FCFA)'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredDel = delaysList.filter(d => d.date && d.date.startsWith(selectedMonth));
      const rows = activeEmps.map(emp => {
        const empDel = filteredDel.filter(d => d.employeeId === emp.id);
        const totalMin = empDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const unjMin = empDel.filter(d => d.status === 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const justMin = empDel.filter(d => d.status !== 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const penalty = unjMin * (hr / 60);
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, empDel.length, totalMin, unjMin, justMin, formatFCFA(penalty)];
      }).filter(r => r[3] > 0);
      const totalPenalty = activeEmps.reduce((s, emp) => {
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
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToPDF('BILAN DES RETARDS', periodLabel, cols, rows, `bilan-retards-${selectedMonth}`, summary);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleRetardsExcel = async () => {
    setExportingExcel(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Nb Retards', 'Total Min.', 'Min. Non Just.', 'Min. Just.', 'Retenue (FCFA)'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredDel = delaysList.filter(d => d.date && d.date.startsWith(selectedMonth));
      const rows = activeEmps.map(emp => {
        const empDel = filteredDel.filter(d => d.employeeId === emp.id);
        const totalMin = empDel.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const unjMin = empDel.filter(d => d.status === 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const justMin = empDel.filter(d => d.status !== 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const penalty = unjMin * (hr / 60);
        return [emp.id, `${emp.firstName} ${emp.lastName}`, emp.department, empDel.length, totalMin, unjMin, justMin, Math.round(penalty)];
      });
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToExcel('Retards ' + periodLabel, cols, rows, `bilan-retards-${selectedMonth}`);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    dbService.getEmployees().then(setEmployees);
    dbService.getSettings().then((s) => {
      setSettings(s);
      setExpectedTime(s.expectedTime || '08:00');
    });
    
    const unsub = dbService.subscribeDelays((data) => {
      setDelaysList(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (empId) {
      const emp = employees.find(e => e.id === empId);
      setSelectedEmployee(emp || null);
    } else {
      setSelectedEmployee(null);
    }
    setErrors(prev => ({ ...prev, empId: null }));
  }, [empId, employees]);

  useEffect(() => {
    if (expectedTime && arrivalTime) {
      const [expH, expM] = expectedTime.split(':').map(Number);
      const [arrH, arrM] = arrivalTime.split(':').map(Number);
      
      const expTotalMinutes = expH * 60 + expM;
      const arrTotalMinutes = arrH * 60 + arrM;
      
      const diff = arrTotalMinutes - expTotalMinutes;
      setDelayMinutes(diff > 0 ? diff : 0);
    } else {
      setDelayMinutes(0);
    }
  }, [expectedTime, arrivalTime]);

  const filteredDelays = delaysList.filter(d => d.date && d.date.startsWith(selectedMonth));

  const totalMinutes = filteredDelays.reduce((sum, d) => sum + (Number(d.delayMinutes) || 0), 0);
  const unjustifiedMinutes = filteredDelays
    .filter(d => d.status === 'Non justifié')
    .reduce((sum, d) => sum + (Number(d.delayMinutes) || 0), 0);

  const totalPenalty = filteredDelays
    .filter(d => d.status === 'Non justifié')
    .reduce((sum, d) => {
      const emp = employees.find(e => e.id === d.employeeId);
      if (!emp) return sum;
      const hourlyRate = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
      const ratePerMinute = hourlyRate / 60;
      return sum + (Number(d.delayMinutes) || 0) * ratePerMinute;
    }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!empId) newErrors.empId = "Veuillez sélectionner un employé.";
    if (!arrivalTime) newErrors.arrivalTime = "Heure d'arrivée requise.";
    if (delayMinutes <= 0) newErrors.arrivalTime = "L'heure d'arrivée doit être après l'heure prévue.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const delayData = {
      employeeId: empId,
      date,
      expectedTime,
      arrivalTime,
      delayMinutes: Number(delayMinutes),
      reason,
      status
    };

    try {
      await dbService.saveDelay(delayData);
      setEmpId('');
      setArrivalTime('');
      setReason('');
      setStatus('Non justifié');
      alert("Retard enregistré avec succès !");
    } catch (err) {
      alert("Erreur lors de l'enregistrement du retard.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce retard ?")) {
      try {
        await dbService.deleteDelay(id);
      } catch (err) {
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'ID inconnu';
  };

  const getEmployeeDept = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.department : 'Inconnu';
  };

  const formatFCFA = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
      .format(val)
      .replace('XOF', 'FCFA');
  };

  const getInitials = (emp) => {
    if (!emp) return '??';
    return `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}`.toUpperCase();
  };

  // Group delays by employee
  const employeesWithDelays = employees
    .map(emp => ({
      emp,
      delays: filteredDelays.filter(d => d.employeeId === emp.id)
    }))
    .filter(({ delays }) => delays.length > 0);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Registre des Retards</h2>
          <p className="text-slate-500 text-sm mt-1">
            Enregistrez les retards et gérez les retenues salariales automatisées.
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
            onClick={handleRetardsPDF}
            disabled={exportingPDF}
            className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-isw-blue/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingPDF ? 'Export...' : 'PDF'}
          </button>
          <button
            onClick={handleRetardsExcel}
            disabled={exportingExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl font-bold shadow-md shadow-emerald-600/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingExcel ? 'Export...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-5">
          <div className="bg-isw-blue-50 p-4 rounded-xl text-isw-blue">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minutes cumulées ce mois</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalMinutes} min</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-5">
          <div className="bg-amber-100 p-4 rounded-xl text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minutes Non Justifiées</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{unjustifiedMinutes} min</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-5">
          <div className="bg-rose-100 p-4 rounded-xl text-rose-600">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retenues Estimées</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatFCFA(totalPenalty)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Log Delay Form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-2.5 h-6 bg-isw-blue rounded-full"></div>
            <h3 className="text-lg font-bold text-slate-800">Enregistrer un Retard</h3>
          </div>
          {canAddDelay ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Employee ID */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Code Employé</label>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue font-semibold text-slate-700 ${
                  errors.empId ? 'border-rose-400' : 'border-slate-200'
                }`}
              >
                <option value="">Sélectionnez un employé...</option>
                {employees.filter(e => e.status === 'Actif').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.id} - {emp.firstName} {emp.lastName}</option>
                ))}
              </select>
              {errors.empId && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.empId}</p>}
            </div>

            {/* Dynamic Info */}
            {selectedEmployee ? (
              <div className="p-4 bg-isw-blue/5 border border-isw-blue/10 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Nom complet :</span>
                  <span className="text-xs font-bold text-slate-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Département :</span>
                  <span className="text-xs font-semibold text-isw-blue bg-isw-blue-50 px-2 py-0.5 rounded-md">
                    {selectedEmployee.department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Taux Horaire :</span>
                  <span className="text-xs font-bold text-slate-700">
                    {formatFCFA(selectedEmployee.baseSalary / settings.standardHours)}/h
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs py-8">
                Aucun employé sélectionné. Le formulaire reste vierge.
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue font-semibold text-slate-700"
              />
            </div>

            {/* expected vs arrival */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-2">Heure Prévue</label>
                <input
                  type="time"
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue font-semibold text-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-2">Heure Arrivée</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue font-semibold text-slate-700 ${
                    errors.arrivalTime ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>
            {errors.arrivalTime && <p className="text-rose-500 text-[11px] font-semibold">{errors.arrivalTime}</p>}

            {/* Calculated Delay info */}
            {delayMinutes > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between text-rose-700">
                <span className="text-xs font-bold">Retard mesuré :</span>
                <span className="text-sm font-extrabold">{delayMinutes} minutes</span>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Statut du Retard</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue font-semibold text-slate-700"
              >
                <option value="Non justifié">Non justifié (Retenue applicable)</option>
                <option value="Justifié">Justifié (Pas de retenue)</option>
                <option value="Toléré">Toléré (Pas de retenue)</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Motif explicatif</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue text-slate-700 min-h-[80px]"
                placeholder="Raison invoquée..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-isw-blue hover:bg-isw-blue-light text-white font-bold rounded-2xl text-sm shadow-lg shadow-isw-blue/20 transition-all"
            >
              Enregistrer le Retard
            </button>
          </form>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              L'enregistrement des retards est réservé aux comptes autorisés.
            </div>
          )}
        </div>

        {/* History Cards Grid instead of Table */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recapitulatif des Retards</h3>
            <span className="text-xs font-bold bg-isw-blue-50 text-isw-blue px-3 py-1 rounded-xl">
              {filteredDelays.length} retard(s) ce mois
            </span>
          </div>

          {employeesWithDelays.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
              Aucun retard enregistré ce mois.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-h-[660px] overflow-y-auto pr-1">
              {employeesWithDelays.map(({ emp, delays }) => {
                const totalMins = delays.reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
                const penalty = delays
                  .filter(d => d.status === 'Non justifié')
                  .reduce((s, d) => {
                    const hourlyRate = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
                    return s + (Number(d.delayMinutes) || 0) * (hourlyRate / 60);
                  }, 0);

                return (
                  <div key={emp.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    {/* Employee info */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                        {getInitials(emp)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{emp.firstName} {emp.lastName}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{emp.id} &bull; {emp.department}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">
                          {delays.length} retard(s)
                        </span>
                      </div>
                    </div>

                    {/* Delay logs list inside card */}
                    <div className="mt-4 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {delays.map(del => (
                        <div key={del.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-700">{del.date}</span>
                            <span className="text-slate-400 ml-1.5">({del.expectedTime} &rarr; {del.arrivalTime})</span>
                            {del.reason && <p className="text-[10px] text-slate-400 italic mt-0.5">{del.reason}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              del.status === 'Non justifié' ? 'bg-rose-100 text-rose-700' :
                              del.status === 'Justifié' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {del.delayMinutes}m
                            </span>
                            {canDeleteDelay && (
                              <button
                                onClick={() => handleDelete(del.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer values */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Total : {totalMins} min</span>
                      {penalty > 0 && (
                        <span className="text-rose-600 bg-rose-50/50 border border-rose-100 px-2 py-0.5 rounded">
                          Retenue : -{formatFCFA(penalty)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
