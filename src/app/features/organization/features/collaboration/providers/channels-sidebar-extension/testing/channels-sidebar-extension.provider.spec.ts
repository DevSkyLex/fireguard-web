import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { withChannelsSidebarExtension } from '../channels-sidebar-extension.provider';

describe('withChannelsSidebarExtension', () => {
  const permissions = signal<readonly string[]>([]);
  const organizationId = signal<string | null>(null);

  beforeEach(() => {
    permissions.set(['organization.messaging.read']);
    organizationId.set('org-1');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organizationId },
        },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
      ],
    });
  });

  it('owns only the selected organization channel routes, including deep links', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/organizations/org-1/channels/dc-1');
    const contribution = TestBed.runInInjectionContext(() =>
      withChannelsSidebarExtension().useFactory(),
    );
    expect(contribution.active()).toBe(true);
    expect(contribution.mobileVisible()).toBe(false);
    expect(contribution.contentPadding).toBe(false);
    await router.navigateByUrl('/organizations/org-1/channels?search=one');
    expect(contribution.active()).toBe(true);
    expect(contribution.mobileVisible()).toBe(true);
    await router.navigateByUrl('/organizations/org-1/messages');
    expect(contribution.active()).toBe(false);
    await router.navigateByUrl('/organizations/org-1/channels-other');
    expect(contribution.active()).toBe(false);
    await router.navigateByUrl('/organizations/org-1/interventions');
    expect(contribution.active()).toBe(false);
  });

  it('reacts to permission loss and organization switches', async () => {
    const router = TestBed.inject(Router);
    const contribution = TestBed.runInInjectionContext(() =>
      withChannelsSidebarExtension().useFactory(),
    );
    await router.navigateByUrl('/organizations/org-1/channels');
    permissions.set([]);
    expect(contribution.active()).toBe(false);
    permissions.set(['organization.*']);
    expect(contribution.active()).toBe(true);
    organizationId.set('org-2');
    expect(contribution.active()).toBe(false);
    await router.navigateByUrl('/organizations/org-2/channels');
    expect(contribution.active()).toBe(true);
    organizationId.set(null);
    expect(contribution.active()).toBe(false);
  });
});
