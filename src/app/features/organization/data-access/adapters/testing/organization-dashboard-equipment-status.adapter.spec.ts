import { adaptEquipmentStatus } from '../organization-dashboard-equipment-status.adapter';

describe('adaptEquipmentStatus', () => {
  const summary = [
    { key: 'total', value: 40 },
    { key: 'in_stock', value: 5 },
    { key: 'operational', value: 28 },
    { key: 'under_maintenance', value: 4 },
    { key: 'decommissioned', value: 3 },
  ];

  it('extracts the four statuses healthiest first', () => {
    expect(adaptEquipmentStatus(summary)).toEqual([
      { status: 'operational', count: 28 },
      { status: 'under_maintenance', count: 4 },
      { status: 'in_stock', count: 5 },
      { status: 'decommissioned', count: 3 },
    ]);
  });

  // `total` shares the list with the per-status counts. Charting it would draw
  // one slice as large as the whole doughnut.
  it('excludes the total sharing the list', () => {
    const counts = adaptEquipmentStatus(summary).map((bucket) => bucket.count);

    expect(counts).not.toContain(40);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(40);
  });

  it('reports a missing status as zero rather than omitting it', () => {
    const buckets = adaptEquipmentStatus([{ key: 'operational', value: 2 }]);

    expect(buckets).toHaveLength(4);
    expect(buckets).toEqual([
      { status: 'operational', count: 2 },
      { status: 'under_maintenance', count: 0 },
      { status: 'in_stock', count: 0 },
      { status: 'decommissioned', count: 0 },
    ]);
  });

  it.each([[undefined], [null], ['nope'], [{}], [[{ key: 'operational' }]], [[null]]])(
    'returns four zeroed buckets for a malformed payload (%p)',
    (payload: unknown) => {
      expect(adaptEquipmentStatus(payload)).toEqual([
        { status: 'operational', count: 0 },
        { status: 'under_maintenance', count: 0 },
        { status: 'in_stock', count: 0 },
        { status: 'decommissioned', count: 0 },
      ]);
    },
  );
});
