import {
  buildListSortCookieOptions,
  decodeListSortCookie,
  resolvePersistedListSort,
} from '../list-sort-preferences.utils';

type TestField = 'name' | 'createdAt';

function isTestField(field: string): field is TestField {
  return field === 'name' || field === 'createdAt';
}

describe('decodeListSortCookie', () => {
  it('should answer an empty record when the raw value is null', () => {
    expect(decodeListSortCookie(null)).toEqual({});
  });

  it('should answer an empty record when the raw value is an empty string', () => {
    expect(decodeListSortCookie('')).toEqual({});
  });

  it('should answer an empty record when the raw value is corrupted JSON', () => {
    expect(decodeListSortCookie('{not-json')).toEqual({});
  });

  it('should answer an empty record when the JSON is not an object', () => {
    expect(decodeListSortCookie('"a string"')).toEqual({});
  });

  it('should answer an empty record when the JSON is null', () => {
    expect(decodeListSortCookie('null')).toEqual({});
  });

  it('should decode a valid JSON object', () => {
    expect(
      decodeListSortCookie(JSON.stringify({ sortField: 'name', sortDirection: 'desc' })),
    ).toEqual({ sortField: 'name', sortDirection: 'desc' });
  });
});

describe('resolvePersistedListSort', () => {
  const defaultSort = { field: 'name' as TestField, direction: 'asc' as const };

  it('should fall back to the default sort when the stored field is undefined', () => {
    expect(resolvePersistedListSort(undefined, 'desc', isTestField, defaultSort)).toEqual(
      defaultSort,
    );
  });

  it('should fall back to the default sort when the stored field is not a string', () => {
    expect(resolvePersistedListSort(42, 'desc', isTestField, defaultSort)).toEqual(defaultSort);
  });

  it('should fall back to the default sort when the stored field is not supported', () => {
    expect(resolvePersistedListSort('retiredField', 'desc', isTestField, defaultSort)).toEqual(
      defaultSort,
    );
  });

  it('should restore a valid stored field with its opposite direction', () => {
    expect(resolvePersistedListSort('createdAt', 'desc', isTestField, defaultSort)).toEqual({
      field: 'createdAt',
      direction: 'desc',
    });
  });

  it('should fall back to the default direction when the stored direction is not the opposite', () => {
    expect(resolvePersistedListSort('createdAt', 'sideways', isTestField, defaultSort)).toEqual({
      field: 'createdAt',
      direction: 'asc',
    });
  });

  it('should fall back to the default direction when the stored direction is undefined', () => {
    expect(resolvePersistedListSort('createdAt', undefined, isTestField, defaultSort)).toEqual({
      field: 'createdAt',
      direction: 'asc',
    });
  });

  it('should honor a default direction of desc', () => {
    const descDefault = { field: 'name' as TestField, direction: 'desc' as const };

    expect(resolvePersistedListSort('name', 'asc', isTestField, descDefault)).toEqual({
      field: 'name',
      direction: 'asc',
    });
    expect(resolvePersistedListSort('name', 'sideways', isTestField, descDefault)).toEqual({
      field: 'name',
      direction: 'desc',
    });
  });
});

describe('buildListSortCookieOptions', () => {
  it('should build a path-rooted, Lax, one-year cookie', () => {
    expect(buildListSortCookieOptions('fg-facility-list', 'the-value')).toEqual({
      name: 'fg-facility-list',
      value: 'the-value',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'Lax',
    });
  });
});
