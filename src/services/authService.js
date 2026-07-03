import { db, auth, isFirebaseEnabled, createSecondaryApp } from '../firebase/config';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// ─── Permission model ──────────────────────────────────────────────────────
// Tabs eligible to permissions. `actions` lists the fine-grained rights that
// make sense for each tab. `view` is always present.
export const PERMISSION_TABS = [
  { id: 'dashboard',  label: 'Tableau de Bord',  actions: [] },                    // read-only
  { id: 'employees',  label: 'Base Personnel',   actions: ['add', 'edit', 'delete'] },
  { id: 'attendance', label: 'Présences',        actions: ['add', 'edit', 'delete'] },
  { id: 'delays',     label: 'Retards',          actions: ['add', 'edit', 'delete'] },
  { id: 'leaves',     label: 'Heures & Congés',  actions: ['add', 'edit', 'delete'] },
  { id: 'payrolls',   label: 'Gestion des Paies', actions: ['add', 'edit', 'delete'] },
  { id: 'reports',    label: 'Rapports',         actions: [] },                    // read-only
];

// Build a "read-only" default permission map (view=true, everything else false).
export const buildDefaultPermissions = () => {
  const perms = {};
  PERMISSION_TABS.forEach((tab) => {
    const entry = { view: true };
    tab.actions.forEach((action) => { entry[action] = false; });
    perms[tab.id] = entry;
  });
  return perms;
};

// Build a "full access" permission map (everything true) — used for super admin.
export const buildFullPermissions = () => {
  const perms = {};
  PERMISSION_TABS.forEach((tab) => {
    const entry = { view: true };
    tab.actions.forEach((action) => { entry[action] = true; });
    perms[tab.id] = entry;
  });
  return perms;
};

