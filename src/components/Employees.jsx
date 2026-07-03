import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Filter, 
  UserPlus, MapPin, Phone, Mail, Award, X, Download, PlusCircle
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { usePermissions } from '../context/PermissionsContext';
import { useToast } from '../context/ToastContext';
import { exportToPDF, exportEmployeesWord } from '../services/exportService';

export default function Employees() {
  const { can } = usePermissions();
  const { toast, confirm } = useToast();
  const canAddEmployee = can('employees', 'add');
  const canEditEmployee = can('employees', 'edit');
  const canDeleteEmployee = can('employees', 'delete');
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState({ departments: [], contractTypes: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Export list modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([
    { key: 'id', label: 'Matricule', selected: true },
    { key: 'firstName', label: 'Nom', selected: true },
    { key: 'lastName', label: 'Prénom', selected: true },
    { key: 'role', label: 'Poste', selected: true },
    { key: 'department', label: 'Département', selected: true },
    { key: 'contractType', label: 'Contrat', selected: false },
    { key: 'baseSalary', label: 'Salaire de base', selected: false },
    { key: 'phone', label: 'Téléphone', selected: false },
    { key: 'email', label: 'Email', selected: false },
  ]);
  const [customColumns, setCustomColumns] = useState([]); // Array of strings (custom empty column names)
  const [newCustomColumnName, setNewCustomColumnName] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf' or 'word'
  const [presets, setPresets] = useState([]);
  const [selectedPresetName, setSelectedPresetName] = useState('');
  const [newPresetName, setNewPresetName] = useState('');

  // Load presets on mount
  useEffect(() => {
    const saved = localStorage.getItem('sirh_export_presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Form states
  const [formId, setFormId] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formJobType, setFormJobType] = useState('Temps plein');
  const [formBaseSalary, setFormBaseSalary] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formContractType, setFormContractType] = useState('CDI');
  const [formGender, setFormGender] = useState('Homme');
  const [formCity, setFormCity] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('Actif');
  
  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const unsub = dbService.subscribeEmployees((data) => {
      setEmployees(data);
    });
    
    dbService.getSettings().then(setSettings);

    return () => unsub();
  }, []);

  // Open modal for adding
  const handleAddClick = () => {
    setEditingEmployee(null);
    // Suggest next ID based on existing
    const lastNum = employees.reduce((max, emp) => {
      const match = emp.id.match(/ISW(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextId = `ISW${String(lastNum + 1).padStart(2, '0')}`;
    
    setFormId(nextId);
    setFormFirstName('');
    setFormLastName('');
    setFormRole('');
    setFormDepartment(settings.departments[0] || 'RH');
    setFormJobType('Temps plein');
    setFormBaseSalary('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormContractType(settings.contractTypes[0] || 'CDI');
    setFormGender('Homme');
    setFormCity('');
    setFormPhone('');
    setFormEmail('');
    setFormStatus('Actif');
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditClick = (emp) => {
    setEditingEmployee(emp);
    setFormId(emp.id);
    setFormFirstName(emp.firstName);
    setFormLastName(emp.lastName);
    setFormRole(emp.role);
    setFormDepartment(emp.department);
    setFormJobType(emp.jobType);
    setFormBaseSalary(emp.baseSalary);
    setFormStartDate(emp.startDate);
    setFormContractType(emp.contractType);
    setFormGender(emp.gender);
    setFormCity(emp.city);
    setFormPhone(emp.phone);
    setFormEmail(emp.email);
    setFormStatus(emp.status);
    setErrors({});
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDeleteClick = async (empId) => {
    const hasConfirmed = await confirm({
      title: "Supprimer le collaborateur",
      message: `Êtes-vous sûr de vouloir supprimer définitivement l'employé ${empId} ? Cette action est irréversible.`,
      type: "danger"
    });
    if (hasConfirmed) {
      try {
        await dbService.deleteEmployee(empId);
        toast.success(`Employé ${empId} supprimé avec succès.`);
      } catch (err) {
        toast.error("Erreur lors de la suppression de l'employé.");
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formId) newErrors.id = "L'identifiant est requis.";
    else if (!/^ISW\d+$/.test(formId)) newErrors.id = "Format requis : ISW01, ISW02...";
    else if (!editingEmployee && employees.some(e => e.id === formId)) newErrors.id = "Cet ID est déjà attribué.";
    
    if (!formFirstName) newErrors.firstName = "Le nom est requis.";
    if (!formLastName) newErrors.lastName = "Le prénom est requis.";
    if (!formRole) newErrors.role = "Le poste est requis.";
    if (!formDepartment) newErrors.department = "Le département est requis.";
    
    const salary = Number(formBaseSalary);
    if (!formBaseSalary) newErrors.baseSalary = "Le salaire de base est requis.";
    else if (isNaN(salary) || salary <= 0) newErrors.baseSalary = "Saisissez un montant supérieur à 0.";
    
    if (!formStartDate) newErrors.startDate = "La date d'entrée est requise.";
    
    if (!formEmail) newErrors.email = "L'email est requis.";
    else if (!/\S+@\S+\.\S+/.test(formEmail)) newErrors.email = "Format d'adresse e-mail invalide.";
    
    if (!formPhone) newErrors.phone = "Le numéro de téléphone est requis.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const employeeData = {
      id: formId,
      firstName: formFirstName,
      lastName: formLastName,
      role: formRole,
      department: formDepartment,
      jobType: formJobType,
      baseSalary: Number(formBaseSalary),
      startDate: formStartDate,
      contractType: formContractType,
      gender: formGender,
      city: formCity,
      phone: formPhone,
      email: formEmail,
      status: formStatus
    };

    try {
      await dbService.saveEmployee(employeeData);
      setIsModalOpen(false);
      toast.success(editingEmployee ? "Collaborateur mis à jour." : "Nouveau collaborateur créé.");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de l'employé.");
    }
  };

  // Filter and search logic
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch = 
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    const matchesStatus = statusFilter ? emp.status === statusFilter : true;
    
    return matchesSearch && matchesDept && matchesStatus;
  });

  const formatFCFA = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
      .format(val)
      .replace('XOF', 'FCFA');
  };

  // Export List Logic
  const handleToggleColumn = (index) => {
    setSelectedColumns(prev => prev.map((col, idx) => idx === index ? { ...col, selected: !col.selected } : col));
  };

  const handleAddCustomColumn = () => {
    if (!newCustomColumnName.trim()) return;
    if (customColumns.includes(newCustomColumnName.trim())) {
      toast.warning("Cette colonne existe déjà.");
      return;
    }
    setCustomColumns(prev => [...prev, newCustomColumnName.trim()]);
    setNewCustomColumnName('');
  };

  const handleRemoveCustomColumn = (index) => {
    setCustomColumns(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Veuillez saisir un nom pour le modèle de disposition.");
      return;
    }
    const presetName = newPresetName.trim();
    const activeColsKeys = selectedColumns.filter(c => c.selected).map(c => c.key);
    
    const newPreset = {
      name: presetName,
      selectedKeys: activeColsKeys,
      customColumns: customColumns
    };

    let updatedPresets = [...presets];
    const existingIndex = presets.findIndex(p => p.name.toLowerCase() === presetName.toLowerCase());
    if (existingIndex > -1) {
      updatedPresets[existingIndex] = newPreset;
    } else {
      updatedPresets.push(newPreset);
    }

    setPresets(updatedPresets);
    localStorage.setItem('sirh_export_presets', JSON.stringify(updatedPresets));
    setSelectedPresetName(presetName);
    setNewPresetName('');
    toast.success(`Modèle "${presetName}" enregistré avec succès.`);
  };

  const handleLoadPreset = (presetName) => {
    setSelectedPresetName(presetName);
    if (!presetName) return;
    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      setSelectedColumns(prev => prev.map(col => ({ ...col, selected: preset.selectedKeys.includes(col.key) })));
      setCustomColumns(preset.customColumns || []);
      toast.success(`Modèle "${presetName}" chargé.`);
    }
  };

  const handleDeletePreset = (presetName) => {
    const updated = presets.filter(p => p.name !== presetName);
    setPresets(updated);
    localStorage.setItem('sirh_export_presets', JSON.stringify(updated));
    if (selectedPresetName === presetName) {
      setSelectedPresetName('');
    }
    toast.success(`Modèle "${presetName}" supprimé.`);
  };

  const triggerStaffExport = async () => {
    setIsExportModalOpen(false);
    const activeCols = selectedColumns.filter(c => c.selected);
    
    if (activeCols.length === 0 && customColumns.length === 0) {
      toast.error("Veuillez sélectionner au moins une colonne.");
      return;
    }

    const headers = [...activeCols.map(c => c.label), ...customColumns];
    const dataRows = filteredEmployees.map(emp => {
      const activeData = activeCols.map(col => {
        if (col.key === 'baseSalary') return formatFCFA(emp[col.key]);
        return emp[col.key] || '';
      });
      // Add empty cells for custom empty columns
      const blankData = customColumns.map(() => '');
      return [...activeData, ...blankData];
    });

    const reportTitle = "LISTE DU PERSONNEL ISW";
    
    if (exportFormat === 'pdf') {
      try {
        await exportToPDF(reportTitle, "Registre Global", headers, dataRows, `liste-personnel-${Date.now()}`);
        toast.success("Liste du personnel exportée en PDF.");
      } catch (err) {
        toast.error("Erreur lors de l'exportation PDF.");
      }
    } else {
      try {
        exportEmployeesWord(headers, dataRows, reportTitle);
        toast.success("Liste du personnel exportée sous Word.");
      } catch (err) {
        toast.error("Erreur lors de l'exportation Word.");
      }
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Base du Personnel</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gérez la liste de vos collaborateurs, leurs fiches contractuelles et de salaire.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-600/10 transition-all duration-200"
          >
            <Download className="w-4.5 h-4.5" />
            <span>Exporter la Liste</span>
          </button>
          {canAddEmployee && (
            <button
              onClick={handleAddClick}
              className="bg-isw-blue hover:bg-isw-blue-light text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-isw-blue/20 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un Employé</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Effectif</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{employees.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Collaborateurs Actifs</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {employees.filter(e => e.status === 'Actif').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Collaborateurs Inactifs</p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {employees.filter(e => e.status === 'Inactif').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">CDI / CDD</p>
          <p className="text-xl font-bold text-isw-blue mt-1">
            {employees.filter(e => e.contractType === 'CDI').length} / {employees.filter(e => e.contractType === 'CDD').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Rechercher par ID, nom, poste ou département..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-isw-blue transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          {/* Department Filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-isw-blue appearance-none min-w-[150px]"
            >
              <option value="">Tous les Départements</option>
              {settings.departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-isw-blue appearance-none min-w-[130px]"
            >
              <option value="">Tous les Statuts</option>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-4.5 px-6">Code & Collaborateur</th>
                <th className="py-4.5 px-6">Poste / Dép</th>
                <th className="py-4.5 px-6">Contrat & Type</th>
                <th className="py-4.5 px-6 text-right">Salaire Base</th>
                <th className="py-4.5 px-6 text-center">Statut</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Aucun employé trouvé correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}>
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-isw-blue-50 text-isw-blue flex items-center justify-center font-bold text-xs">
                          {emp.id}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{emp.firstName} {emp.lastName}</h4>
                          <span className="text-[11px] text-slate-400 font-semibold">{emp.gender} • {emp.city}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <h5 className="font-semibold text-slate-800">{emp.role}</h5>
                      <span className="text-xs text-isw-blue font-bold bg-isw-blue-50 px-2 py-0.5 rounded-md">
                        {emp.department}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                        {emp.contractType}
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1">Dép : {emp.startDate}</span>
                    </td>
                    <td className="py-4.5 px-6 text-right font-bold text-slate-800">
                      {formatFCFA(emp.baseSalary)}
                      <span className="block text-[10px] text-slate-400 font-medium">{emp.jobType}</span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        emp.status === 'Actif'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Actif' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEditEmployee && (
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="p-2 text-isw-blue hover:text-white hover:bg-isw-blue rounded-xl transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteEmployee && (
                          <button
                            onClick={() => handleDeleteClick(emp.id)}
                            className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-isw-blue-50 p-2.5 rounded-xl text-isw-blue">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingEmployee ? "Modifier l'employé" : "Ajouter un employé"}
                  </h3>
                  <p className="text-xs text-slate-500">Renseignez les informations contractuelles et personnelles.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* ID */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Code Employé</label>
                  <input
                    type="text"
                    disabled={!!editingEmployee}
                    value={formId}
                    onChange={(e) => setFormId(e.target.value.toUpperCase())}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.id ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="ISW01"
                  />
                  {errors.id && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.id}</p>}
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Nom (Famille)</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.firstName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="Dupont"
                  />
                  {errors.firstName && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.firstName}</p>}
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Prénom</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.lastName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="Jean"
                  />
                  {errors.lastName && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.lastName}</p>}
                </div>

                {/* Poste */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Poste (Rôle)</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.role ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="Chef de projet"
                  />
                  {errors.role && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.role}</p>}
                </div>

                {/* Département */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Département</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-isw-blue font-semibold"
                  >
                    {settings.departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Type de poste */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Temps de Travail</label>
                  <select
                    value={formJobType}
                    onChange={(e) => setFormJobType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-isw-blue font-semibold"
                  >
                    <option value="Temps plein">Temps plein</option>
                    <option value="Temps partiel">Temps partiel</option>
                  </select>
                </div>

                {/* Salaire de base */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Salaire Brut de Base (FCFA)</label>
                  <input
                    type="number"
                    value={formBaseSalary}
                    onChange={(e) => setFormBaseSalary(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.baseSalary ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="450000"
                  />
                  {errors.baseSalary && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.baseSalary}</p>}
                </div>

                {/* Date d'entrée */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Date d'Entrée</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.startDate ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                  />
                  {errors.startDate && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.startDate}</p>}
                </div>

                {/* Contrat */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Type de Contrat</label>
                  <select
                    value={formContractType}
                    onChange={(e) => setFormContractType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-isw-blue font-semibold"
                  >
                    {settings.contractTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Sexe</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-isw-blue font-semibold"
                  >
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Ville</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-isw-blue"
                    placeholder="Abidjan"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Téléphone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="+225 01020304"
                  />
                  {errors.phone && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.phone}</p>}
                </div>

                {/* E-mail */}
                <div className="md:col-span-2">
                  <label className="block text-slate-600 text-xs font-bold mb-2">Adresse E-mail</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none transition-colors ${
                      errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-isw-blue'
                    }`}
                    placeholder="employe@isw.com"
                  />
                  {errors.email && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.email}</p>}
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Statut</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-isw-blue font-semibold"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-isw-blue hover:bg-isw-blue-light text-white font-bold rounded-2xl text-sm shadow-lg shadow-isw-blue/20 transition-all"
                >
                  {editingEmployee ? "Enregistrer" : "Créer l'employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT LIST MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsExportModalOpen(false)} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-lg border border-slate-100 shadow-2xl z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Exporter la liste du personnel
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Configurez les colonnes et le format d'export
                </p>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Management Section */}
            <div className="p-3 bg-purple-50/30 border border-purple-100 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="block text-slate-700 text-xs font-bold">Modèles de dispositions enregistrés</label>
                {selectedPresetName && (
                  <button
                    onClick={() => handleDeletePreset(selectedPresetName)}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-extrabold"
                  >
                    Supprimer ce modèle
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedPresetName}
                  onChange={(e) => handleLoadPreset(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                >
                  <option value="">-- Choisir un modèle --</option>
                  {presets.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-center border-t border-purple-100/50 pt-2.5">
                <input
                  type="text"
                  placeholder="Enregistrer la disposition actuelle sous..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
                <button
                  onClick={handleSavePreset}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>

            {/* Step 1: Select Built-in Columns */}
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-2">1. Informations de l'employé à inclure</label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                {selectedColumns.map((col, index) => (
                  <label key={col.key} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={col.selected}
                      onChange={() => handleToggleColumn(index)}
                      className="w-4 h-4 rounded border-slate-300 text-isw-blue focus:ring-isw-blue"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Create Custom Empty Columns */}
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-2">2. Ajouter des colonnes vierges (écriture papier/manuelle)</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Ex : Émargement, Remarques..."
                  value={newCustomColumnName}
                  onChange={(e) => setNewCustomColumnName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomColumn}
                  className="px-4 py-2.5 bg-isw-blue hover:bg-isw-blue-light text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>

              {customColumns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 bg-purple-50/50 border border-purple-100 rounded-2xl">
                  {customColumns.map((colName, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-white border border-purple-200/60 px-2.5 py-1 rounded-xl text-[10px] font-bold text-purple-700">
                      <span>{colName}</span>
                      <button 
                        onClick={() => handleRemoveCustomColumn(index)}
                        className="p-0.5 hover:bg-purple-100 rounded-md transition-colors"
                      >
                        <X className="w-3 h-3 text-purple-500" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Choose Format */}
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-2">3. Format d'exportation</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={() => setExportFormat('pdf')}
                    className="w-4 h-4 text-isw-blue focus:ring-isw-blue"
                  />
                  <span>PDF (Charte ISW)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="word"
                    checked={exportFormat === 'word'}
                    onChange={() => setExportFormat('word')}
                    className="w-4 h-4 text-isw-blue focus:ring-isw-blue"
                  />
                  <span>Word (.DOC éditable)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t border-slate-50 mt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={triggerStaffExport}
                className="px-4 py-2.5 bg-isw-blue hover:bg-isw-blue-light text-white font-bold text-xs rounded-xl shadow-md shadow-isw-blue/10 transition-colors"
              >
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
