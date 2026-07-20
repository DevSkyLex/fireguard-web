import type { PlanPricingOutput } from '@features/organization/models';
import { bestYearlySavingPercent } from '../yearly-saving.utils';

const pricing = (monthly: number | null, yearly: number | null): PlanPricingOutput =>
  ({
    planKey: 'pro',
    currency: 'EUR',
    monthlyAmount: monthly,
    yearlyAmount: yearly,
  }) as PlanPricingOutput;

/**
 * This badge states what a customer is charged, so the arithmetic has to be
 * conservative: it may understate a saving, never overstate one, and never
 * appear at all when yearly is not actually cheaper.
 */
describe('bestYearlySavingPercent', () => {
  it('reports the saving against twelve monthly payments', () => {
    // 12 × 1000 = 12000, billed 9600 → 20% saved.
    expect(bestYearlySavingPercent([pricing(1000, 9600)])).toBe(20);
  });

  it('rounds down so the badge never overstates the discount', () => {
    // 12 × 1000 = 12000, billed 9650 → 19.58%, which must not read as 20.
    expect(bestYearlySavingPercent([pricing(1000, 9650)])).toBe(19);
  });

  it('takes the best saving on offer across plans', () => {
    expect(bestYearlySavingPercent([pricing(1000, 11400), pricing(2000, 19200)])).toBe(20);
  });

  it('says nothing when yearly costs the same as monthly', () => {
    expect(bestYearlySavingPercent([pricing(1000, 12000)])).toBeNull();
  });

  it('says nothing when yearly is dearer', () => {
    expect(bestYearlySavingPercent([pricing(1000, 13000)])).toBeNull();
  });

  it('skips plans missing either amount rather than treating them as free', () => {
    expect(bestYearlySavingPercent([pricing(null, 9600), pricing(1000, null)])).toBeNull();
  });

  it('says nothing when there are no plans at all', () => {
    expect(bestYearlySavingPercent([])).toBeNull();
  });

  it('ignores a rounding-down result of zero', () => {
    // 12 × 1000 = 12000, billed 11995 → 0.04%, which is not worth a badge.
    expect(bestYearlySavingPercent([pricing(1000, 11995)])).toBeNull();
  });
});