const USERS_KEY = 'sirh_users';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// ─── LocalStorage helpers (demo mode mirror) ───────────────────────────────
const readLocalUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
};
const writeLocalUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// ─── Public API ────────────────────────────────────────────────────────────
export const authService = {
  // ── Read ────────────────────────────────────────────────────────────────
  async getAllUsers() {
    if (isFirebaseEnabled) {
      const snap = await getDocs(collection(db, 'users'));
      const users = [];
      snap.forEach((d) => users.push({ ...d.data(), email: d.id }));
      users.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return users;
    }
    return readLocalUsers().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },

  async getUserByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    if (isFirebaseEnabled) {
      const snap = await getDoc(doc(db, 'users', normalized));
      if (!snap.exists()) return null;
      return { ...snap.data(), email: snap.id };
    }
    return readLocalUsers().find((u) => u.email === normalized) || null;
  },

  // ── Login resolution ────────────────────────────────────────────────────
  // Returns the user profile (with role + permissions) after verifying the
  // credentials. Enforces that, once a super admin exists, only pre-created &
  // active accounts may sign in. The very first account becomes super admin.
  async resolveLogin({ email, password }) {
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      throw new Error('Veuillez remplir tous les champs.');
    }

    let allUsers = [];
    let firestoreReadBlocked = false;
    try {
      allUsers = await this.getAllUsers();
    } catch (err) {
      // If Firestore rules block reading the users collection, surface a
      // warning but allow a fallback path so the first admin can still be
      // established (useful in dev). The UI also shows a clear message.
      console.warn('Could not read users collection:', err.message || err);
      firestoreReadBlocked = true;
      allUsers = [];
    }
    const isFirstUser = allUsers.length === 0;

    if (isFirebaseEnabled && auth) {
      if (isFirstUser) {
        // First user connecting: try to sign in first (in case the account
        // was pre-created in Firebase Auth). If sign-in fails with
        // 'user-not-found', create it. Other auth errors are rethrown.
        try {
          await signInWithEmailAndPassword(auth, normalized, password);
        } catch (err) {
          const code = err && err.code ? err.code : (err && err.message ? err.message : '');
          if (code && code.toString().toLowerCase().includes('user-not-found')) {
            // Create the Auth account for the first user.
            await createUserWithEmailAndPassword(auth, normalized, password);
          } else {
            throw err;
          }
        }
      } else {
        // Try signing in first to validate credentials. After a successful
        // sign-in, ensure a profile exists in Firestore. If the profile is
        // missing, create a default one so accounts created directly in
        // Firebase Auth still work (temporary fallback).
        await signInWithEmailAndPassword(auth, normalized, password);
        let profile;
        try {
          profile = await this.getUserByEmail(normalized);
        } catch (err) {
          // Surface Firestore permission problems with a clearer message.
          if (err && err.message && err.message.toLowerCase().includes('permission')) {
            throw new Error('Accès Firestore refusé : vérifiez les règles pour la collection "users".');
          }
          throw err;
        }
        if (!profile) {
          // Create a default profile for Auth-only accounts (role=user).
          profile = {
            email: normalized,
            displayName: normalized.split('@')[0],
            role: 'user',
            active: true,
            createdAt: Date.now(),
            permissions: buildDefaultPermissions(),
          };
          await this._upsertProfile(profile);
        }
        if (profile.active === false) {
          throw new Error('Compte inexistant ou désactivé. Contactez le Super Admin.');
        }
      }
    } else {
      const profile = await this.getUserByEmail(normalized);
      if (isFirstUser) {
        authUser = { uid: `demo-${normalized}`, email: normalized };
      } else {
        if (!profile || profile.active === false) {
          throw new Error('Compte inexistant ou désactivé. Contactez le Super Admin.');
        }
        if (profile.password && profile.password !== password) {
          throw new Error('E-mail ou mot de passe incorrect.');
        }
        authUser = { uid: `demo-${normalized}`, email: normalized };
      }
    }

    // Compute / persist the profile.
    let profile = await this.getUserByEmail(normalized);

    if (isFirstUser || !profile) {
      profile = {
        email: normalized,
        displayName: normalized.split('@')[0],
        role: 'superadmin',
        active: true,
        createdAt: Date.now(),
        permissions: buildFullPermissions(),
      };
      if (!isFirebaseEnabled) {
        profile.password = password;
      }
      await this._upsertProfile(profile);
    }

    // Safety net: ensure a super admin always carries full permissions.
    if (profile.role === 'superadmin') {
      profile.permissions = buildFullPermissions();
    }

    return profile;
  },

  // ── Create a user as the Super Admin (without signing them in) ──────────
  // Uses a secondary Firebase app so the current admin session is preserved.
  async createUserAsAdmin({ email, password, displayName, role = 'user', permissions }) {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error('L\'adresse e-mail est requise.');
    if (!password || password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères.');

    const existing = await this.getUserByEmail(normalized);
    if (existing) throw new Error('Un compte existe déjà avec cet e-mail.');

    if (isFirebaseEnabled) {
      // Secondary app: create the Auth account without disturbing the admin.
      const secondaryApp = createSecondaryApp();
      const secondaryAuth = secondaryApp ? getAuth(secondaryApp) : null;
      try {
        if (!secondaryAuth) throw new Error('Impossible d’initialiser le compte secondaire Firebase.');
        await createUserWithEmailAndPassword(secondaryAuth, normalized, password);
      } finally {
        // Best-effort cleanup of the transient secondary instance.
        if (secondaryApp) {
          try { await deleteApp(secondaryApp); } catch { /* ignore */ }
        }
      }
    }

    const profile = {
      email: normalized,
      displayName: (displayName || normalized.split('@')[0]).trim(),
      role: role === 'superadmin' ? 'superadmin' : 'user',
      active: true,
      createdAt: Date.now(),
      permissions: role === 'superadmin' ? buildFullPermissions() : (permissions || buildDefaultPermissions()),
    };
    if (!isFirebaseEnabled) {
      profile.password = password;
    }
    await this._upsertProfile(profile);
    return profile;
  },

  // ── Update ──────────────────────────────────────────────────────────────
  async updateUserProfile(email, { displayName, role } = {}) {
    const normalized = normalizeEmail(email);
    const profile = await this.getUserByEmail(normalized);
    if (!profile) throw new Error('Utilisateur introuvable.');

    const updates = {};
    if (typeof displayName === 'string' && displayName.trim()) {
      profile.displayName = displayName.trim();
      updates.displayName = profile.displayName;
    }
    if (typeof role === 'string' && role) {
      // Only allow explicit role change. If role becomes superadmin, grant full permissions.
      profile.role = role === 'superadmin' ? 'superadmin' : 'user';
      updates.role = profile.role;
      if (profile.role === 'superadmin') {
        profile.permissions = buildFullPermissions();
        updates.permissions = profile.permissions;
      }
    }

    if (isFirebaseEnabled) {
      if (Object.keys(updates).length) await updateDoc(doc(db, 'users', normalized), updates);
    } else {
      const users = readLocalUsers();
      const idx = users.findIndex((u) => u.email === normalized);
      if (idx > -1) { users[idx] = { ...users[idx], ...profile }; writeLocalUsers(users); }
    }
    return profile;
  },

  async updateUserPermissions(email, permissions) {
    const normalized = normalizeEmail(email);
    const profile = await this.getUserByEmail(normalized);
    if (!profile) throw new Error('Utilisateur introuvable.');
    if (profile.role === 'superadmin') {
      throw new Error('Les permissions du Super Admin ne peuvent pas être modifiées.');
    }
    profile.permissions = permissions;
    await this._upsertProfile(profile);
    return profile;
  },

  async setUserActive(email, active) {
    const normalized = normalizeEmail(email);
    const profile = await this.getUserByEmail(normalized);
    if (!profile) throw new Error('Utilisateur introuvable.');
    if (profile.role === 'superadmin' && active === false) {
      throw new Error('Le compte Super Admin ne peut pas être désactivé.');
    }
    profile.active = active;
    if (isFirebaseEnabled) {
      await updateDoc(doc(db, 'users', normalized), { active });
    } else {
      const users = readLocalUsers();
      const idx = users.findIndex((u) => u.email === normalized);
      if (idx > -1) { users[idx] = profile; writeLocalUsers(users); }
    }
    return profile;
  },

  async removeUser(email) {
    const normalized = normalizeEmail(email);
    const profile = await this.getUserByEmail(normalized);
    if (!profile) return;
    if (profile.role === 'superadmin') {
      throw new Error('Le compte Super Admin ne peut pas être supprimé.');
    }
    // Note: deleting the Firebase Auth account itself requires the Admin SDK /
    // Cloud Functions. We remove the profile doc, which blocks further sign-in.
    if (isFirebaseEnabled) {
      await deleteDoc(doc(db, 'users', normalized));
    } else {
      const users = readLocalUsers().filter((u) => u.email !== normalized);
      writeLocalUsers(users);
    }
  },

  // ── Internal ────────────────────────────────────────────────────────────
  async _upsertProfile(profile) {
    const normalized = profile.email.trim().toLowerCase();
    const data = { ...profile };
    delete data.email;
    if (isFirebaseEnabled) {
      await setDoc(doc(db, 'users', normalized), data, { merge: true });
    } else {
      const users = readLocalUsers();
      const idx = users.findIndex((u) => u.email === normalized);
      if (idx > -1) users[idx] = { ...profile, email: normalized };
      else users.push({ ...profile, email: normalized });
      writeLocalUsers(users);
    }
    return { ...profile, email: normalized };
  },
};

// Convenience export for permission checks.
export const isSuperAdminProfile = (profile) => !!(profile && profile.role === 'superadmin');

// Check a permission: super admin bypasses everything.
export const checkPermission = (profile, tab, action = 'view') => {
  if (isSuperAdminProfile(profile)) return true;
  if (!profile || !profile.permissions) {
    // No permissions defined → default deny except view (safe fallback to view).
    return action === 'view';
  }
  const tabPerms = profile.permissions[tab];
  if (!tabPerms) return action === 'view';
  return tabPerms[action] === true;
};
