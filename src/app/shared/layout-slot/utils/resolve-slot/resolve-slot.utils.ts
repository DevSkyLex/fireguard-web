import type { ExclusiveSlotContribution, SlotContribution } from '../../models';

/**
 * Function sortSlotContributions
 * @function sortSlotContributions
 *
 * @description
 * Orders the contributions of an additive slot by ascending `order`. The sort
 * is stable, so contributions declared with the same `order` keep their
 * registration order.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly TContribution[]} contributions - Registered contributions.
 *
 * @returns {readonly TContribution[]} A new array, ordered for rendering.
 */
export function sortSlotContributions<TContribution extends SlotContribution>(
  contributions: readonly TContribution[],
): readonly TContribution[] {
  return contributions.toSorted((a: TContribution, b: TContribution): number => a.order - b.order);
}

/**
 * Function resolveExclusiveSlot
 * @function resolveExclusiveSlot
 *
 * @description
 * Picks the winner of a mono-active slot: the highest-priority contribution
 * whose `active` signal is currently true, or `null` when none is.
 *
 * Every `active` signal is read, which is what makes a `computed` wrapping this
 * call re-run when a losing contribution activates — a short-circuit would
 * leave the slot stuck on the incumbent.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly TContribution[]} contributions - Registered contributions.
 *
 * @returns {TContribution | null} The contribution claiming the slot.
 */
export function resolveExclusiveSlot<TContribution extends ExclusiveSlotContribution>(
  contributions: readonly TContribution[],
): TContribution | null {
  let winner: TContribution | null = null;

  for (const contribution of contributions) {
    // Ties go to the earliest registration, which is why this is a strict `>`.
    if (contribution.active() && (winner === null || contribution.priority > winner.priority)) {
      winner = contribution;
    }
  }

  return winner;
}
