import { exportAll, importAll } from '$lib/storage/backup';
import { decryptPayload, encryptPayload } from '$lib/storage/syncCrypto';

export async function exportEncryptedPackage(passphrase: string): Promise<string> {
  if (passphrase.length < 8) throw new Error('Phrase de passe : 8 caractères minimum.');
  const exp = await exportAll();
  return encryptPayload(JSON.stringify(exp), passphrase);
}

export async function importEncryptedPackage(
  text: string,
  passphrase: string
): Promise<{ games: number }> {
  const plain = await decryptPayload(text.trim(), passphrase);
  const data = JSON.parse(plain) as unknown;
  return importAll(data, 'replace');
}
