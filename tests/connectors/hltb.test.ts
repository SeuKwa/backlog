import { describe, expect, it } from 'vitest';
import { parseHltbResponse } from '../../src/lib/connectors/hltb/hltb';

describe('parseHltbResponse', () => {
  it('extrait histoire principale et complétionniste (comp_plus prioritaire)', () => {
    const json = {
      data: [
        { game_id: 1, game_name: 'Hollow Knight', comp_main: 17.5, comp_plus: 42, comp_all: 58 }
      ]
    };
    expect(parseHltbResponse(json)).toEqual({ mainHours: 17.5, completionistHours: 42 });
  });

  it('repli sur comp_all si comp_plus absent', () => {
    const json = { data: [{ game_id: 2, game_name: 'X', comp_main: 10, comp_all: 20 }] };
    expect(parseHltbResponse(json)).toEqual({ mainHours: 10, completionistHours: 20 });
  });

  it('ignore les durées à 0', () => {
    const json = { data: [{ game_id: 3, comp_main: 0, comp_plus: 0, comp_all: 5 }] };
    expect(parseHltbResponse(json)).toEqual({ mainHours: undefined, completionistHours: 5 });
  });

  it('null si aucune donnée ou tout à zéro', () => {
    expect(parseHltbResponse({ data: [] })).toBeNull();
    expect(parseHltbResponse({ data: [{ comp_main: 0, comp_plus: 0, comp_all: 0 }] })).toBeNull();
    expect(parseHltbResponse({})).toBeNull();
    expect(parseHltbResponse('pas du json')).toBeNull();
  });
});
