import { formatChangePatch } from '../utils';

describe('formatChangePatch', () => {
  it('should return an empty list for null/undefined patches', () => {
    expect(formatChangePatch(null)).toEqual([]);
    expect(formatChangePatch(undefined)).toEqual([]);
    expect(formatChangePatch({})).toEqual([]);
  });

  it('should humanize snake_case and camelCase field keys', () => {
    const entries = formatChangePatch({ planned_start_at: '2026-06-20', dueAt: '2026-06-21' });

    expect(entries).toEqual([
      { field: 'Planned start at', value: '2026-06-20' },
      { field: 'Due at', value: '2026-06-21' },
    ]);
  });

  it('should render null, undefined and empty-string values as an em dash', () => {
    const entries = formatChangePatch({ site: null, responsible: '', note: undefined });

    expect(entries.map((entry) => entry.value)).toEqual(['—', '—', '—']);
  });

  it('should stringify primitive values', () => {
    const entries = formatChangePatch({ count: 3, required: true, name: 'Extinguisher' });

    expect(entries).toEqual([
      { field: 'Count', value: '3' },
      { field: 'Required', value: 'true' },
      { field: 'Name', value: 'Extinguisher' },
    ]);
  });

  it('should compact object and array values as JSON', () => {
    const entries = formatChangePatch({ target: { id: 'eq-1' }, tags: ['a', 'b'] });

    expect(entries).toEqual([
      { field: 'Target', value: '{"id":"eq-1"}' },
      { field: 'Tags', value: '["a","b"]' },
    ]);
  });
});
