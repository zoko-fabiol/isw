const WINDOWS_HELLO_KEY = 'sirh_windows_hello_';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const storageKey = (email) => `${WINDOWS_HELLO_KEY}${normalizeEmail(email)}`;

const randomBytes = (size = 32) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

const toBase64Url = (bytes) => {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const readRecord = (email) => {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isWebAuthnAvailable = () => typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;

export const windowsHelloService = {
  isAvailable() {
    return isWebAuthnAvailable();
  },

  hasCredential(email) {
    return !!readRecord(email);
  },

  async enroll(email, displayName = '') {
    if (!isWebAuthnAvailable()) {
      throw new Error('Windows Hello / WebAuthn n’est pas disponible sur cet appareil.');
    }

    const challenge = randomBytes(32);
    const userId = randomBytes(16);
    const normalized = normalizeEmail(email);
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'ISW Technosys' },
        user: {
          id: userId,
          name: normalized,
          displayName: displayName || normalized,
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential) {
      throw new Error('Création Windows Hello annulée.');
    }

    const record = {
      credentialId: toBase64Url(new Uint8Array(credential.rawId)),
      createdAt: Date.now(),
      displayName: displayName || normalized,
    };
    localStorage.setItem(storageKey(normalized), JSON.stringify(record));
    return record;
  },

  async authenticate(email) {
    const normalized = normalizeEmail(email);
    const record = readRecord(normalized);
    if (!record || !record.credentialId) return false;
    if (!isWebAuthnAvailable()) {
      throw new Error('Windows Hello / WebAuthn n’est pas disponible sur cet appareil.');
    }

    const challenge = randomBytes(32);
    const credentialId = fromBase64Url(record.credentialId);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credentialId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return !!assertion;
  },

  clear(email) {
    localStorage.removeItem(storageKey(email));
  },
};
