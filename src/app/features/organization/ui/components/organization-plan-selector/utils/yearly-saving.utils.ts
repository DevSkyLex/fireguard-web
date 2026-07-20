import type { PlanPricingOutput } from '@features/organization/models';

/**
 * Best whole-percent saving from paying yearly across the given plans, or null
 * when no plan offers one.
 *
 * Kept out of the component so it can be tested without standing up six store
 * mocks. The reason is not reuse — it has one caller — but that the rule is a
 * numeric claim about what a customer is charged, and a heavy mock around it
 * would test the mock more than the arithmetic.
 *
 * Rounded **down**, so the badge can never overstate the saving. A plan whose
 * yearly price is not actually cheaper than twelve monthly payments is skipped
 * rather than shown as a 0% or negative "saving".
 *
 * @param pricings - Pricing rows, as returned by the billing store.
 * @returns Whole percent saved, or null when nothing is cheaper yearly.
 */
export function bestYearlySavingPercent(pricings: readonly PlanPricingOutput[]): number | null {
  let best: number = 0;

  for (const pricing of pricings) {
    const monthly: number | null | undefined = pricing.monthlyAmount;
    const yearly: number | null | undefined = pricing.yearlyAmount;

    if (!monthly || !yearly) continue;

    const fullYear: number = monthly * 12;
    if (yearly >= fullYear) continue;

    best = Math.max(best, Math.floor(((fullYear - yearly) / fullYear) * 100));
  }

  return best > 0 ? best : null;
}
