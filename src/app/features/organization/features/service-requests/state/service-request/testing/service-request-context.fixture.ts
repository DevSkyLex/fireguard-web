import { signal, type Provider, type Signal, type WritableSignal } from '@angular/core';
import { vi, type Mock } from 'vitest';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { ServiceRequestCommandRepository } from '@features/organization/features/service-requests/data-access';
import type { ServiceRequestConversionCommand } from '@features/organization/features/service-requests/models';
import {
  ORGANIZATION_PERMISSION,
  type CurrentOrganizationMemberProfileOutput,
} from '@features/organization/models';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports/organization-member-access';

/**
 * Function serviceRequestContext
 *
 * @description
 * Creates isolated actor/session signals and an immutable journal mock for store and page tests.
 *
 * @access public
 * @since unreleased
 *
 * @param {Signal<readonly string[]>} grants - Reactive permission projection for the active actor.
 *
 * @returns {object} Mutable fixture signals, journal records and Angular provider overrides.
 *
 * @function serviceRequestContext
 */
export function serviceRequestContext(
  grants: Signal<readonly string[]> = signal([
    ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ,
    ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE,
    ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE,
    ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
  ]),
): {
  profile: WritableSignal<CurrentOrganizationMemberProfileOutput | null>;
  revision: WritableSignal<number>;
  authenticated: WritableSignal<boolean>;
  grants: Signal<readonly string[]>;
  commands: Map<string, ServiceRequestConversionCommand>;
  journal: {
    browser: boolean;
    sessionRevision: Mock<() => number>;
    isCurrent: Mock<(userId: string, organizationId: string, captured: number) => boolean>;
    readPending: Mock<
      (userId: string, organizationId: string) => Promise<ServiceRequestConversionCommand[]>
    >;
    retain: Mock<(command: ServiceRequestConversionCommand, captured: number) => Promise<void>>;
    acknowledge: Mock<
      (command: ServiceRequestConversionCommand, captured: number) => Promise<void>
    >;
  };
  providers: Provider[];
} {
  const profile = signal<CurrentOrganizationMemberProfileOutput | null>({
    '@id': '/me',
    '@type': 'OrganizationMember',
    id: 'member',
    userId: 'user',
    organizationId: 'org',
    isActive: true,
    joinedAt: '2026-10-08T00:00:00Z',
    roles: [],
    permissions: [],
  });
  const revision = signal(1);
  const authenticated = signal(true);
  const commands = new Map<string, ServiceRequestConversionCommand>();
  const current = (userId: string, organizationId: string, captured: number): boolean =>
    authenticated() &&
    revision() === captured &&
    profile()?.userId === userId &&
    profile()?.organizationId === organizationId &&
    profile()?.isActive === true &&
    grants().includes(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE);
  const journal = {
    browser: true,
    sessionRevision: vi.fn(() => revision()),
    isCurrent: vi.fn(current),
    readPending: vi.fn(async (userId: string, organizationId: string) =>
      current(userId, organizationId, revision())
        ? [...commands.values()]
            .filter(
              (command) => command.userId === userId && command.organizationId === organizationId,
            )
            .map((command) => structuredClone(command))
        : [],
    ),
    retain: vi.fn(async (command: ServiceRequestConversionCommand, captured: number) => {
      if (!current(command.userId, command.organizationId, captured))
        throw new Error('Ownership changed');
      const previous = commands.get(command.input.clientOperationId);
      if (previous && JSON.stringify(previous) !== JSON.stringify(command))
        throw new Error('Different intention');
      commands.set(command.input.clientOperationId, structuredClone(command));
    }),
    acknowledge: vi.fn(async (command: ServiceRequestConversionCommand, captured: number) => {
      if (current(command.userId, command.organizationId, captured))
        commands.delete(command.input.clientOperationId);
    }),
  };
  const providers: Provider[] = [
    {
      provide: AUTH_SESSION_PORT,
      useValue: { sessionRevision: revision, isAuthenticated: authenticated },
    },
    { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { profile, permissions: grants } },
    { provide: ServiceRequestCommandRepository, useValue: journal },
  ];
  return { profile, revision, authenticated, grants, commands, journal, providers };
}
