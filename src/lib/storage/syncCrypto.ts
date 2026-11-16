const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey'
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(plain: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt.buffer as ArrayBuffer);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plain));
  return JSON.stringify({
    v: 1,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256-210000',
    salt: toB64(salt.buffer as ArrayBuffer),
    iv: toB64(iv.buffer as ArrayBuffer),
    data: toB64(cipher)
  });
}

export async function decryptPayload(payload: string, passphrase: string): Promise<string> {
  let obj: { v?: number; salt?: string; iv?: string; data?: string };
  try {
    obj = JSON.parse(payload);
  } catch {
    throw new Error('Package chiffré invalide (JSON illisible).');
  }
  if (obj?.v !== 1 || !obj.salt || !obj.iv || !obj.data) {
    throw new Error('Package chiffré invalide (format inconnu).');
  }
  const key = await deriveKey(passphrase, fromB64(obj.salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(fromB64(obj.iv)) },
      key,
      fromB64(obj.data)
    );
    return decoder.decode(plain);
  } catch {
    throw new Error('Phrase de passe incorrecte ou package corrompu.');
  }
}
