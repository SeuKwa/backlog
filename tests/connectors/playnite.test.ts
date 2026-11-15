import { describe, expect, it } from 'vitest';
import { parsePlayniteCsv, parsePlayniteJson } from '../../src/lib/connectors/playtime/playnite';

describe('parsePlayniteJson', () => {
  it('mappe un export JSON Playnite (Playtime en secondes)', () => {
    const json = JSON.stringify({
      games: [
        {
          Name: 'Hollow Knight',
          Platforms: [{ Name: 'PC' }, { Name: 'Switch' }],
          Genres: [{ Name: 'Metroidvania' }],
          ReleaseDate: '2017-02-24T00:00:00',
          Playtime: 754 * 60,
          Id: 'abc-123'
        },
        { Name: 'Celeste', Platforms: [], Genres: [], Playtime: 0 }
      ]
    });
    const games = parsePlayniteJson(json);
    expect(games).toHaveLength(2);
    expect(games[0]).toEqual({
      name: 'Hollow Knight',
      platforms: ['PC', 'Switch'],
      genres: ['Metroidvania'],
      releaseDate: '2017-02-24',
      playtimeMinutes: 754,
      playniteId: 'abc-123'
    });
    expect(games[1].playniteId).toBeUndefined();
  });

  it('accepte aussi un tableau racine', () => {
    const games = parsePlayniteJson(JSON.stringify([{ Name: 'Doom', Playtime: 3600 }]));
    expect(games[0].playtimeMinutes).toBe(60);
  });

  it('rejette un JSON sans games', () => {
    expect(() => parsePlayniteJson('{"foo": 1}')).toThrow(/games/);
  });
});

describe('parsePlayniteCsv', () => {
  it('parse un CSV point-virgule avec champs entre guillemets', () => {
    const csv = [
      'Name;Platforms;Genres;ReleaseDate;Playtime;Id',
      '"Hollow Knight";"PC; Switch";"Metroidvania; Action";2017-02-24;45240;abc-123',
      'Celeste;PC;;2018-01-25;0;'
    ].join('\n');
    const games = parsePlayniteCsv(csv);
    expect(games).toHaveLength(2);
    expect(games[0].platforms).toEqual(['PC', 'Switch']);
    expect(games[0].genres).toEqual(['Metroidvania', 'Action']);
    expect(games[0].playtimeMinutes).toBe(754);
    expect(games[0].playniteId).toBe('abc-123');
    expect(games[1].releaseDate).toBe('2018-01-25');
  });

  it('parse un CSV virgule', () => {
    const csv = ['Name,Platforms,Playtime', 'Doom,PC,7200'].join('\n');
    const games = parsePlayniteCsv(csv);
    expect(games[0]).toMatchObject({ name: 'Doom', platforms: ['PC'], playtimeMinutes: 120 });
  });

  it('gère les guillemets échappés', () => {
    const csv = ['Name,Genres', '"Jeu ""cité""",Aventure'].join('\n');
    expect(parsePlayniteCsv(csv)[0].name).toBe('Jeu "cité"');
  });
});
