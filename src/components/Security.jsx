import { useEffect, useMemo, useState } from 'react';
import { Fingerprint, KeyRound, Lock, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { quickAccessService } from '../services/quickAccessService';
import { windowsHelloService } from '../services/windowsHelloService';
import { usePermissions } from '../context/PermissionsContext';

export default function Security() {
  const { user } = usePermissions();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockTimeoutMinutes, setLockTimeoutMinutes] = useState(0);

  useEffect(() => {
    setLockTimeoutMinutes(quickAccessService.getLockTimeoutMinutes(user?.email));
  }, [user?.email]);

  const preferredMethod = quickAccessService.getPreferredMethod(user?.email);
  const hasPin = quickAccessService.hasPin(user?.email);
  const hasHello = windowsHelloService.hasCredential(user?.email);
  const helloAvailable = windowsHelloService.isAvailable();

  const currentMethodLabel = useMemo(() => {
    if (preferredMethod === 'windows-hello') return 'Windows Hello';
    return 'PIN';
  }, [preferredMethod]);

  const handleSavePin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!pin || pin.length < 4) {
      setError('Le PIN doit contenir au moins 4 chiffres.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Les PIN ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await quickAccessService.setPin(user.email, pin);
      quickAccessService.setPreferredMethod(user.email, 'pin');
      quickAccessService.setLockTimeoutMinutes(user.email, lockTimeoutMinutes);
      setMessage('PIN configuré avec succès.');
      setPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err?.message || 'Impossible d’enregistrer le PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateHello = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (!helloAvailable) {
        setError('Windows Hello n’est pas disponible sur cet appareil.');
        return;
      }
      await windowsHelloService.enroll(user.email, user.displayName || user.email);
      quickAccessService.setPreferredMethod(user.email, 'windows-hello');
      quickAccessService.setLockTimeoutMinutes(user.email, lockTimeoutMinutes);
      setMessage('Windows Hello activé.');
    } catch (err) {
      setError(err?.message || 'Impossible d’activer Windows Hello.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferPin = () => {
    quickAccessService.setPreferredMethod(user.email, 'pin');
    setMessage('Le PIN est maintenant la méthode préférée.');
  };

  const handlePreferHello = () => {
    if (!hasHello) {
      setError('Activez d’abord Windows Hello.');
      return;
    }
    quickAccessService.setPreferredMethod(user.email, 'windows-hello');
    setMessage('Windows Hello est maintenant la méthode préférée.');
  };

  const handleTimeoutChange = (value) => {
    const minutes = Number(value);
    setLockTimeoutMinutes(minutes);
    quickAccessService.setLockTimeoutMinutes(user.email, minutes);
    setMessage(minutes > 0
      ? `Verrouillage automatique après ${minutes} minute${minutes > 1 ? 's' : ''}.`
      : 'Verrouillage automatique désactivé.');
  };

  const handleRemovePin = () => {
    quickAccessService.clearPin(user.email);
    if (preferredMethod === 'pin') quickAccessService.setPreferredMethod(user.email, hasHello ? 'windows-hello' : 'pin');
    setMessage('PIN supprimé.');
  };

  const handleRemoveHello = () => {
    windowsHelloService.clear(user.email);
    if (preferredMethod === 'windows-hello') quickAccessService.setPreferredMethod(user.email, hasPin ? 'pin' : 'pin');
    setMessage('Windows Hello supprimé.');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,139,192,0.10),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-isw-navy-dark via-isw-navy to-isw-blue text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.18),_transparent_24%)]" />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold tracking-[0.22em] uppercase text-white/80">
                  <ShieldCheck className="w-4 h-4 text-isw-teal" />
                  Sécurité utilisateur
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">PIN rapide, Windows Hello et verrouillage auto</h2>
                  <p className="text-white/72 text-sm sm:text-base max-w-2xl leading-6">
                    Chaque utilisateur choisit sa méthode, règle son délai d’inactivité et garde le contrôle de son déverrouillage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:min-w-[420px]">
                <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/55 font-bold">Méthode active</p>
                  <p className="mt-2 text-xl font-extrabold">{currentMethodLabel}</p>
                </div>
                <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/55 font-bold">Timer</p>
                  <p className="mt-2 text-xl font-extrabold">{lockTimeoutMinutes > 0 ? `${lockTimeoutMinutes} min` : 'Off'}</p>
                </div>
                <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/55 font-bold">PIN</p>
                  <p className="mt-2 text-xl font-extrabold">{hasPin ? 'Actif' : 'Vide'}</p>
                </div>
                <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/55 font-bold">Hello</p>
                  <p className="mt-2 text-xl font-extrabold">{hasHello ? 'Actif' : 'Vide'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-medium shadow-sm">{error}</div>}
        {message && <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-medium shadow-sm">{message}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="group bg-white rounded-[2rem] border border-slate-100 shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-6 sm:p-7 space-y-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-isw-blue/10 text-isw-blue flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <h3 className="text-xl font-extrabold text-slate-800">PIN rapide</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {hasPin ? 'Configuré' : 'Aucun PIN'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">Créer, modifier ou supprimer un PIN local chiffré et l’utiliser comme méthode de secours ou principale.</p>
              </div>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Nouveau PIN</label>
                  <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\s/g, ''))} type="password" inputMode="numeric" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-semibold tracking-[0.35em] text-center focus:outline-none focus:border-isw-blue transition-colors" placeholder="••••••" />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-2">Confirmation PIN</label>
                  <input value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\s/g, ''))} type="password" inputMode="numeric" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-semibold tracking-[0.35em] text-center focus:outline-none focus:border-isw-blue transition-colors" placeholder="••••••" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button disabled={loading} type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-isw-blue text-white font-bold shadow-lg shadow-isw-blue/15 transition-transform hover:scale-[1.01] disabled:opacity-60">
                  <Lock className="w-4 h-4" />
                  Enregistrer
                </button>
                <button type="button" onClick={handleRemovePin} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-rose-200 text-rose-700 font-bold bg-rose-50 hover:bg-rose-100/70 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
                <button type="button" onClick={handlePreferPin} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold bg-white hover:bg-slate-50 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                  Préférer PIN
                </button>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-bold">Statut</p>
                    <p className="text-sm text-slate-700 font-semibold mt-1">{hasPin ? 'PIN configuré' : 'Aucun PIN actif'}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    {currentMethodLabel === 'PIN' ? 'PIN prioritaire' : 'Windows Hello prioritaire'}
                  </div>
                </div>
              </div>
            </form>
          </section>

          <section className="group bg-white rounded-[2rem] border border-slate-100 shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-6 sm:p-7 space-y-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-slate-900/5 text-slate-700 flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <h3 className="text-xl font-extrabold text-slate-800">Windows Hello</h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${helloAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {helloAvailable ? 'Disponible' : 'Non supporté'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">Activer l’authentification native de l’appareil et la définir comme méthode de déverrouillage.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-bold">Disponible</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{helloAvailable ? 'Oui' : 'Non'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-bold">Enregistré</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{hasHello ? 'Oui' : 'Non'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-bold">Préférence</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{currentMethodLabel}</p>
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-slate-600 text-xs font-bold">Verrouillage automatique après inactivité</label>
              <select
                value={lockTimeoutMinutes}
                onChange={(e) => handleTimeoutChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-isw-blue"
              >
                <option value={0}>Désactivé</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
              <p className="text-xs text-slate-500 leading-5">
                Le timer s’applique à la méthode de déverrouillage choisie et relance le verrouillage après la dernière activité.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button disabled={loading || !helloAvailable} type="button" onClick={handleActivateHello} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-isw-navy text-white font-bold shadow-lg shadow-isw-navy/15 transition-transform hover:scale-[1.01] disabled:opacity-60">
                <Fingerprint className="w-4 h-4" />
                {hasHello ? 'Réenregistrer' : 'Activer'}
              </button>
              <button type="button" onClick={handlePreferHello} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold bg-white hover:bg-slate-50 transition-colors disabled:opacity-60" disabled={!hasHello}>
                <RotateCcw className="w-4 h-4" />
                Préférer Hello
              </button>
              <button type="button" onClick={handleRemoveHello} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-rose-200 text-rose-700 font-bold bg-rose-50 hover:bg-rose-100/70 transition-colors">
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>

            {!helloAvailable && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-3 leading-5">
                Cet appareil ne supporte pas Windows Hello dans ce contexte. Le PIN reste disponible.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
