import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, UserPlus } from 'lucide-react';
import { isFirebaseEnabled } from '../firebase/config';
import { authService } from '../services/authService';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@isw.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);

    try {
      const profile = await authService.resolveLogin({ email, password });
      onLoginSuccess(profile);
    } catch (err) {
      let message = err && err.message ? err.message : 'Erreur de connexion.';
      const code = err && err.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        message = 'E-mail ou mot de passe incorrect.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      } else if (code === 'auth/email-already-in-use') {
        message = 'Cet e-mail est déjà utilisé. Contactez le Super Admin.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-isw-navy-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-isw-blue/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-isw-teal/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'0.7s'}}></div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-isw-navy/30 rounded-3xl shadow-2xl p-8 z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.png" 
            alt="ISW Technosys Logo" 
            className="w-24 h-24 object-contain mb-4 filter drop-shadow-[0_4px_10px_rgba(46,139,192,0.25)]"
          />
          <h2 className="text-2xl font-extrabold text-white tracking-wide">Connexion ISW SIRH</h2>
          <p className="text-slate-400 text-sm mt-1 text-center">
            {isFirebaseEnabled
              ? 'Portail Firebase connecté — Projet : isw-f05b3'
              : 'Mode Démonstration — Données LocalStorage'}
          </p>
        </div>

        {/* Firebase status indicator */}
        <div className={`mb-4 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold border ${
          isFirebaseEnabled
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isFirebaseEnabled ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          {isFirebaseEnabled ? 'Firebase Firestore & Auth actifs' : 'Mode LocalStorage (Démo)'}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Adresse E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Mail className="w-5 h-5 text-isw-teal" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/40 border border-isw-navy/20 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-isw-blue transition-colors"
                placeholder="admin@isw.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Lock className="w-5 h-5 text-isw-teal" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 bg-slate-950/40 border border-isw-navy/20 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-isw-blue transition-colors"
                placeholder="Minimum 6 caractères"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-isw-blue to-isw-navy-light hover:from-isw-blue-light hover:to-isw-blue text-white font-bold rounded-2xl shadow-lg shadow-isw-blue/20 transition-all duration-200 flex justify-center items-center gap-2 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Se connecter
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-300">ℹ️ Premier lancement :</p>
          <p>Le <strong className="text-isw-gold">tout premier compte</strong> créé devient le <strong className="text-isw-gold">Super Admin</strong> (accès complet). Ensuite, seuls les comptes pré-créés et actifs par le Super Admin peuvent se connecter.</p>
        </div>
      </div>
    </div>
  );
}
