import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { CollaborationNav } from '../collaboration-nav.component';

describe('CollaborationNav', () => {
  const permissions = signal<readonly string[]>([]);
  const organizationId = signal<string | null>(null);

  beforeEach(() => {
    permissions.set(['organization.messaging.read']);
    organizationId.set('org-1');
    TestBed.configureTestingModule({
      imports: [CollaborationNav],
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

  it('keeps Messages and Collaboration available outside their workspaces', async () => {
    const fixture = TestBed.createComponent(CollaborationNav);
    await TestBed.inject(Router).navigateByUrl('/organizations/org-1/interventions');
    await fixture.whenStable();
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[1].textContent).toContain('Collaboration');
    expect(links[1].getAttribute('href')).toBe('/organizations/org-1/channels');
    expect(links[0].getAttribute('href')).toBe('/organizations/org-1/messages');
    expect(links[0].getAttribute('aria-current')).toBeNull();
  });

  it('tracks the current organization and marks nested message routes active', async () => {
    const fixture = TestBed.createComponent(CollaborationNav);
    organizationId.set('org-2');
    await TestBed.inject(Router).navigateByUrl('/organizations/org-2/messages/dc-2');
    await fixture.whenStable();
    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/organizations/org-2/messages');
    expect(link.getAttribute('aria-current')).toBe('location');
  });

  it('marks Collaboration active for a nested channel while leaving Messages inactive', async () => {
    const fixture = TestBed.createComponent(CollaborationNav);
    await TestBed.inject(Router).navigateByUrl('/organizations/org-1/channels/channel-1');
    await fixture.whenStable();
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].getAttribute('aria-current')).toBe('location');
  });

  it('requires an organization and accepts wildcard read access', async () => {
    const fixture = TestBed.createComponent(CollaborationNav);
    permissions.set([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    permissions.set(['organization.*']);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
    organizationId.set(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
