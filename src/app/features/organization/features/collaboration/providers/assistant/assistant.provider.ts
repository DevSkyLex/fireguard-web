import type { Provider } from '@angular/core';
import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { AssistantStore } from '../../state';
import { AssistantToggle } from '../../ui/components/assistant-toggle';

/**
 * Function provideCollaborationAssistant
 * @function provideCollaborationAssistant
 *
 * @description
 * Provides the assistant's store at the shell route.
 *
 * Route-scoped rather than root so the store never exists in the auth or error
 * shells, which have no organization and no use for it. The header
 * contribution resolves from this same environment injector, which is what
 * makes the trigger and the panel's own close button agree on one answer.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {Provider[]} The providers to add to the shell route.
 *
 * @example
 * ```typescript
 * { path: '', component: DashboardLayout, providers: [provideCollaborationAssistant()] }
 * ```
 */
export function provideCollaborationAssistant(): Provider[] {
  return [AssistantStore];
}

/**
 * Function withAssistantToggle
 * @function withAssistantToggle
 *
 * @description
 * Contributes {@link AssistantToggle} to a shell's header-actions slot, ahead
 * of the app-wide controls that close the cluster.
 *
 * Requires {@link provideCollaborationAssistant} in the same route's providers.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ headerActions: [withAssistantToggle()] })
 * ```
 */
export function withAssistantToggle(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'collaboration-assistant-toggle',
      order: 10,
      component: AssistantToggle,
    }),
  };
}
