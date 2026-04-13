import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Provider provideOrganization
 *
 * @description
 * Provides the organization feature ports. Binds `ORGANIZATION_CONTEXT_PORT`
 * to `ActiveOrganizationStore` so that layouts and approved sibling features
 * can read the active organization context through a stable port instead
 * of importing the concrete store directly.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideOrganization(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ORGANIZATION_CONTEXT_PORT,
      useExisting: ActiveOrganizationStore,
    },
  ]);
}
