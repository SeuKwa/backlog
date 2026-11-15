import { db } from './db';
import { newId } from './id';

const MASTER_ID = 'master-key';
let masterKey: CryptoKey | undefined;

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getMasterKey(): Promise<CryptoKey> {
  if (masterKey) return masterKey;
  const stored = await db.secrets.get(MASTER_ID);
  if (stored) {
    masterKey = await crypto.subtle.importKey('raw', fromB64(stored.data), { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt'
    ]);
    return masterKey;
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt'
  ]);
  const raw = await crypto.subtle.exportKey('raw', key);
  await db.secrets.put({ id: MASTER_ID, iv: '', data: toB64(raw) });
  masterKey = key;
  return key;
}

export async function storeSecret(plain: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const id = newId();
  await db.secrets.put({ id, iv: toB64(iv.buffer), data: toB64(cipher) });
  return id;
}

export async function loadSecret(id: string): Promise<string | null> {
  const rec = await db.secrets.get(id);
  if (!rec) return null;
  const key = await getMasterKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(fromB64(rec.iv)) },
    key,
    fromB64(rec.data)
  );
  return new TextDecoder().decode(plain);
}

export async function deleteSecret(id: string): Promise<void> {
  await db.secrets.delete(id);
}

export async function hasSecret(id: string | undefined): Promise<boolean> {
  if (!id) return false;
  return (await db.secrets.get(id)) !== undefined;
}
