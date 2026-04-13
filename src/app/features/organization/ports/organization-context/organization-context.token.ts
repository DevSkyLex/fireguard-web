import { InjectionToken } from '@angular/core';
import type { OrganizationContextPort } from './organization-context.interface';

/**
 * Constant ORGANIZATION_CONTEXT_PORT
 * @const ORGANIZATION_CONTEXT_PORT
 *
 * @description
 * Injection token for the OrganizationContextPort.
 * Feature-owned: bound by `features/organization` providers.
 * Consumed by layouts and approved sibling feature consumers.
 *
 * @type {InjectionToken<OrganizationContextPort>}
 */
export const ORGANIZATION_CONTEXT_PORT: InjectionToken<OrganizationContextPort> =
  new InjectionToken<OrganizationContextPort>('ORGANIZATION_CONTEXT_PORT');
