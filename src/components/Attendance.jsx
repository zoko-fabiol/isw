import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, HelpCircle, X, Search, Trash2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, exportToExcel } from '../services/exportService';
import { usePermissions } from '../context/PermissionsContext';

export default function Attendance() {
  const { can } = usePermissions();
  const canAddAttendance = can('attendance', 'add');
  const canEditAttendance = can('attendance', 'edit') || can('attendance', 'delete');
  const [employees, setEmployees] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Présent');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePresencePDF = async () => {
    setExportingPDF(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Poste', 'Présents', 'Abs. Justifiées', 'Abs. Injustifiées', 'Congés', 'Maladie', 'Taux'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredAtt = attendanceList.filter(a => a.date && a.date.startsWith(selectedMonth));
      const rows = activeEmps.map(emp => {
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
        ['Effectif analysé :', `${activeEmps.length} employés`],
        ['Taux de présence moyen :', avgRate],
        ['Total jours de présence :', `${totalPresent} jours`],
        ['Total pointages :', `${totalWorkable} entrées`],
      ];
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToPDF('BILAN DE PRÉSENCE', periodLabel, cols, rows, `bilan-presence-${selectedMonth}`, summary);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePresenceExcel = async () => {
    setExportingExcel(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Poste', 'Présents', 'Abs. Justifiées', 'Abs. Injustifiées', 'Congés', 'Maladie', 'Taux (%)'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const filteredAtt = attendanceList.filter(a => a.date && a.date.startsWith(selectedMonth));
      const rows = activeEmps.map(emp => {
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
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToExcel('Présence ' + periodLabel, cols, rows, `bilan-presence-${selectedMonth}`);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    dbService.getEmployees().then(setEmployees);
    const unsub = dbService.subscribeAttendance((data) => {
      setAttendanceList(data);
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

  const getFilteredAttendance = () => {
    return attendanceList.filter(att => att.date && att.date.startsWith(selectedMonth));
  };

  const filteredList = getFilteredAttendance();

  const totalWorkable = filteredList.reduce((sum, att) => sum + (Number(att.workableDays) || 1), 0);
  const totalPresent = filteredList.reduce((sum, att) => sum + (Number(att.presentDays) || 0), 0);
  
  const presenceRate = totalWorkable > 0 
    ? ((totalPresent / totalWorkable) * 100).toFixed(1) 
    : '0.0';

  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const numDays = new Date(year, month, 0).getDate();
    const days = [];
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayOfWeek = new Date(dateStr).getDay();
      
      // Filter out Sunday (0)
      if (dayOfWeek !== 0) {
        days.push({ 
          dayNum: d, 
          dateStr, 
          isWeekend: dayOfWeek === 6, // only Saturday remains
          dayOfWeek 
        });
      }
    }
    return days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!empId) newErrors.empId = "Veuillez sélectionner un employé.";
    if (!date) newErrors.date = "La date est requise.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const isPresent = status === 'Présent';
    const localDate = new Date();
    const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    
    const arrivalTime = (isPresent && date === todayStr)
      ? `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`
      : '';

    const attendanceData = {
      employeeId: empId,
      date,
      status,
      reason: isPresent ? '' : reason,
      presentDays: isPresent ? 1 : 0,
      workableDays: 1,
      arrivalTime
    };

    try {
      await dbService.saveAttendance(attendanceData);
      setEmpId('');
      setReason('');
      setStatus('Présent');
      alert("Pointage enregistré avec succès !");
    } catch (err) {
      alert("Erreur lors de l'enregistrement de la présence.");
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

  const getInitials = (emp) => {
    if (!emp) return '??';
    return `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}`.toUpperCase();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Présences & Suivi</h2>
          <p className="text-slate-500 text-sm mt-1">
            Enregistrez les pointages quotidiens et analysez le taux d'absentéisme global.
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
            onClick={handlePresencePDF}
            disabled={exportingPDF}
            className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-isw-blue/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingPDF ? 'Export...' : 'PDF'}
          </button>
          <button
            onClick={handlePresenceExcel}
            disabled={exportingExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl font-bold shadow-md shadow-emerald-600/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingExcel ? 'Export...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-5">
          <div className="bg-isw-blue-50 p-4 rounded-xl text-isw-blue">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taux de Présence Moyen</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{presenceRate} %</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-5">
          <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jours de Présence</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalPresent} jours</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-5">
          <div className="bg-rose-100 p-4 rounded-xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Jours Ouvrables</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalWorkable} jours</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Logger Form */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-2.5 h-6 bg-isw-blue rounded-full"></div>
            <h3 className="text-lg font-bold text-slate-800">Enregistrer un Pointage</h3>
          </div>
          {canAddAttendance ? (
            <form onSubmit={handleSubmit} className="space-y-5">
            {/* Employee Selection */}
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

            {/* Dynamic Details Box */}
            {selectedEmployee ? (
              <div className="p-4 bg-isw-blue/5 border border-isw-blue/10 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Collaborateur :</span>
                  <span className="text-xs font-bold text-slate-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Département :</span>
                  <span className="text-xs font-semibold text-isw-blue bg-isw-blue-50 px-2 py-0.5 rounded-md">
                    {selectedEmployee.department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Poste :</span>
                  <span className="text-xs font-medium text-slate-600">{selectedEmployee.role}</span>
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

            {/* Status */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Statut de Présence</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue font-semibold text-slate-700"
              >
                <option value="Présent">Présent (Présent au poste)</option>
                <option value="Absence justifiée">Absence justifiée</option>
                <option value="Absence injustifiée">Absence injustifiée</option>
                <option value="Congé">Congé</option>
                <option value="Maladie">Maladie</option>
              </select>
            </div>

            {/* Reason (Conditional) */}
            {status !== 'Présent' && (
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-2">Motif / Commentaire</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue text-slate-700 min-h-[80px]"
                  placeholder="Saisissez la raison de l'absence..."
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-isw-blue hover:bg-isw-blue-light text-white font-bold rounded-2xl text-sm shadow-lg shadow-isw-blue/20 transition-all"
            >
              Enregistrer Pointage
            </button>
            </form>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              L'enregistrement des présences est réservé aux comptes autorisés.
            </div>
          )}
        </div>

        {/* Registry Card Grid instead of Table */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-isw-blue" />
              <h3 className="text-lg font-bold text-slate-800">Suivi des Présences</h3>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 bg-white border border-slate-100 p-2.5 rounded-2xl shadow-sm">
              <span className="flex items-center gap-1"><span className="w-4 h-4 inline-flex items-center justify-center rounded bg-emerald-50 border border-emerald-100 text-emerald-600">✔</span> Prés.</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 inline-flex items-center justify-center rounded bg-rose-50 border border-rose-100 text-rose-600">✘</span> Inj.</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 inline-flex items-center justify-center rounded bg-amber-50 border border-amber-100 text-amber-600">J</span> Just.</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 inline-flex items-center justify-center rounded bg-amber-50 border border-amber-100 text-amber-600">C</span> Congé</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 inline-flex items-center justify-center rounded bg-blue-50 border border-blue-100 text-blue-600">M</span> Mal.</span>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
              Aucun collaborateur enregistré.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[660px] overflow-y-auto pr-1">
              {employees.map((emp) => {
                const empAttendance = attendanceList.filter(att => att.employeeId === emp.id && att.date && att.date.startsWith(selectedMonth));
                const presentCount = empAttendance.filter(att => att.status === 'Présent').length;
                const workableCount = empAttendance.length;
                const rate = workableCount > 0 ? ((presentCount / workableCount) * 100).toFixed(0) : '0';
                
                return (
                  <div key={emp.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-isw-blue to-isw-teal flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                        {getInitials(emp)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{emp.firstName} {emp.lastName}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{emp.id} &bull; {emp.department}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-black ${
                          Number(rate) >= 90 ? 'text-emerald-700 bg-emerald-50' : 
                          Number(rate) >= 75 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {rate}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Présence</span>
                        <span>{presentCount} / {workableCount} j</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            Number(rate) >= 90 ? 'bg-emerald-500' : 
                            Number(rate) >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Daily Logs Row */}
                    <div className="mt-4 flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pt-1 border-t border-slate-50">
                      {getDaysInMonth().map(d => {
                        const record = empAttendance.find(att => att.date === d.dateStr);
                        const localDate = new Date();
                        const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                        const isToday = d.dateStr === todayStr;
                        
                        let badgeSymbol = d.dayNum;
                        let badgeColor = d.dayOfWeek === 6 
                          ? 'text-blue-500 border-blue-200 bg-blue-50/20 font-bold' 
                          : 'text-slate-400 border-slate-200 bg-slate-50/50';

                        if (record) {
                          if (record.status === 'Présent') {
                            badgeSymbol = '✔';
                            badgeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100 font-bold';
                          } else if (record.status === 'Absence injustifiée') {
                            badgeSymbol = '✘';
                            badgeColor = 'text-rose-600 bg-rose-50 border-rose-100 font-bold';
                          } else if (record.status === 'Maladie') {
                            badgeSymbol = 'M';
                            badgeColor = 'text-blue-600 bg-blue-50 border-blue-100 font-bold';
                          } else if (record.status === 'Congé') {
                            badgeSymbol = 'C';
                            badgeColor = 'text-amber-600 bg-amber-50 border-amber-100 font-bold';
                          } else if (record.status === 'Absence justifiée') {
                            badgeSymbol = 'J';
                            badgeColor = 'text-amber-600 bg-amber-50 border-amber-100 font-bold';
                          }
                        }

                        const handleCellClick = async () => {
                          if (!canEditAttendance) return;
                          const statusOrder = [
                            'Non pointé',
                            'Présent',
                            'Absence injustifiée',
                            'Absence justifiée',
                            'Congé',
                            'Maladie'
                          ];

                          const currentStatus = record ? record.status : 'Non pointé';
                          const currentIndex = statusOrder.indexOf(currentStatus);
                          const nextIndex = (currentIndex + 1) % statusOrder.length;
                          const nextStatus = statusOrder[nextIndex];

                          if (nextStatus === 'Non pointé') {
                            if (record && record.id) {
                              try {
                                await dbService.deleteAttendance(record.id);
                              } catch (err) {
                                console.error("Erreur lors de la suppression du pointage :", err);
                              }
                            }
                          } else {
                            const isPresent = nextStatus === 'Présent';
                            const now = new Date();
                            const arrivalTime = (isToday && isPresent)
                              ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                              : (record?.arrivalTime || '');

                            const attendanceData = {
                                id: record?.id || null, // pass ID to overwrite if exists
                                employeeId: emp.id,
                                date: d.dateStr,
                                status: nextStatus,
                                reason: '',
                                presentDays: isPresent ? 1 : 0,
                                workableDays: 1,
                                arrivalTime
                            };
                            try {
                              await dbService.saveAttendance(attendanceData);
                            } catch (err) {
                              console.error("Erreur lors de la modification du pointage :", err);
                            }
                          }
                        };

                        return (
                          <span 
                            key={d.dayNum} 
                            onClick={canEditAttendance ? handleCellClick : undefined}
                            title={record ? `${d.dateStr} : ${record.status}${record.arrivalTime ? ` (Arrivée: ${record.arrivalTime})` : ''}${canEditAttendance ? ' (Cliquez pour modifier)' : ''}` : `${d.dateStr} : Aucun pointage${canEditAttendance ? ' (Cliquez pour marquer)' : ''}`} 
                            className={`w-6 h-6 inline-flex items-center justify-center rounded-lg border text-[9px] ${canEditAttendance ? 'cursor-pointer hover:scale-110 active:scale-95 transition-all' : 'cursor-default'} shadow-sm ${badgeColor} ${d.isWeekend ? 'opacity-60' : ''} ${
                              isToday ? 'ring-2 ring-isw-blue ring-offset-1 font-bold scale-105 z-10 shadow-[0_0_8px_rgba(46,139,192,0.6)] border-isw-blue' : ''
                            }`}
                          >
                            {badgeSymbol}
                          </span>
                        );
                      })}
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
