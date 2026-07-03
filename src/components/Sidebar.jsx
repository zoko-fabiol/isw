import React from 'react';
import {
  LayoutDashboard, Users, Clock, CalendarDays,
  CreditCard, Settings as SettingsIcon, LogOut, User, AlarmClock, X, FileText, Shield
} from 'lucide-react';
import { usePermissions } from '../context/PermissionsContext';

export default function Sidebar({ activeTab, setActiveTab, user, handleLogout, isOpen, setIsOpen }) {
  const { isSuperAdmin, canViewTab } = usePermissions();

  const allMenuItems = [
    { id: 'dashboard',  label: 'Tableau de Bord',      icon: LayoutDashboard },
    { id: 'employees',  label: 'Base Personnel',         icon: Users },
    { id: 'attendance', label: 'Présences',              icon: Clock },
    { id: 'delays',     label: 'Retards',                icon: AlarmClock },
    { id: 'leaves',     label: 'Heures & Congés',        icon: CalendarDays },
    { id: 'payrolls',   label: 'Gestion des Paies',      icon: CreditCard },
    { id: 'reports',    label: 'Bilans',                 icon: FileText },
    { id: 'security',   label: 'Sécurité',               icon: Shield },
    { id: 'settings',   label: 'Paramètres',             icon: SettingsIcon },
  ];

  // Show only tabs the current user may view. Settings is super-admin only.
  const menuItems = allMenuItems.filter((item) => canViewTab(item.id));

  return (
    <aside className={`w-72 bg-gradient-to-b from-isw-navy-dark via-isw-navy to-isw-navy-light text-slate-100 flex flex-col h-screen fixed lg:sticky top-0 left-0 shadow-2xl z-40 transition-transform duration-300 lg:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-isw-navy-light/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="ISW Logo" 
            className="w-10 h-10 object-contain rounded-xl filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.1)]"
          />
          <div>
            <h1 className="font-extrabold text-lg tracking-wider text-white">ISW SIRH</h1>
            <p className="text-xs text-isw-gold font-semibold tracking-wide">PAIE & CONTRATS v1.0</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User profile */}
      <div className="p-4 mx-4 my-6 bg-isw-blue/10 border border-isw-blue/20 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-isw-blue flex items-center justify-center font-bold text-white shadow">
          {user && user.email ? user.email.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-bold text-white truncate">
            {user && user.displayName ? user.displayName : (user && user.email ? user.email.split('@')[0] : 'Administrateur')}
          </p>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
            isSuperAdmin
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {isSuperAdmin ? 'Super Admin' : 'Utilisateur'}
          </span>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-isw-blue text-white shadow-lg shadow-isw-blue/25 transform translate-x-1'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-isw-blue/15'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-white' : 'text-isw-teal group-hover:text-white'
              }`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-isw-navy-light/40">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5 text-rose-400" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
