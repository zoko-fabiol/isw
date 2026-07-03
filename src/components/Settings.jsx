import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Plus, Trash2, ListFilter, Sliders } from 'lucide-react';
import { dbService } from '../services/dbService';
import { usePermissions } from '../context/PermissionsContext';
import { useToast } from '../context/ToastContext';
import UserManagement from './UserManagement';

export default function Settings() {
  const { isSuperAdmin } = usePermissions();
  const { toast, confirm } = useToast();
  const [settings, setSettings] = useState({
    departments: [],
    contractTypes: [],
    standardHours: 173,
    expectedTime: '08:00',
    socialContributionRate: 12,
    overtimeRate: 1.25,
  });

  const [loading, setLoading] = useState(true);
  const [newDepartment, setNewDepartment] = useState('');
  const [newContractType, setNewContractType] = useState('');

  useEffect(() => {
    // Load local settings immediately for instant UI rendering
    const localSaved = localStorage.getItem('sirh_settings');
    if (localSaved) {
      try {
        setSettings(JSON.parse(localSaved));
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    }

    // Then update from database service asynchronously
    dbService.getSettings()
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleChange = (field, val) => {
    setSettings(prev => ({
      ...prev,
      [field]: val
    }));
  };

  // Add a department
  const handleAddDept = (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    if (settings.departments.includes(newDepartment.trim())) {
      toast.warning("Ce département existe déjà.");
      return;
    }
    const updatedDepts = [...settings.departments, newDepartment.trim()];
    setSettings(prev => ({ ...prev, departments: updatedDepts }));
    setNewDepartment('');
  };

  // Delete a department
  const handleDeleteDept = async (dept) => {
    const isConfirmed = await confirm({
      title: "Supprimer le département ?",
      message: `Êtes-vous sûr de vouloir supprimer le département "${dept}" ?`
    });
    if (isConfirmed) {
      const updatedDepts = settings.departments.filter(d => d !== dept);
      setSettings(prev => ({ ...prev, departments: updatedDepts }));
      toast.success("Département retiré.");
    }
  };

  // Add a contract type
  const handleAddContract = (e) => {
    e.preventDefault();
    if (!newContractType.trim()) return;
    if (settings.contractTypes.includes(newContractType.trim())) {
      toast.warning("Ce type de contrat existe déjà.");
      return;
    }
    const updatedContracts = [...settings.contractTypes, newContractType.trim()];
    setSettings(prev => ({ ...prev, contractTypes: updatedContracts }));
    setNewContractType('');
  };

  // Delete a contract type
  const handleDeleteContract = async (type) => {
    const isConfirmed = await confirm({
      title: "Supprimer le type de contrat ?",
      message: `Êtes-vous sûr de vouloir supprimer le type de contrat "${type}" ?`
    });
    if (isConfirmed) {
      const updatedContracts = settings.contractTypes.filter(c => c !== type);
      setSettings(prev => ({ ...prev, contractTypes: updatedContracts }));
      toast.success("Type de contrat retiré.");
    }
  };

  // Save all settings
  const handleSaveAll = async () => {
    try {
      const dataToSave = {
        ...settings,
        standardHours: Number(settings.standardHours),
        socialContributionRate: Number(settings.socialContributionRate),
        overtimeRate: Number(settings.overtimeRate)
      };
      await dbService.saveSettings(dataToSave);
      toast.success("Configuration sauvegardée avec succès !");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de la configuration.");
    }
  };

  // Reset database to restored ISW Technosys dataset
  const handleResetDatabase = async () => {
    const isConfirmed = await confirm({
      title: "Réinitialiser la base de données ?",
      message: "Êtes-vous sûr de vouloir réinitialiser la base de données ? Toutes les données actuelles (locales ou Firestore) seront écrasées et remplacées par les données de démonstration."
    });
    if (isConfirmed) {
      try {
        await dbService.resetDatabase();
        toast.success("Base de données réinitialisée avec succès !");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error("Erreur lors de la réinitialisation : " + err.message);
        // If it's a Firestore permission issue, reload anyway so local data loads
        if (err.message && err.message.includes("Permissions Firestore")) {
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-isw-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Paramètres de l'Entreprise</h2>
          <p className="text-slate-500 text-sm mt-1">
            Définissez les règles de calculs de paie, de présence et gérez les listes de références.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          className="bg-isw-blue hover:bg-isw-blue-light text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-isw-blue/20 transition-all duration-200"
        >
          <Save className="w-4 h-4" />
          <span>Sauvegarder les Changements</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isSuperAdmin && (
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-isw-navy-dark via-isw-navy to-isw-blue rounded-3xl p-6 shadow-xl shadow-isw-blue/10 border border-isw-blue/20 mb-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-isw-teal font-bold">Administration</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">Gestion des Utilisateurs</h3>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                    Créez les comptes, activez-les ou ajustez leurs permissions par onglet depuis un seul espace réservé au Super Admin.
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/10 text-xs font-bold text-white">
                  <SettingsIcon className="w-4 h-4" />
                  Super Admin only
                </div>
              </div>
              <UserManagement />
            </div>
          </div>
        )}

        {/* Left Side: General settings */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-isw-blue" />
            <h3 className="text-lg font-bold text-slate-800">Règles & Calculs Généraux</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Heures contractuelles mensuelles (standard)</label>
              <input
                type="number"
                value={settings.standardHours}
                onChange={(e) => handleChange('standardHours', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
                placeholder="173"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Utilisé pour calculer le taux horaire de base : Salaire de base / Heures contractuelles.</p>
            </div>

            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Heure d'arrivée attendue (standard)</label>
              <input
                type="time"
                value={settings.expectedTime}
                onChange={(e) => handleChange('expectedTime', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Toute arrivée postérieure à cette heure générera un calcul de retard.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-2">Taux Cotisations Sociales (%)</label>
                <input
                  type="number"
                  value={settings.socialContributionRate}
                  onChange={(e) => handleChange('socialContributionRate', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
                  placeholder="12"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-2">Taux Majoration H.Sup (ex: 1.25)</label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.overtimeRate}
                  onChange={(e) => handleChange('overtimeRate', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
                  placeholder="1.25"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: References Lists */}
        <div className="space-y-8">
          {/* Departments */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 justify-between">
              <div className="flex items-center gap-2.5">
                <ListFilter className="w-5 h-5 text-isw-blue" />
                <h3 className="text-lg font-bold text-slate-800">Liste des Départements</h3>
              </div>
              <span className="text-[11px] font-bold text-isw-blue bg-isw-blue-50 px-2.5 py-0.5 rounded-lg">
                {settings.departments.length}
              </span>
            </div>

            {/* List */}
            <div className="flex flex-wrap gap-2.5 max-h-[150px] overflow-y-auto pr-1">
              {settings.departments.map(dept => (
                <div key={dept} className="flex items-center gap-1 bg-isw-blue-50 text-isw-blue px-3 py-1.5 rounded-xl border border-isw-blue-100/50 text-xs font-bold">
                  <span>{dept}</span>
                  <button
                    onClick={() => handleDeleteDept(dept)}
                    className="p-0.5 hover:bg-isw-blue-100 rounded text-isw-blue hover:text-isw-navy transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add */}
            <form onSubmit={handleAddDept} className="flex gap-2">
              <input
                type="text"
                placeholder="Nouveau département..."
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
              />
              <button
                type="submit"
                className="p-2.5 bg-isw-blue hover:bg-isw-blue-light text-white rounded-xl shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Contract Types */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 justify-between">
              <div className="flex items-center gap-2.5">
                <ListFilter className="w-5 h-5 text-isw-blue" />
                <h3 className="text-lg font-bold text-slate-800">Types de Contrats</h3>
              </div>
              <span className="text-[11px] font-bold text-isw-blue bg-isw-blue-50 px-2.5 py-0.5 rounded-lg">
                {settings.contractTypes.length}
              </span>
            </div>

            {/* List */}
            <div className="flex flex-wrap gap-2.5 max-h-[150px] overflow-y-auto pr-1">
              {settings.contractTypes.map(type => (
                <div key={type} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <span>{type}</span>
                  <button
                    onClick={() => handleDeleteContract(type)}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add */}
            <form onSubmit={handleAddContract} className="flex gap-2">
              <input
                type="text"
                placeholder="Nouveau contrat..."
                value={newContractType}
                onChange={(e) => setNewContractType(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
              />
              <button
                type="submit"
                className="p-2.5 bg-isw-blue hover:bg-isw-blue-light text-white rounded-xl shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-rose-50/50 border border-rose-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-rose-200">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <h3 className="text-lg font-bold text-rose-800">Zone de Danger</h3>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Réinitialiser la Base de Données</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Efface toutes les configurations, les fiches employés, les présences, les congés, et recalcule les paies à partir du jeu de données ISW Technosys Ltd reconstitué.
            </p>
          </div>
          <button
            onClick={handleResetDatabase}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-rose-600/25 transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Réinitialiser les données
          </button>
        </div>
      </div>
    </div>
  );
}
