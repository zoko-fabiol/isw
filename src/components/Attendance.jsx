import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, AlertTriangle, HelpCircle, X, Search, Trash2, 
  LayoutGrid, List, Plus, Settings, Sparkles, Scale, Info
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { exportToPDF, exportToExcel, formatFCFA } from '../services/exportService';
import { usePermissions } from '../context/PermissionsContext';
import { useToast } from '../context/ToastContext';

export default function Attendance() {
  const { can } = usePermissions();
  const { toast, confirm } = useToast();
  const canAddAttendance = can('attendance', 'add');
  const canEditAttendance = can('attendance', 'edit') || can('attendance', 'delete');
  
  const [employees, setEmployees] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [delaysList, setDelaysList] = useState([]);
  const [settings, setSettings] = useState({ expectedTime: '08:00', standardHours: 173 });
  
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (Remplissage en groupe) ou 'cards' (Fiches individuelles)
  
  // Single Log Form States
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Présent');
  const [reason, setReason] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [delayStatus, setDelayStatus] = useState('Non justifié');
  const [expectedTime, setExpectedTime] = useState('08:00');
  
  const [errors, setErrors] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // Modal states for grid click cell editing
  const [editingCell, setEditingCell] = useState(null); // { employee, dateStr }

  useEffect(() => {
    dbService.getEmployees().then(setEmployees);
    dbService.getSettings().then((s) => {
      setSettings(s);
      setExpectedTime(s.expectedTime || '08:00');
    });
    
    const unsubAtt = dbService.subscribeAttendance(setAttendanceList);
    const unsubDel = dbService.subscribeDelays(setDelaysList);

    return () => {
      unsubAtt();
      unsubDel();
    };
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

  const filteredAttendance = useMemo(() => {
    return attendanceList.filter(att => att.date && att.date.startsWith(selectedMonth));
  }, [attendanceList, selectedMonth]);

  const filteredDelays = useMemo(() => {
    return delaysList.filter(d => d.date && d.date.startsWith(selectedMonth));
  }, [delaysList, selectedMonth]);

  // Statistics Computations
  const totalWorkable = filteredAttendance.reduce((sum, att) => sum + (Number(att.workableDays) || 1), 0);
  const totalPresent = filteredAttendance.reduce((sum, att) => sum + (Number(att.presentDays) || 0), 0);
  const presenceRate = totalWorkable > 0 ? ((totalPresent / totalWorkable) * 100).toFixed(1) : '0.0';
  
  const totalMinutes = filteredDelays.reduce((sum, d) => sum + (Number(d.delayMinutes) || 0), 0);
  const unjustifiedMinutes = filteredDelays
    .filter(d => d.status === 'Non justifié')
    .reduce((sum, d) => sum + (Number(d.delayMinutes) || 0), 0);

  const totalPenalty = useMemo(() => {
    return filteredDelays
      .filter(d => d.status === 'Non justifié')
      .reduce((sum, d) => {
        const emp = employees.find(e => e.id === d.employeeId);
        if (!emp) return sum;
        const hourlyRate = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const ratePerMinute = hourlyRate / 60;
        return sum + (Number(d.delayMinutes) || 0) * ratePerMinute;
      }, 0);
  }, [filteredDelays, employees, settings]);

  // Liste des jours fériés fixes et mobiles au Cameroun
  const getCameroonHolidays = (year) => {
    return {
      // Fêtes fixes
      [`${year}-01-01`]: "Jour de l'An / Fête Nationale de la Jeunesse",
      [`${year}-02-11`]: "Fête de la Jeunesse",
      [`${year}-05-01`]: "Fête du Travail",
      [`${year}-05-20`]: "Fête Nationale (20 Mai)",
      [`${year}-08-15`]: "Assomption",
      [`${year}-12-25`]: "Noël",
      // Fêtes religieuses chrétiennes mobiles (calculées à titre indicatif ou renseignées pour les années courantes 2026/2027)
      [`2026-04-03`]: "Vendredi Saint",
      [`2026-04-06`]: "Lundi de Pâques",
      [`2026-05-14`]: "Ascension",
      [`2026-05-25`]: "Lundi de Pentecôte",
      [`2027-03-26`]: "Vendredi Saint",
      [`2027-03-29`]: "Lundi de Pâques",
      [`2027-05-06`]: "Ascension",
      [`2027-05-17`]: "Lundi de Pentecôte",
      // Fêtes musulmanes mobiles (estimations basées sur le calendrier hégirien)
      [`2026-03-20`]: "Aïd al-Fitr (Fête de fin de Ramadan)",
      [`2026-05-27`]: "Aïd al-Adha (Tabaski)",
      [`2026-08-25`]: "Mawlid (Naissance du Prophète)",
      [`2027-03-09`]: "Aïd al-Fitr",
      [`2027-05-16`]: "Aïd al-Adha",
      [`2027-08-15`]: "Mawlid",
    };
  };

  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const numDays = new Date(year, month, 0).getDate();
    const holidays = getCameroonHolidays(year);
    const days = [];
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek !== 0) { // Exclude Sundays
        days.push({ 
          dayNum: d, 
          dateStr, 
          isWeekend: dayOfWeek === 6, 
          dayLabel: new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 2).toUpperCase(),
          holidayName: holidays[dateStr] || null
        });
      }
    }
    return days;
  };

  const handlePresencePDF = async () => {
    setExportingPDF(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Présents', 'Retards', 'Retenue (FCFA)', 'Taux'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const rows = activeEmps.map(emp => {
        const empAtt = filteredAttendance.filter(a => a.employeeId === emp.id);
        const empDel = filteredDelays.filter(d => d.employeeId === emp.id);
        const present = empAtt.filter(a => a.status === 'Présent').length;
        const unjMin = empDel.filter(d => d.status === 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const penalty = unjMin * (hr / 60);
        const total = empAtt.length;
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : 'N/A';
        return [
          emp.id, 
          `${emp.firstName} ${emp.lastName}`, 
          emp.department, 
          present, 
          empDel.length, 
          formatFCFA(penalty), 
          rate
        ];
      });
      const summary = [
        ['Effectif analysé :', `${activeEmps.length} employés`],
        ['Taux de présence moyen :', `${presenceRate}%`],
        ['Total minutes retards :', `${totalMinutes} min`],
        ['Total retenues estimées :', formatFCFA(totalPenalty)],
      ];
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToPDF('BILAN CONSOLIDÉ PRÉSENCES & RETARDS', periodLabel, cols, rows, `bilan-presence-retards-${selectedMonth}`, summary);
      toast.success("Bilan exporté en PDF.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'exportation PDF.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePresenceExcel = async () => {
    setExportingExcel(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Présents', 'Abs. Justifiées', 'Abs. Injustifiées', 'Congés', 'Maladie', 'Retards', 'Retenue (FCFA)', 'Taux (%)'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const rows = activeEmps.map(emp => {
        const empAtt = filteredAttendance.filter(a => a.employeeId === emp.id);
        const empDel = filteredDelays.filter(d => d.employeeId === emp.id);
        const present = empAtt.filter(a => a.status === 'Présent').length;
        const absJ = empAtt.filter(a => a.status === 'Absence justifiée').length;
        const absI = empAtt.filter(a => a.status === 'Absence injustifiée').length;
        const conge = empAtt.filter(a => a.status === 'Congé').length;
        const mal = empAtt.filter(a => a.status === 'Maladie').length;
        const unjMin = empDel.filter(d => d.status === 'Non justifié').reduce((s, d) => s + (Number(d.delayMinutes) || 0), 0);
        const hr = (Number(emp.baseSalary) || 0) / (settings.standardHours || 173);
        const penalty = unjMin * (hr / 60);
        const total = empAtt.length;
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        return [
          emp.id, 
          `${emp.firstName} ${emp.lastName}`, 
          emp.department, 
          present, 
          absJ, 
          absI, 
          conge, 
          mal, 
          empDel.length, 
          Math.round(penalty), 
          rate
        ];
      });
      const periodLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      await exportToExcel('Registre ' + periodLabel, cols, rows, `bilan-presence-retards-${selectedMonth}`);
      toast.success("Registre exporté en Excel.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'exportation Excel.");
    } finally {
      setExportingExcel(false);
    }
  };

  const [isDailyExportOpen, setIsDailyExportOpen] = useState(false);
  const [dailyExportDate, setDailyExportDate] = useState('');

  const handleDailyPresencePDF = async () => {
    // Determine the day to export (default to today or yesterday depending on month)
    const todayStr = new Date().toISOString().split('T')[0];
    const isCurrentMonth = todayStr.startsWith(selectedMonth);
    const dayToExport = isCurrentMonth ? todayStr : `${selectedMonth}-01`;
    setDailyExportDate(dayToExport);
    setIsDailyExportOpen(true);
  };

  const triggerDailyExport = async (userDay) => {
    setIsDailyExportOpen(false);
    if (!userDay) return;

    // Validate format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(userDay)) {
      toast.error("Format de date invalide (AAAA-MM-JJ).");
      return;
    }

    setExportingPDF(true);
    try {
      const cols = ['Matricule', 'Nom & Prénom', 'Département', 'Poste', 'Statut de Présence', 'Heure Arrivée', 'Retard (min)', 'Justification / Motif'];
      const activeEmps = employees.filter(e => e.status === 'Actif');
      const dailyAtt = attendanceList.filter(a => a.date === userDay);
      const dailyDel = delaysList.filter(d => d.date === userDay);

      const rows = activeEmps.map(emp => {
        const att = dailyAtt.find(a => a.employeeId === emp.id);
        const del = dailyDel.find(d => d.employeeId === emp.id);
        
        let statusText = 'Non pointé';
        let arrivalText = '—';
        let delayMin = 0;
        let comment = '—';

        if (att) {
          statusText = att.status;
          arrivalText = att.arrivalTime || '—';
          comment = att.reason || '—';
        }
        if (del) {
          delayMin = del.delayMinutes || 0;
          if (del.reason) comment = del.reason;
        }

        return [
          emp.id,
          `${emp.firstName} ${emp.lastName}`,
          emp.department,
          emp.role,
          statusText,
          arrivalText,
          delayMin > 0 ? `${delayMin} min (${del.status})` : '—',
          comment
        ];
      });

      const presentCount = dailyAtt.filter(a => a.status === 'Présent').length;
      const totalCount = activeEmps.length;
      const summary = [
        ['Date du rapport :', new Date(userDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
        ['Employés présents :', `${presentCount} / ${totalCount}`],
        ['Retards constatés :', `${dailyDel.length} retards`],
      ];

      await exportToPDF('RAPPORT JOURNALIER DE PRÉSENCE', userDay, cols, rows, `rapport-journalier-${userDay}`, summary);
      toast.success(`Rapport journalier du ${userDay} exporté.`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'exportation du rapport journalier.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!empId) newErrors.empId = "Veuillez sélectionner un employé.";
    if (!date) newErrors.date = "La date est requise.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await saveAttendanceRecord(empId, date, status, reason, arrivalTime, delayStatus);
      setEmpId('');
      setReason('');
      setArrivalTime('');
      setDelayStatus('Non justifié');
      setStatus('Présent');
      toast.success("Pointage enregistré avec succès !");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const saveAttendanceRecord = async (employeeId, dateStr, attStatus, attReason, arrTime, delStatus) => {
    const isPresent = attStatus === 'Présent';
    
    // Save Attendance Entry
    const existingAtt = attendanceList.find(a => a.employeeId === employeeId && a.date === dateStr);
    const attendanceData = {
      id: existingAtt?.id || null,
      employeeId,
      date: dateStr,
      status: attStatus,
      reason: isPresent ? '' : attReason,
      presentDays: isPresent ? 1 : 0,
      workableDays: 1,
      arrivalTime: isPresent ? arrTime : ''
    };
    await dbService.saveAttendance(attendanceData);

    // Save or delete Delay Entry
    const existingDel = delaysList.find(d => d.employeeId === employeeId && d.date === dateStr);
    if (isPresent && arrTime) {
      const [expH, expM] = expectedTime.split(':').map(Number);
      const [arrH, arrM] = arrTime.split(':').map(Number);
      const diff = (arrH * 60 + arrM) - (expH * 60 + expM);

      if (diff > 0) {
        const delayData = {
          id: existingDel?.id || null,
          employeeId,
          date: dateStr,
          expectedTime,
          arrivalTime: arrTime,
          delayMinutes: Number(diff),
          reason: delStatus === 'Justifié' ? attReason : '',
          status: delStatus
        };
        await dbService.saveDelay(delayData);
      } else if (existingDel) {
        await dbService.deleteDelay(existingDel.id);
      }
    } else if (existingDel) {
      await dbService.deleteDelay(existingDel.id);
    }
  };

  const getInitials = (emp) => {
    if (!emp) return '??';
    return `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}`.toUpperCase();
  };

  const openCellEditor = (emp, dateStr) => {
    if (!canEditAttendance) return;
    const att = attendanceList.find(a => a.employeeId === emp.id && a.date === dateStr);
    const del = delaysList.find(d => d.employeeId === emp.id && d.date === dateStr);

    setEditingCell({
      employee: emp,
      dateStr,
      status: att?.status || 'Non pointé',
      reason: att?.reason || del?.reason || '',
      arrivalTime: att?.arrivalTime || del?.arrivalTime || '',
      delayStatus: del?.status || 'Non justifié'
    });
  };

  const handleCellEditorSave = async () => {
    try {
      const { employee, dateStr, status: s, reason: r, arrivalTime: a, delayStatus: ds } = editingCell;
      if (s === 'Non pointé') {
        const att = attendanceList.find(x => x.employeeId === employee.id && x.date === dateStr);
        const del = delaysList.find(x => x.employeeId === employee.id && x.date === dateStr);
        if (att) await dbService.deleteAttendance(att.id);
        if (del) await dbService.deleteDelay(del.id);
      } else {
        await saveAttendanceRecord(employee.id, dateStr, s, r, a, ds);
      }
      setEditingCell(null);
      toast.success("Pointage mis à jour.");
    } catch (err) {
      toast.error("Erreur de sauvegarde.");
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Présences & Retards</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gérez les fiches de présence quotidiennes et suivez les retards sur un tableau mensuel unique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-isw-blue text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grille groupe
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-isw-blue text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Fiches
            </button>
          </div>
          
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
            onClick={handleDailyPresencePDF}
            disabled={exportingPDF}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-purple-600/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingPDF ? 'Export...' : 'Bilan du Jour'}
          </button>
          <button
            onClick={handlePresencePDF}
            disabled={exportingPDF}
            className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-isw-blue/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingPDF ? 'Export...' : 'Bilan Mensuel'}
          </button>
          <button
            onClick={handlePresenceExcel}
            disabled={exportingExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl font-bold shadow-md shadow-emerald-600/10 flex items-center gap-2 transition-all text-xs"
          >
            {exportingExcel ? 'Export...' : 'Excel Mensuel'}
          </button>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-isw-blue-50 w-11 h-11 flex items-center justify-center rounded-2xl text-isw-blue flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taux de présence</p>
            <h3 className="text-xl font-black text-slate-800 truncate mt-0.5">{presenceRate}%</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 w-11 h-11 flex items-center justify-center rounded-2xl text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jours de Présence</p>
            <h3 className="text-xl font-black text-slate-800 truncate mt-0.5">{totalPresent} j</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 w-11 h-11 flex items-center justify-center rounded-2xl text-amber-500 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minutes Retards</p>
            <h3 className="text-xl font-black text-slate-800 truncate mt-0.5">{totalMinutes} min</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 w-11 h-11 flex items-center justify-center rounded-2xl text-rose-600 flex-shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retenues estimées</p>
            <h3 className="text-xl font-black text-rose-600 truncate mt-0.5">{formatFCFA(totalPenalty)}</h3>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* GRILLE DE REMPLISSAGE EN GROUPE (MODE TABLEAU CONSOLIDÉ) */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-isw-blue" />
              <h3 className="text-lg font-bold text-slate-800">Grille Mensuelle Collective</h3>
            </div>
            
            {/* Legend banner */}
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-xl">
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded bg-emerald-100 border border-emerald-200 text-emerald-700">✔</span> Présent</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded bg-rose-100 border border-rose-200 text-rose-700">✘</span> Abs. Injustifiée</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded bg-amber-100 border border-amber-200 text-amber-700">J</span> Abs. Justifiée</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded bg-cyan-100 border border-cyan-200 text-cyan-700">C</span> Congé</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded bg-blue-100 border border-blue-200 text-blue-700">M</span> Maladie</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded bg-purple-100 border border-purple-200 text-purple-700 font-extrabold">F</span> Férié (Cameroun)</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3 font-bold text-slate-600 sticky left-0 bg-slate-50 z-10 w-[180px] border-r border-slate-100">Employé</th>
                  {getDaysInMonth().map((day) => {
                    const localDate = new Date();
                    const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                    const isToday = day.dateStr === todayStr;
                    return (
                      <th 
                        key={day.dayNum} 
                        title={day.holidayName ? day.holidayName : undefined}
                        className={`p-2 text-center font-bold min-w-[40px] ${
                          isToday 
                            ? 'bg-isw-blue text-white shadow-[0_0_8px_rgba(46,139,192,0.4)] z-20 sticky' 
                            : day.holidayName
                              ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.3)] z-15'
                              : day.isWeekend 
                                ? 'bg-slate-100/50 text-slate-500' 
                                : 'text-slate-500'
                        }`}
                      >
                        <div>{day.dayNum}</div>
                        <div className={`text-[8px] uppercase mt-0.5 ${isToday || day.holidayName ? 'text-white/80' : 'text-slate-400'}`}>{day.dayLabel}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.filter(e => e.status === 'Actif').map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee sticky cell */}
                    <td className="p-3 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] flex flex-col min-w-[180px] z-10">
                      <span className="truncate">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">{emp.id} &bull; {emp.role.substring(0, 15)}...</span>
                    </td>
                    {/* Days cells */}
                    {getDaysInMonth().map((day) => {
                      const att = filteredAttendance.find(a => a.employeeId === emp.id && a.date === day.dateStr);
                      const del = filteredDelays.find(d => d.employeeId === emp.id && d.date === day.dateStr);
                      const localDate = new Date();
                      const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                      const isToday = day.dateStr === todayStr;
                      
                      let cellSymbol = '—';
                      let cellClass = 'bg-slate-50 text-slate-300 border-slate-100';

                      if (att) {
                        if (att.status === 'Présent') {
                          cellSymbol = del ? '⏱' : '✔';
                          cellClass = del 
                            ? 'bg-amber-50 text-amber-600 border-amber-200 font-bold' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 font-bold';
                        } else if (att.status === 'Absence injustifiée') {
                          cellSymbol = '✘';
                          cellClass = 'bg-rose-50 text-rose-600 border-rose-200 font-bold';
                        } else if (att.status === 'Absence justifiée') {
                          cellSymbol = 'J';
                          cellClass = 'bg-amber-50 text-amber-600 border-amber-200 font-bold';
                        } else if (att.status === 'Congé') {
                          cellSymbol = 'C';
                          cellClass = 'bg-cyan-50 text-cyan-600 border-cyan-200 font-bold';
                        } else if (att.status === 'Maladie') {
                          cellSymbol = 'M';
                          cellClass = 'bg-blue-50 text-blue-600 border-blue-200 font-bold';
                        }
                      } else if (day.holidayName) {
                        cellSymbol = 'F';
                        cellClass = 'bg-purple-50 text-purple-700 border-purple-200 font-extrabold';
                      }

                      return (
                        <td
                          key={day.dayNum}
                          onClick={() => openCellEditor(emp, day.dateStr)}
                          title={`${emp.firstName} ${emp.lastName} - ${day.dateStr}
Statut : ${att?.status || (day.holidayName ? `Férié (${day.holidayName})` : 'Non pointé')}
${del ? `Retard : ${del.delayMinutes} min (${del.arrivalTime}) - ${del.status}` : ''}`}
                          className={`p-2 border-r border-slate-100 text-center select-none transition-all ${
                            canEditAttendance ? 'cursor-pointer hover:bg-slate-100/50 hover:scale-105 active:scale-95' : 'cursor-default'
                          } ${day.isWeekend ? 'bg-slate-50/20' : ''} ${
                            isToday 
                              ? 'bg-isw-blue/10 font-bold scale-[1.02] border-x border-isw-blue/20 ring-1 ring-isw-blue/30 ring-inset' 
                              : day.holidayName 
                                ? 'bg-purple-50/30' 
                                : ''
                          }`}
                        >
                          <span className={`w-6 h-6 inline-flex items-center justify-center rounded-lg border text-[10px] ${
                            isToday && !att ? 'border-isw-blue/30 bg-white text-isw-blue' : cellClass
                          }`}>
                            {cellSymbol}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VUE CARTES INDIVIDUELLES (IMAGE 1) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Logger Form */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-2.5 h-6 bg-isw-blue rounded-full"></div>
              <h3 className="text-lg font-bold text-slate-800">Enregistrer un Pointage</h3>
            </div>
            {canAddAttendance ? (
              <form onSubmit={handleSingleSubmit} className="space-y-5">
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

                {/* Conditional fields for Present: Arrival Time for delay calculations */}
                {status === 'Présent' && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs font-bold mb-1">
                      <Clock className="w-3.5 h-3.5 text-isw-blue" />
                      <span>Paramètres d'arrivée (Heure prévue : {expectedTime})</span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Heure d'arrivée réelle</label>
                      <input
                        type="time"
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    {arrivalTime && arrivalTime > expectedTime && (
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Statut du retard</label>
                        <select
                          value={delayStatus}
                          onChange={(e) => setDelayStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                        >
                          <option value="Non justifié">Non justifié (Retenue appliquée)</option>
                          <option value="Justifié">Justifié (Exempté)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason (Conditional) */}
                {(status !== 'Présent' || (status === 'Présent' && arrivalTime > expectedTime && delayStatus === 'Justifié')) && (
                  <div>
                    <label className="block text-slate-600 text-xs font-bold mb-2">Motif / Commentaire</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-isw-blue text-slate-700 min-h-[80px]"
                      placeholder="Saisissez le motif..."
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

          {/* Cards List Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-isw-blue" />
              <h3 className="text-lg font-bold text-slate-800">Suivi des Présences</h3>
            </div>

            {employees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
                Aucun collaborateur enregistré.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[660px] overflow-y-auto pr-1">
                {employees.map((emp) => {
                  const empAttendance = filteredAttendance.filter(att => att.employeeId === emp.id);
                  const empDelaysList = filteredDelays.filter(d => d.employeeId === emp.id);
                  const presentCount = empAttendance.filter(att => att.status === 'Présent').length;
                  const workableCount = empAttendance.length;
                  const rate = workableCount > 0 ? ((presentCount / workableCount) * 100).toFixed(0) : '0';

                  return (
                    <div key={emp.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                      {/* Card Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-isw-blue to-isw-teal flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                          {getInitials(emp)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-800 text-sm truncate">{emp.firstName} {emp.lastName}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{emp.id} &bull; {emp.department}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-black ${
                            Number(rate) >= 90 ? 'text-emerald-700 bg-emerald-50' : 
                            Number(rate) >= 75 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                          }`}>
                            {rate}%
                          </span>
                          {empDelaysList.length > 0 && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded-md">
                              {empDelaysList.length} retards
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Progress Bar */}
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
                          const delRecord = empDelaysList.find(del => del.date === d.dateStr);
                          const localDate = new Date();
                          const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                          const isToday = d.dateStr === todayStr;
                          
                          let badgeSymbol = d.dayNum;
                          let badgeColor = d.isWeekend 
                            ? 'text-blue-500 border-blue-200 bg-blue-50/20 font-bold' 
                            : 'text-slate-400 border-slate-200 bg-slate-50/50';

                          if (record) {
                            if (record.status === 'Présent') {
                              badgeSymbol = delRecord ? '⏱' : '✔';
                              badgeColor = delRecord 
                                ? 'text-amber-600 bg-amber-50 border-amber-100 font-bold animate-pulse' 
                                : 'text-emerald-600 bg-emerald-50 border-emerald-100 font-bold';
                            } else if (record.status === 'Absence injustifiée') {
                              badgeSymbol = '✘';
                              badgeColor = 'text-rose-600 bg-rose-50 border-rose-100 font-bold';
                            } else if (record.status === 'Maladie') {
                              badgeSymbol = 'M';
                              badgeColor = 'text-blue-600 bg-blue-50 border-blue-100 font-bold';
                            } else if (record.status === 'Congé') {
                              badgeSymbol = 'C';
                              badgeColor = 'text-cyan-600 bg-cyan-50 border-cyan-100 font-bold';
                            } else if (record.status === 'Absence justifiée') {
                              badgeSymbol = 'J';
                              badgeColor = 'text-amber-600 bg-amber-50 border-amber-100 font-bold';
                            }
                          }

                          return (
                            <span 
                              key={d.dayNum} 
                              onClick={() => openCellEditor(emp, d.dateStr)}
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
      )}

      {/* CELL EDITOR DIALOG MODAL (POPUP SUR MESURE POUR MODIFIER UNE PRÉSENCE) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setEditingCell(null)} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md border border-slate-100 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-50 pb-4 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Modifier Pointage
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  {editingCell.employee.firstName} {editingCell.employee.lastName} &bull; {editingCell.dateStr}
                </p>
              </div>
              <button 
                onClick={() => setEditingCell(null)}
                className="p-1 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 text-[11px] font-bold mb-1.5 uppercase">Statut de Présence</label>
                <select
                  value={editingCell.status}
                  onChange={(e) => setEditingCell(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="Non pointé">Non pointé (Vierge)</option>
                  <option value="Présent">Présent (Présent au poste)</option>
                  <option value="Absence justifiée">Absence justifiée</option>
                  <option value="Absence injustifiée">Absence injustifiée</option>
                  <option value="Congé">Congé</option>
                  <option value="Maladie">Maladie</option>
                </select>
              </div>

              {editingCell.status === 'Présent' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-bold uppercase">
                    <Clock className="w-3.5 h-3.5 text-isw-blue" />
                    <span>Paramètres d'arrivée (Heure prévue : {expectedTime})</span>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">Heure d'arrivée réelle</label>
                    <input
                      type="time"
                      value={editingCell.arrivalTime}
                      onChange={(e) => setEditingCell(prev => ({ ...prev, arrivalTime: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  {editingCell.arrivalTime && editingCell.arrivalTime > expectedTime && (
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">Statut du retard</label>
                      <select
                        value={editingCell.delayStatus}
                        onChange={(e) => setEditingCell(prev => ({ ...prev, delayStatus: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Non justifié">Non justifié (Retenue appliquée)</option>
                        <option value="Justifié">Justifié (Exempté)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {(editingCell.status !== 'Présent' && editingCell.status !== 'Non pointé' || (editingCell.status === 'Présent' && editingCell.arrivalTime > expectedTime && editingCell.delayStatus === 'Justifié')) && (
                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1.5 uppercase">Motif / Justification</label>
                  <textarea
                    value={editingCell.reason}
                    onChange={(e) => setEditingCell(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 min-h-[60px]"
                    placeholder="Saisissez le motif..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-50 mt-5">
              <button
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCellEditorSave}
                className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light text-white font-bold text-xs rounded-xl shadow-md shadow-isw-blue/10 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAILY PRESENCE DATE PICKER MODAL */}
      {isDailyExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsDailyExportOpen(false)} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-50 pb-4 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Exporter le bilan journalier
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Choisissez la date du rapport
                </p>
              </div>
              <button 
                onClick={() => setIsDailyExportOpen(false)}
                className="p-1 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 text-[11px] font-bold mb-1.5 uppercase">Date de pointage</label>
                <input
                  type="date"
                  value={dailyExportDate}
                  onChange={(e) => setDailyExportDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-50 mt-5">
              <button
                onClick={() => setIsDailyExportOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => triggerDailyExport(dailyExportDate)}
                className="px-4 py-2 bg-isw-blue hover:bg-isw-blue-light text-white font-bold text-xs rounded-xl shadow-md shadow-isw-blue/10 transition-colors"
              >
                Exporter PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
