import { linkedSignal, type Signal, type WritableSignal } from '@angular/core';

/**
 * Function initialCollectionFilterBarVisibility
 *
 * @description
 * Builds the state a list page binds `app-collection-filter-toggle`'s
 * `visible` and `app-collection-filter-bar`'s mount to: expanded the moment
 * {@link hasActiveFilters} is first true, so a filtered URL never lands on a
 * page that hides what is narrowing the list, then purely toggle-driven —
 * a later change to {@link hasActiveFilters} (picking or clearing a
 * narrowing while the bar is open) never forces it open or shut again once
 * the operator has picked a state of their own.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Signal<boolean>} hasActiveFilters - Whether the page's current narrowing carries at least one active field.
 *
 * @returns {WritableSignal<boolean>} The bar's visible/collapsed state.
 */
export function initialCollectionFilterBarVisibility(
  hasActiveFilters: Signal<boolean>,
): WritableSignal<boolean> {
  return linkedSignal<boolean, boolean>({
    source: hasActiveFilters,
    computation: (hasActive: boolean, previous): boolean => previous?.value ?? hasActive,
  });
}
