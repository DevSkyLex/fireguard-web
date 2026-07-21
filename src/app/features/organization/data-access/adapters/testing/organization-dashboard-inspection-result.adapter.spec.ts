import { adaptInspectionResult } from '../organization-dashboard-inspection-result.adapter';

describe('adaptInspectionResult', () => {
  const summary = [
    { key: 'total', value: 60 },
    { key: 'draft', value: 10 },
    { key: 'submitted', value: 6 },
    { key: 'closed', value: 44 },
    { key: 'pass', value: 30 },
    { key: 'fail', value: 8 },
    { key: 'partial', value: 12 },
  ];

  it('extracts the three outcomes, best first', () => {
    expect(adaptInspectionResult(summary)).toEqual([
      { result: 'pass', count: 30 },
      { result: 'partial', count: 12 },
      { result: 'fail', count: 8 },
    ]);
  });

  // The workflow-state counts share the list with the outcomes and count the
  // same inspections a second way. Charting them would make the ring sum to
  // more than the population it claims to split.
  it('excludes the total and the workflow-state counts sharing the list', () => {
    const counts = adaptInspectionResult(summary).map((bucket) => bucket.count);

    expect(counts).not.toContain(60);
    expect(counts).not.toContain(44);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(50);
  });

  it('reports a missing outcome as zero rather than omitting it', () => {
    const buckets = adaptInspectionResult([{ key: 'pass', value: 2 }]);

    expect(buckets).toEqual([
      { result: 'pass', count: 2 },
      { result: 'partial', count: 0 },
      { result: 'fail', count: 0 },
    ]);
  });

  it.each([[undefined], [null], ['nope'], [{}], [[{ key: 'pass' }]], [[null]]])(
    'returns three zeroed buckets for a malformed payload (%p)',
    (payload: unknown) => {
      expect(adaptInspectionResult(payload)).toEqual([
        { result: 'pass', count: 0 },
        { result: 'partial', count: 0 },
        { result: 'fail', count: 0 },
      ]);
    },
  );
});
