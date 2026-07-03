import { useEffect, useState } from 'react';
import { PencilLine, Plus, Save, Trash2, UserRound, Power, X } from 'lucide-react';
import { authService, buildDefaultPermissions, PERMISSION_TABS } from '../services/authService';

const createBlankForm = () => ({
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
  role: 'user',
  permissions: buildDefaultPermissions(),
});

const clonePermissions = (permissions) => JSON.parse(JSON.stringify(permissions || buildDefaultPermissions()));

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(createBlankForm());
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err?.message || 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetCreateForm = () => setCreateForm(createBlankForm());

  const patchCreatePermission = (tabId, field, checked) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [tabId]: {
          ...prev.permissions[tabId],
          [field]: checked,
          ...(field === 'view' && !checked ? { add: false, edit: false, delete: false } : {}),
        },
      },
    }));
  };

  const patchEditPermission = (tabId, field, checked) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [tabId]: {
          ...prev.permissions[tabId],
          [field]: checked,
          ...(field === 'view' && !checked ? { add: false, edit: false, delete: false } : {}),
        },
      },
    }));
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || '',
      active: user.active !== false,
      permissions: clonePermissions(user.permissions),
      role: user.role || 'user',
      email: user.email,
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (createForm.password !== createForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await authService.createUserAsAdmin({
        email: createForm.email,
        password: createForm.password,
        displayName: createForm.displayName,
        role: createForm.role,
        permissions: createForm.permissions,
      });
      setCreateOpen(false);
      resetCreateForm();
      await loadUsers();
    } catch (err) {
      setError(err?.message || 'Impossible de créer le compte.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser || !editForm) return;

    setError('');
    setSaving(true);
    try {
      if (editForm.displayName !== (editingUser.displayName || '')) {
        await authService.updateUserProfile(editingUser.email, { displayName: editForm.displayName });
      }
      // Apply role change if present
      if (editForm.role !== editingUser.role) {
        await authService.updateUserProfile(editingUser.email, { role: editForm.role });
      }

      if (editingUser.role !== 'superadmin') {
        if (editForm.active !== (editingUser.active !== false)) {
          await authService.setUserActive(editingUser.email, editForm.active);
        }
        // If we promoted to superadmin, permissions were already set to full.
        if (editForm.role !== 'superadmin') {
          await authService.updateUserPermissions(editingUser.email, editForm.permissions);
        }
      }
      closeEdit();
      await loadUsers();
    } catch (err) {
      setError(err?.message || 'Impossible d’enregistrer les modifications.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await authService.setUserActive(user.email, user.active === false);
      await loadUsers();
    } catch (err) {
      setError(err?.message || 'Impossible de modifier le statut.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Supprimer le compte ${user.email} ?`)) {
      try {
        await authService.removeUser(user.email);
        closeEdit();
        await loadUsers();
      } catch (err) {
        setError(err?.message || 'Impossible de supprimer le compte.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-100 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-isw-teal font-bold">Comptes</p>
          <h4 className="text-xl font-extrabold mt-1">Utilisateurs du système</h4>
          <p className="text-sm text-slate-300 mt-1">Lecture seule par défaut. Les droits par onglet peuvent être ajustés compte par compte.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-2xl bg-white text-isw-navy px-4 py-3 text-sm font-bold shadow-lg shadow-black/10"
        >
          <Plus className="w-4 h-4" />
          {createOpen ? 'Fermer' : 'Créer un utilisateur'}
        </button>
      </div>

      {createOpen && (
        <form onSubmit={handleCreate} className="bg-white rounded-3xl border border-white/20 p-6 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input
              type="text"
              value={createForm.displayName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, displayName: e.target.value }))}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
              placeholder="Nom complet"
            />
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
              placeholder="Email"
            />
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
              placeholder="Mot de passe"
            />
            <input
              type="password"
              value={createForm.confirmPassword}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
              placeholder="Confirmation"
            />
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
            >
              <option value="user">Utilisateur</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PERMISSION_TABS.map((tab) => {
              const current = createForm.permissions[tab.id] || { view: true };
              return (
                <div key={tab.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{tab.label}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{tab.id}</p>
                    </div>
                    <label className="isw-checkbox text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={current.view}
                        onChange={(e) => patchCreatePermission(tab.id, 'view', e.target.checked)}
                      />
                      <span className="ml-1">Voir</span>
                    </label>
                  </div>
                  {tab.actions.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {['add', 'edit', 'delete'].map((action) => (
                        <label key={action} className={`isw-checkbox rounded-xl px-3 py-2 text-[11px] font-bold border ${current.view ? 'border-slate-200 text-slate-700' : 'border-slate-100 text-slate-300 bg-slate-100'}`}>
                          <input
                            type="checkbox"
                            disabled={!current.view || !tab.actions.includes(action)}
                            checked={!!current[action]}
                            onChange={(e) => patchCreatePermission(tab.id, action, e.target.checked)}
                          />
                          <span className="ml-2">{action === 'add' ? 'Ajouter' : action === 'edit' ? 'Modifier' : 'Supprimer'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-5 py-3 rounded-2xl bg-isw-blue text-white font-bold flex items-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4" />
              Créer le compte
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left px-5 py-4">Utilisateur</th>
                <th className="text-left px-5 py-4">Rôle</th>
                <th className="text-left px-5 py-4">Statut</th>
                <th className="text-right px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-5 py-8 text-slate-400" colSpan={4}>Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td className="px-5 py-8 text-slate-400" colSpan={4}>Aucun utilisateur enregistré.</td></tr>
              ) : users.map((user) => {
                const isActive = user.active !== false;
                const isSuper = user.role === 'superadmin';
                return (
                  <tr key={user.email} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-isw-blue/10 text-isw-blue flex items-center justify-center font-extrabold">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserRound className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.displayName || user.email}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${isSuper ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {isSuper ? 'Super Admin' : 'Utilisateur'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(user)} className="px-3 py-2 rounded-xl bg-isw-blue/10 text-isw-blue font-bold text-xs inline-flex items-center gap-2">
                          <PencilLine className="w-4 h-4" />
                          Éditer
                        </button>
                        <button type="button" onClick={() => handleToggleActive(user)} disabled={isSuper} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs inline-flex items-center gap-2 disabled:opacity-50">
                          <Power className="w-4 h-4" />
                          {isActive ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && editForm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold">Édition utilisateur</p>
                <h4 className="text-xl font-extrabold text-slate-800 mt-1">{editingUser.displayName || editingUser.email}</h4>
              </div>
              <button onClick={closeEdit} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
                  placeholder="Nom complet"
                />
                <input
                  type="email"
                  value={editForm.email}
                  disabled
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-slate-500 font-semibold"
                />
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-isw-blue"
                >
                  <option value="user">Utilisateur</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">Statut du compte :</span>
                <button
                  type="button"
                  disabled={editingUser.role === 'superadmin'}
                  onClick={() => setEditForm((prev) => ({ ...prev, active: !prev.active }))}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold border ${editForm.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} disabled:opacity-50`}
                >
                  {editForm.active ? 'Actif' : 'Désactivé'}
                </button>
                {editingUser.role === 'superadmin' && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Super Admin verrouillé</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {PERMISSION_TABS.map((tab) => {
                  const current = editForm.permissions[tab.id] || { view: true };
                  const disabled = editingUser.role === 'superadmin';
                  return (
                    <div key={tab.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{tab.label}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{tab.id}</p>
                        </div>
                        <label className="isw-checkbox text-xs font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={current.view}
                            disabled={disabled}
                            onChange={(e) => patchEditPermission(tab.id, 'view', e.target.checked)}
                          />
                          <span className="ml-1">Voir</span>
                        </label>
                      </div>
                      {tab.actions.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {['add', 'edit', 'delete'].map((action) => (
                            <label key={action} className={`isw-checkbox rounded-xl px-3 py-2 text-[11px] font-bold border ${current.view ? 'border-slate-200 text-slate-700' : 'border-slate-100 text-slate-300 bg-slate-100'}`}>
                              <input
                                type="checkbox"
                                disabled={disabled || !current.view || !tab.actions.includes(action)}
                                checked={!!current[action]}
                                onChange={(e) => patchEditPermission(tab.id, action, e.target.checked)}
                              />
                              <span className="ml-2">{action === 'add' ? 'Ajouter' : action === 'edit' ? 'Modifier' : 'Supprimer'}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                <button type="button" onClick={() => handleDeleteUser(editingUser)} disabled={editingUser.role === 'superadmin'} className="px-4 py-3 rounded-2xl border border-rose-200 text-rose-700 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={closeEdit} className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving} className="px-5 py-3 rounded-2xl bg-isw-blue text-white font-bold inline-flex items-center gap-2 disabled:opacity-60">
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
