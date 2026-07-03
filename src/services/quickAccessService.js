const PIN_PREFIX = 'sirh_quick_pin_';
const PREF_PREFIX = 'sirh_quick_pref_';
const TIMEOUT_PREFIX = 'sirh_quick_timeout_';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const storageKey = (email) => `${PIN_PREFIX}${normalizeEmail(email)}`;
const preferenceKey = (email) => `${PREF_PREFIX}${normalizeEmail(email)}`;
const timeoutKey = (email) => `${TIMEOUT_PREFIX}${normalizeEmail(email)}`;

const bytesToHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const randomHex = (size = 16) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const sha256 = async (value) => {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(hashBuffer));
};

const readRecord = (email) => {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const quickAccessService = {
  hasPin(email) {
    return !!readRecord(email);
  },

  getPreferredMethod(email) {
    try {
      return localStorage.getItem(preferenceKey(email)) || 'pin';
    } catch {
      return 'pin';
    }
  },

  setPreferredMethod(email, method) {
    localStorage.setItem(preferenceKey(email), method === 'windows-hello' ? 'windows-hello' : 'pin');
  },

  getLockTimeoutMinutes(email) {
    try {
      const raw = localStorage.getItem(timeoutKey(email));
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  },

  setLockTimeoutMinutes(email, minutes) {
    const normalized = Number(minutes);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      localStorage.removeItem(timeoutKey(email));
      return 0;
    }
    localStorage.setItem(timeoutKey(email), String(Math.floor(normalized)));
    return Math.floor(normalized);
  },

  async setPin(email, pin) {
    const normalized = normalizeEmail(email);
    const salt = randomHex(16);
    const hash = await sha256(`${salt}:${pin}`);
    const record = { salt, hash, updatedAt: Date.now() };
    localStorage.setItem(storageKey(normalized), JSON.stringify(record));
    return record;
  },

  async verifyPin(email, pin) {
    const normalized = normalizeEmail(email);
    const record = readRecord(normalized);
    if (!record || !record.salt || !record.hash) return false;
    const hash = await sha256(`${record.salt}:${pin}`);
    return hash === record.hash;
  },

  clearPin(email) {
    localStorage.removeItem(storageKey(email));
  },

  clearPreference(email) {
    localStorage.removeItem(preferenceKey(email));
  },

  clearLockTimeout(email) {
    localStorage.removeItem(timeoutKey(email));
  },
};
