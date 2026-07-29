/**
 * Realistic XIVAPI v2 (boilmaster) response bodies for use as dummy data in
 * client and (future) resolver tests. Shapes follow https://v2.xivapi.com/docs/welcome/.
 */
import type {
  XivApiRowResponse,
  XivApiSearchResult,
  XivApiSheetResponse,
} from '@src/lib/xivapi/types.js';

/** `GET /search?sheets=Item&query=Name~"Potion"` */
export const xivApiSearchResultFixture: XivApiSearchResult = {
  schema: 'exdschema@7.05',
  version: '7.05',
  next: null,
  results: [
    {
      score: 8.5,
      sheet: 'Item',
      row_id: 4212,
      fields: {
        Name: 'Potion',
        Icon: { id: 20001, path: 'ui/icon/020000/020001.tex' },
        LevelItem: { value: 1 },
      },
    },
    {
      score: 6.2,
      sheet: 'Item',
      row_id: 4213,
      fields: {
        Name: 'Hi-Potion',
        Icon: { id: 20002, path: 'ui/icon/020000/020002.tex' },
        LevelItem: { value: 17 },
      },
    },
  ],
};

/** `GET /sheet/Item/4212` */
export const xivApiRowResponseFixture: XivApiRowResponse = {
  schema: 'exdschema@7.05',
  version: '7.05',
  row_id: 4212,
  fields: {
    Name: 'Potion',
    Description: 'Restores a small amount of HP.',
    LevelItem: { value: 1 },
    Icon: { id: 20001, path: 'ui/icon/020000/020001.tex' },
  },
};

/** `GET /sheet/Item?rows=4212,4213` */
export const xivApiSheetResponseFixture: XivApiSheetResponse = {
  schema: 'exdschema@7.05',
  version: '7.05',
  rows: [
    { row_id: 4212, fields: { Name: 'Potion' } },
    { row_id: 4213, fields: { Name: 'Hi-Potion' } },
  ],
};
