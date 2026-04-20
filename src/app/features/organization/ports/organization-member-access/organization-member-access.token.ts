import { InjectionToken } from '@angular/core';
import type { OrganizationMemberAccessPort } from './organization-member-access.interface';

/**
 * Constant ORGANIZATION_MEMBER_ACCESS_PORT
 * @const ORGANIZATION_MEMBER_ACCESS_PORT
 *
 * @description
 * Injection token for the OrganizationMemberAccessPort.
 * Feature-owned: bound by `features/organization` providers.
 * Consumed by approved sibling features that need the authenticated
 * user's effective permissions in the active organization.
 *
 * @type {InjectionToken<OrganizationMemberAccessPort>}
 */
export const ORGANIZATION_MEMBER_ACCESS_PORT: InjectionToken<OrganizationMemberAccessPort> =
  new InjectionToken<OrganizationMemberAccessPort>('ORGANIZATION_MEMBER_ACCESS_PORT');