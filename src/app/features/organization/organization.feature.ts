import {
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import {
  MEMBER_DIRECTORY_PORT,
  MY_ORGANIZATIONS_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
} from '@features/organization/ports';
import { OrganizationGlobalSearchService } from '@features/organization/services/organization-global-search';
import {
  ActiveOrganizationStore,
  MemberDirectoryStore,
  MyOrganizationsStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';

/**
 * Provider provideOrganizationFeature
 *
 * @description
 * Provides the organization feature. Binds `ORGANIZATION_CONTEXT_PORT`,
 * `REGIONAL_FORMATTING_PORT`, `ORGANIZATION_MEMBER_ACCESS_PORT`,
 * `MEMBER_DIRECTORY_PORT` and `MY_ORGANIZATIONS_PORT` to their concrete
 * implementations so that layouts and sibling features — and, for
 * `REGIONAL_FORMATTING_PORT`, `shared` UI such as `OrgDatePipe` call sites,
 * and for `MY_ORGANIZATIONS_PORT`, `features/account` — can inject the ports
 * instead of the concrete stores.
 * Initializes the organization-owned search shortcut independently of portaled
 * triggers; browser listener registration is deferred until after hydration.
 *
 * @version 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @access public
 * @since 1.0.0
 * @returns {EnvironmentProviders} Existing store bindings and the SSR-safe search shortcut initializer.
 *
 * @example
 * ```typescript
 * provideOrganizationFeature()
 * ```
 */
export function provideOrganizationFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      inject(OrganizationGlobalSearchService);
    }),
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
    {
      provide: MY_ORGANIZATIONS_PORT,
      useExisting: MyOrganizationsStore,
    },
  ]);
}
