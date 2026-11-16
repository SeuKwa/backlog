import { describe, expect, it } from 'vitest';
import { decryptPayload, encryptPayload } from '../../src/lib/storage/syncCrypto';

describe('syncCrypto (PBKDF2 + AES-256-GCM)', () => {
  it('round-trip : chiffrer puis déchiffrer rend le texte exact', async () => {
    const plain = JSON.stringify({ format: 'gamevault-backlog', version: 1, games: [{ title: 'Hollow Knight' }] });
    const payload = await encryptPayload(plain, 'ma phrase secrète !');
    expect(payload).not.toContain('Hollow Knight');
    const back = await decryptPayload(payload, 'ma phrase secrète !');
    expect(back).toBe(plain);
  });

  it('deux chiffrements du même texte diffèrent (sel/IV aléatoires)', async () => {
    const a = await encryptPayload('abc', 'passphrase-123');
    const b = await encryptPayload('abc', 'passphrase-123');
    expect(a).not.toBe(b);
  });

  it('mauvaise phrase de passe -> erreur', async () => {
    const payload = await encryptPayload('secret', 'bonne phrase 123');
    await expect(decryptPayload(payload, 'mauvaise phrase')).rejects.toThrow(/incorrecte|corrompu/);
  });

  it('package corrompu -> erreur', async () => {
    const payload = await encryptPayload('secret', 'bonne phrase 123');
    const obj = JSON.parse(payload);
    obj.data = obj.data.slice(0, -4) + 'AAAA';
    await expect(decryptPayload(JSON.stringify(obj), 'bonne phrase 123')).rejects.toThrow();
  });

  it('payload non JSON -> erreur', async () => {
    await expect(decryptPayload('pas du json', 'x')).rejects.toThrow(/invalide/);
  });
});
