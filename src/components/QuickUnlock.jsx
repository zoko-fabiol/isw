import { useState } from 'react';
import { LockKeyhole, KeyRound, LogOut, ShieldCheck, Fingerprint } from 'lucide-react';
import { quickAccessService } from '../services/quickAccessService';
import { windowsHelloService } from '../services/windowsHelloService';

export default function QuickUnlock({ user, mode = 'unlock', onUnlock, onPinSetup, onLogout }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [helloBusy, setHelloBusy] = useState(false);

  const isSetup = mode === 'setup';
  const preferredMethod = quickAccessService.getPreferredMethod(user?.email);
  const helloAvailable = windowsHelloService.isAvailable();

  const handleWindowsHello = async () => {
    setError('');
    setHelloBusy(true);
    try {
      if (!windowsHelloService.isAvailable()) {
        setError('Windows Hello n’est pas disponible. Utilisez le PIN rapide.');
        return;
      }

      if (isSetup) {
        await windowsHelloService.enroll(user.email, user.displayName || user.email);
        onPinSetup?.();
        return;
      }

      const ok = await windowsHelloService.authenticate(user.email);
      if (!ok) {
        setError('Windows Hello a échoué.');
        return;
      }
      onUnlock?.();
    } catch (err) {
      setError(err?.message || 'Impossible d’utiliser Windows Hello.');
    } finally {
      setHelloBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pin || pin.length < 4) {
      setError('Le PIN doit contenir au moins 4 chiffres.');
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        if (pin !== confirmPin) {
          setError('Les PIN ne correspondent pas.');
          return;
        }
        await quickAccessService.setPin(user.email, pin);
        onPinSetup?.();
      } else {
        const ok = await quickAccessService.verifyPin(user.email, pin);
        if (!ok) {
          setError('PIN incorrect.');
          return;
        }
        onUnlock?.();
      }
      setPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err?.message || 'Impossible de valider le PIN.');
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    {
      id: 'windows-hello',
      label: isSetup ? 'Activer Windows Hello' : 'Déverrouiller avec Windows Hello',
      icon: Fingerprint,
      available: helloAvailable,
      primary: preferredMethod === 'windows-hello',
      action: handleWindowsHello,
      busy: helloBusy,
      disabled: helloBusy || !helloAvailable,
    },
    {
      id: 'pin',
      label: isSetup ? 'Activer le PIN' : 'Déverrouiller',
      icon: ShieldCheck,
      available: true,
      primary: preferredMethod !== 'windows-hello',
      action: handleSubmit,
      busy: loading,
      disabled: loading,
    },
  ]
    .filter((method) => method.available)
    .sort((a, b) => Number(b.primary) - Number(a.primary));

  return (
    <div className="min-h-screen bg-isw-navy-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(46,139,192,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.16),_transparent_34%)]" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="ISW Technosys Logo"
            className="w-20 h-20 object-contain mb-4 drop-shadow-[0_4px_10px_rgba(46,139,192,0.25)]"
          />
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center mb-3">
            {isSetup ? <KeyRound className="w-6 h-6 text-emerald-300" /> : <LockKeyhole className="w-6 h-6 text-isw-teal" />}
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide text-center">
            {isSetup ? 'Créer votre PIN rapide' : 'Déverrouiller la session'}
          </h2>
          <p className="text-slate-400 text-sm mt-1 text-center">
            {isSetup
              ? 'Ce PIN sera demandé à chaque ouverture ou rechargement de l’app.'
              : `Session verrouillée pour ${user?.email || 'cet utilisateur'}`}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-bold text-slate-300">
            Méthode prioritaire : {preferredMethod === 'windows-hello' ? 'Windows Hello' : 'PIN'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              PIN rapide
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\s/g, ''))}
              className="w-full px-4 py-3.5 bg-slate-950/40 border border-isw-navy/20 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-isw-blue transition-colors tracking-[0.35em] text-center text-lg"
              placeholder="••••••"
            />
          </div>

          {isSetup && (
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Confirmation PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\s/g, ''))}
                className="w-full px-4 py-3.5 bg-slate-950/40 border border-isw-navy/20 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-isw-blue transition-colors tracking-[0.35em] text-center text-lg"
                placeholder="••••••"
              />
            </div>
          )}

          {methods.map((method) => {
            const Icon = method.icon;
            const isPrimary = method.primary;
            const isBusy = method.busy;
            const isDisabled = method.disabled;
            const buttonClass = isPrimary
              ? 'w-full py-4 bg-gradient-to-r from-isw-blue to-isw-navy-light hover:from-isw-blue-light hover:to-isw-blue text-white font-bold rounded-2xl shadow-lg shadow-isw-blue/20 transition-all duration-200 flex justify-center items-center gap-2 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed'
              : 'w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl shadow-lg shadow-black/10 transition-all duration-200 flex justify-center items-center gap-2 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed';

            return (
              <button
                key={method.id}
                type={method.id === 'pin' ? 'submit' : 'button'}
                disabled={isDisabled}
                onClick={method.id === 'pin' ? undefined : method.action}
                className={buttonClass}
              >
                {isBusy ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Icon className="w-4 h-4" />
                    {method.label}
                  </>
                )}
              </button>
            );
          })}
        </form>

        <div className="mt-4 flex flex-col gap-3 text-xs text-slate-400">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-700/40 text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Retour à la connexion classique
          </button>
        </div>
      </div>
    </div>
  );
}
