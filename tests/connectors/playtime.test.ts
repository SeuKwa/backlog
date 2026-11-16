import { describe, expect, it } from 'vitest';
import { findAppIdByName, parseOwnedGames } from '../../src/lib/connectors/playtime/steam';
import { countEarned } from '../../src/lib/connectors/playtime/retroachievements';
import { extractSteamAppId as rawgSteam } from '../../src/lib/connectors/metadata/rawg';
import { extractSteamAppId as igdbSteam } from '../../src/lib/connectors/metadata/igdb';

describe('steam parseOwnedGames / findAppIdByName', () => {
  const json = {
    response: {
      games: [
        { appid: 620, name: 'Portal 2', playtime_forever: 754 },
        { appid: 400, name: 'Portal', playtime_forever: 0 }
      ]
    }
  };
  it('retrouve le temps de jeu par appid', () => {
    expect(parseOwnedGames(json, 620)).toBe(754);
    expect(parseOwnedGames(json, 999)).toBeNull();
  });
  it('retrouve un appid par nom exact (insensible à la casse)', () => {
    expect(findAppIdByName(json, 'portal 2')).toBe(620);
    expect(findAppIdByName(json, 'Inconnu')).toBeNull();
  });
  it('réponse invalide -> null', () => {
    expect(parseOwnedGames({}, 620)).toBeNull();
  });
});

describe('retroachievements countEarned', () => {
  it('compte les succès gagnés (DateEarned renseigné)', () => {
    const json = {
      Achievements: {
        1: { Title: 'A', DateEarned: '2025-01-01 10:00:00' },
        2: { Title: 'B', DateEarned: null },
        3: { Title: 'C', DateEarned: '2025-02-01 10:00:00' }
      }
    };
    expect(countEarned(json)).toEqual({ earned: 2, total: 3 });
  });
  it('sans Achievements -> null', () => {
    expect(countEarned({})).toBeNull();
  });
});

describe('extraction steamAppId', () => {
  it('depuis RAWG (stores)', () => {
    expect(
      rawgSteam({ stores: [{ store: { slug: 'steam' }, url: 'https://store.steampowered.com/app/620/Portal_2/' }] })
    ).toBe(620);
    expect(rawgSteam({ stores: [{ store: { slug: 'gog' }, url: 'https://gog.com' }] })).toBeUndefined();
  });
  it('depuis IGDB (external_games category 1 = steam)', () => {
    expect(igdbSteam({ external_games: [{ category: 1, uid: '620' }, { category: 10, uid: 'x' }] })).toBe(620);
    expect(igdbSteam({ external_games: [{ category: 10, uid: 'x' }] })).toBeUndefined();
  });
});
