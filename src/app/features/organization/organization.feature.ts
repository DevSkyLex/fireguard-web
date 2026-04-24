import { makeEnvironmentProviders, type EnvironmentProviders, type Provider } from '@angular/core';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';

/**
 * Interface OrganizationFeature
 *
 * @description
 * Represents an optional feature that can be composed into `provideOrganizationFeature()`.
 * Follows the Angular `RouterFeature` / `HttpClientFeature` pattern where `with*`
 * functions return a feature object that is spread into the provider list.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationFeature {
  providers: Provider[];
}

/**
 * Provider provideOrganizationFeature
 *
 * @description
 * Provides the organization feature. Binds `ORGANIZATION_CONTEXT_PORT` and
 * `ORGANIZATION_MEMBER_ACCESS_PORT` to their concrete implementations so that
 * layouts and sibling features can inject the ports instead of the concrete stores.
 *
 * Accepts optional `OrganizationFeature` objects (e.g. `withOrganizationNavigation()`)
 * to compose additional providers into the environment.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideOrganizationFeature(
 *   withOrganizationNavigation(),
 *   withOrganizationContextPanel(),
 * )
 * ```
 */
export function provideOrganizationFeature(...features: OrganizationFeature[]): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ORGANIZATION_CONTEXT_PORT,
      useExisting: ActiveOrganizationStore,
    },
    {
      provide: ORGANIZATION_MEMBER_ACCESS_PORT,
      useExisting: OrganizationMemberAccessStore,
    },
    ...features.flatMap((f) => f.providers),
  ]);
}
