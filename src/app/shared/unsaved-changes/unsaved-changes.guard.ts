import type { CanDeactivateFn, GuardResult, MaybeAsync } from '@angular/router';
import type { UnsavedChangesAware } from './models/unsaved-changes-aware.interface';

/**
 * Function unsavedChangesGuard
 * @function unsavedChangesGuard
 *
 * @description
 * A functional `CanDeactivate` guard for any component implementing
 * {@link UnsavedChangesAware} — create pages and the multi-step wizard. It
 * resolves `true` immediately when the component reports nothing unsaved,
 * and otherwise defers entirely to the component's own
 * {@link UnsavedChangesAware.confirmDeactivation}, since this app hosts
 * overlays declaratively and the guard cannot open one itself.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {UnsavedChangesAware} component - The deactivating route component.
 * @returns {MaybeAsync<GuardResult>} `true` when nothing would be lost,
 * otherwise the component's own confirmation result.
 */
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChangesAware> = (
  component: UnsavedChangesAware,
): MaybeAsync<GuardResult> => {
  if (!component.hasUnsavedChanges()) return true;

  return component.confirmDeactivation();
};
