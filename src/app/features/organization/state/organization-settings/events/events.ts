import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Constant organizationSettingsStoreEvents
 * @const organizationSettingsStoreEvents
 *
 * @description
 * Events dispatched by the {@link OrganizationSettingsStore} when the active
 * organization is mutated (settings saved or logo uploaded). Sibling stores —
 * notably the list-driven {@link OrganizationStore} — listen to refresh their
 * cached copy so every surface reflects the change instead of serving a stale
 * cached logo.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationSettingsStoreEvents = eventGroup({
  source: 'Organization Settings Store',
  events: {
    organizationUpdated: type<OrganizationOutput>(),
  },
});
