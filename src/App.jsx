import { useState, useEffect, useRef } from 'react';
import { seedFirestoreIfEmpty } from './services/dbService';
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { PERMISSION_TABS } from './services/authService';
import { quickAccessService } from './services/quickAccessService';
import { windowsHelloService } from './services/windowsHelloService';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import QuickUnlock from './components/QuickUnlock';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Attendance from './components/Attendance';
import OvertimeLeaves from './components/OvertimeLeaves';
import Payrolls from './components/Payrolls';
import Reports from './components/Reports';
import Security from './components/Security';
import Settings from './components/Settings';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState('login'); // login | lock | app
  const lastActivityRef = useRef(Date.now());

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check for persisted session (demo mode uses localStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem('sirh_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        const hasQuickAccess = quickAccessService.hasPin(parsedUser.email) || windowsHelloService.hasCredential(parsedUser.email);
        setSessionMode(hasQuickAccess ? 'lock' : 'app');
      } catch {
        localStorage.removeItem('sirh_user');
        setSessionMode('login');
      }
    } else {
      setSessionMode('login');
    }
    setAuthLoading(false);

    // Auto-seed Firestore on mount if it is empty
    seedFirestoreIfEmpty();
  }, []);

  const handleLoginSuccess = async (profile) => {
    setUser(profile);
    localStorage.setItem('sirh_user', JSON.stringify(profile));
    // Seed Firestore with demo data on first login (no-op if already seeded)
    await seedFirestoreIfEmpty();
    // Land the user on the first tab they are allowed to see.
    const firstVisible = firstVisibleTab(profile);
    setActiveTab(firstVisible);

    const hasQuickAccess = quickAccessService.hasPin(profile.email) || windowsHelloService.hasCredential(profile.email);
    setSessionMode(hasQuickAccess ? 'lock' : 'app');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sirh_user');
    setSessionMode('login');
  };

  const handleUnlock = () => {
    setSessionMode('app');
  };

  const handlePinSetupComplete = () => {
    setSessionMode('app');
  };

  useEffect(() => {
    if (!user || sessionMode !== 'app') {
      return undefined;
    }

    lastActivityRef.current = Date.now();

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const timeoutMinutes = quickAccessService.getLockTimeoutMinutes(user.email);
      if (!timeoutMinutes || timeoutMinutes <= 0) return;
      const deadline = lastActivityRef.current + timeoutMinutes * 60 * 1000;
      if (Date.now() >= deadline) {
        setSessionMode('lock');
      }
    }, 1000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      window.clearInterval(interval);
    };
  }, [user, sessionMode]);

  // Pick the first tab the profile may view (dashboard if allowed, else first
  // permitted business tab; settings only for super admin).
  const firstVisibleTab = (profile) => {
    const order = ['dashboard', ...PERMISSION_TABS.map((t) => t.id), 'reports', 'security', 'settings'];
    const isSuper = profile && profile.role === 'superadmin';
    if (isSuper) return 'dashboard';
    for (const tab of order) {
      if (tab === 'settings') continue;
      if (tab === 'security') return tab;
      if (tab === 'reports') {
        const reportPerms = profile && profile.permissions && profile.permissions.reports;
        if (reportPerms && reportPerms.view) return tab;
        continue;
      }
      const perms = profile && profile.permissions && profile.permissions[tab];
      if (perms && perms.view) return tab;
    }
    return 'dashboard';
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-isw-navy-dark">
        <div className="flex flex-col items-center gap-6">
          <img 
            src="/logo.png" 
            alt="ISW Technosys Logo" 
            className="w-24 h-24 object-contain animate-pulse"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-1 border-2 border-isw-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-isw-teal font-semibold text-xs tracking-widest uppercase">Chargement du portail ISW…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <PermissionsProvider profile={null}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </PermissionsProvider>
    );
  }

  if (sessionMode === 'lock') {
    return (
      <PermissionsProvider profile={user}>
        <QuickUnlock
          user={user}
          mode="unlock"
          onUnlock={handleUnlock}
          onPinSetup={handlePinSetupComplete}
          onLogout={handleLogout}
        />
      </PermissionsProvider>
    );
  }

  return (
    <PermissionsProvider profile={user}>
      <Shell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
    </PermissionsProvider>
  );
}

// Inner shell that lives inside the PermissionsProvider so it can use the hook.
function Shell({ activeTab, setActiveTab, user, handleLogout, isSidebarOpen, setIsSidebarOpen }) {
  const { canViewTab } = usePermissions();

  useEffect(() => {
    const firstAllowedTab = () => {
      const order = ['dashboard', 'employees', 'attendance', 'delays', 'leaves', 'payrolls', 'reports', 'security'];
      for (const tab of order) {
        if (canViewTab(tab)) return tab;
      }
      return 'dashboard';
    };

    if (!canViewTab(activeTab)) {
      setActiveTab(firstAllowedTab());
    }
  }, [activeTab, canViewTab, setActiveTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':    return <Dashboard />;
      case 'employees':    return <Employees />;
      case 'attendance':   return <Attendance />;
      case 'leaves':       return <OvertimeLeaves />;
      case 'payrolls':     return <Payrolls />;
      case 'reports':      return <Reports />;
      case 'security':     return <Security />;
      case 'settings':     return <Settings />;
      default:             return <Dashboard />;
    }
  };

  // Access control: if the active tab is not permitted, show a friendly notice.
  const tabAllowed = canViewTab(activeTab);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100 font-sans relative">
        {/* Sidebar - responsive layout wrapper */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false); // Auto close sidebar on select in mobile layout
          }}
          user={user}
          handleLogout={handleLogout}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />

        {/* Mobile Top Header */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="lg:hidden flex items-center justify-between bg-isw-navy text-white px-5 py-4 border-b border-isw-navy-dark/40">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 hover:bg-isw-navy-light rounded-xl transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-extrabold text-lg tracking-wider">ISW SIRH</span>
            </div>
            <span className="text-xs bg-isw-blue/30 border border-isw-blue/30 px-2.5 py-0.5 rounded-full text-isw-teal font-bold">
              Mobile v1.0
            </span>
          </header>

          <main className="flex-1 overflow-y-auto">
            {tabAllowed ? (
              renderContent()
            ) : (
              <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.7-3L13.7 4a2 2 0 00-3.4 0L3.3 16A2 2 0 005 19z" />
                  </svg>
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Accès non autorisé</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-sm">
                  Vous n'avez pas la permission d'afficher cet onglet. Contactez le Super Admin si cela semble être une erreur.
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Mobile Backdrop overlay */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30"
          />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
