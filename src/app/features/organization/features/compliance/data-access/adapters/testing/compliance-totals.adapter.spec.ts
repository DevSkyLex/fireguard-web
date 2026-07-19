import { adaptComplianceTotals } from '../compliance-totals.adapter';

describe('adaptComplianceTotals', () => {
  it('reads every counter out of the loose totals map', () => {
    const rollup = adaptComplianceTotals({
      totalEquipmentCount: 40,
      trackedEquipmentCount: 32,
      upToDateEquipmentCount: 28,
      dueSoonEquipmentCount: 3,
      overdueEquipmentCount: 1,
      unscheduledEquipmentCount: 8,
      complianceRate: 87.5,
      openCriticalNonConformityCount: 2,
      openHighNonConformityCount: 1,
      openMediumNonConformityCount: 4,
      openLowNonConformityCount: 3,
    });

    expect(rollup.trackedEquipmentCount).toBe(32);
    expect(rollup.overdueEquipmentCount).toBe(1);
    expect(rollup.complianceRate).toBe(87.5);
  });

  // The backend is explicit: a null rate means "nothing tracked", not "0%".
  // Collapsing them would report an unscheduled organization as fully
  // non-compliant.
  it('keeps a null rate null rather than folding it to zero', () => {
    expect(adaptComplianceTotals({ complianceRate: null }).complianceRate).toBeNull();
    expect(adaptComplianceTotals({ complianceRate: 0 }).complianceRate).toBe(0);
  });

  it('defaults missing counters to zero', () => {
    const rollup = adaptComplianceTotals({ totalEquipmentCount: 5 });

    expect(rollup.totalEquipmentCount).toBe(5);
    expect(rollup.overdueEquipmentCount).toBe(0);
    expect(rollup.openCriticalNonConformityCount).toBe(0);
  });

  it('treats an absent totals map as an empty rollup', () => {
    const rollup = adaptComplianceTotals(undefined);

    expect(rollup.trackedEquipmentCount).toBe(0);
    expect(rollup.complianceRate).toBeNull();
  });

  // A non-finite number reaching a percentage label would render "NaN%".
  it('rejects non-finite values', () => {
    const rollup = adaptComplianceTotals({
      complianceRate: Number.NaN,
      overdueEquipmentCount: Number.POSITIVE_INFINITY,
    });

    expect(rollup.complianceRate).toBeNull();
    expect(rollup.overdueEquipmentCount).toBe(0);
  });
});
