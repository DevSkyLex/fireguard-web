import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
} from '@features/organization/ports';
import {
  ActiveOrganizationStore,
  MemberDirectoryStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';

/**
 * Provider provideOrganizationFeature
 *
 * @description
 * Provides the organization feature. Binds `ORGANIZATION_CONTEXT_PORT`,
 * `REGIONAL_FORMATTING_PORT` and `ORGANIZATION_MEMBER_ACCESS_PORT` to their
 * concrete implementations so that layouts and sibling features — and, for
 * `REGIONAL_FORMATTING_PORT`, `shared` UI such as `OrgDatePipe` call sites —
 * can inject the ports instead of the concrete stores.
 *
 * @version 1.1.0
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
      provide: REGIONAL_FORMATTING_PORT,
      useExisting: ActiveOrganizationStore,
    },
    {
      provide: ORGANIZATION_MEMBER_ACCESS_PORT,
      useExisting: OrganizationMemberAccessStore,
    },
    {
      provide: MEMBER_DIRECTORY_PORT,
      useExisting: MemberDirectoryStore,
    },
  ]);
}
