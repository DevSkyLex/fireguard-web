import { adaptNonConformitySeverity } from '../organization-dashboard-severity.adapter';

describe('adaptNonConformitySeverity', () => {
  // The API flattens the whole `nonConformities` widget into one list, so the
  // severity buckets sit next to the status counts and must be picked by key.
  const summary = [
    { key: 'total', value: 42 },
    { key: 'open', value: 12 },
    { key: 'severityLow', value: 3 },
    { key: 'severityMedium', value: 4 },
    { key: 'severityHigh', value: 2 },
    { key: 'severityCritical', value: 3 },
  ];

  it('extracts the four buckets worst first', () => {
    expect(adaptNonConformitySeverity(summary)).toEqual([
      { severity: 'critical', count: 3 },
      { severity: 'high', count: 2 },
      { severity: 'medium', count: 4 },
      { severity: 'low', count: 3 },
    ]);
  });

  it('ignores the status counts sharing the list', () => {
    const counts = adaptNonConformitySeverity(summary).map((bucket) => bucket.count);

    expect(counts).not.toContain(42);
    expect(counts).not.toContain(12);
  });

  // A severity with no open non-conformity is information. Dropping the row
  // would misreport the shape of the backlog.
  it('reports a missing bucket as zero rather than omitting it', () => {
    const buckets = adaptNonConformitySeverity([{ key: 'severityCritical', value: 1 }]);

    expect(buckets).toHaveLength(4);
    expect(buckets).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 0 },
      { severity: 'medium', count: 0 },
      { severity: 'low', count: 0 },
    ]);
  });

  it.each([[undefined], [null], ['nope'], [{}], [[{ key: 'severityHigh' }]], [[null]]])(
    'returns four zeroed buckets for a malformed payload (%p)',
    (payload: unknown) => {
      expect(adaptNonConformitySeverity(payload)).toEqual([
        { severity: 'critical', count: 0 },
        { severity: 'high', count: 0 },
        { severity: 'medium', count: 0 },
        { severity: 'low', count: 0 },
      ]);
    },
  );
});
