import { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { checkPermission, isSuperAdminProfile } from '../services/authService';

const PermissionsContext = createContext(null);

/**
 * Provides the authenticated user profile (with role + permissions) to the
 * whole app. `value.profile` is expected to be the full user profile produced
 * by `authService.resolveLogin` and persisted in localStorage under `sirh_user`.
 *
 * Note: the provider does not own the auth state — App.jsx does (it already
 * persists/restores `sirh_user`). This context only exposes permission helpers
 * derived from that profile.
 */
export function PermissionsProvider({ profile, children }) {
  const isSuperAdmin = isSuperAdminProfile(profile);

  useEffect(() => {
    if (profile) {
      localStorage.setItem('sirh_user', JSON.stringify(profile));
    }
  }, [profile]);

  const can = useCallback(
    (tab, action = 'view') => checkPermission(profile, tab, action),
    [profile]
  );

  const canViewTab = useCallback(
    (tab) => {
      if (tab === 'security') return true;
      // Settings tab is reserved to the super admin.
      if (tab === 'settings') return isSuperAdmin;
      return checkPermission(profile, tab, 'view');
    },
    [profile, isSuperAdmin]
  );

  const value = useMemo(
    () => ({ user: profile, profile, isSuperAdmin, can, canViewTab }),
    [profile, isSuperAdmin, can, canViewTab]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return ctx;
}
