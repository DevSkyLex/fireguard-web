import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import {
  ActiveOrganizationStore,
  MapFacilitiesStore,
  NavigationCountersStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';

/**
 * Provider provideOrganizationFeature
 *
 * @description
 * Provides the organization feature. Binds `ORGANIZATION_CONTEXT_PORT` and
 * `ORGANIZATION_MEMBER_ACCESS_PORT` to their concrete implementations so that
 * layouts and sibling features can inject the ports instead of the concrete stores.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideOrganizationFeature()
 * ```
 */
export function provideOrganizationFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ORGANIZATION_CONTEXT_PORT,
      useExisting: ActiveOrganizationStore,
    },
    {
      provide: ORGANIZATION_MEMBER_ACCESS_PORT,
      useExisting: OrganizationMemberAccessStore,
    },
    // One conversation inventory per shell, shared by the sidebar's channel
    // sections and the messaging workspace page. Provided here — not
    // root — because its hooks inject the two ports bound above.
    ConversationInventoryStore,
    // Sidebar badge counters (Interventions / Compliance). Same reasoning:
    // its hooks follow the organization context port bound above.
    NavigationCountersStore,
    // One map-facilities store per shell, shared by the organization map page
    // (the canvas) and the map facilities shell panel (the sidebar) — they
    // are siblings under the shell now, not parent/child, so this is their
    // only shared source of truth. Same reasoning as the two stores above:
    // its hooks follow the organization ports bound in this same injector.
    MapFacilitiesStore,
  ]);
}
