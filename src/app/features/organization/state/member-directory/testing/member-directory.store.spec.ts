import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import type { OrganizationMemberOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { MemberDirectoryStore } from '../member-directory.store';

describe('MemberDirectoryStore', () => {
  const sessionRevision = signal(0);
  const isAuthenticated = signal(true);
  const selectedOrganizationId = signal<string | null>(null);
  const service = { listAll: vi.fn() };
  const permissions = { hasPermission: vi.fn() };
  let store: InstanceType<typeof MemberDirectoryStore>;
  const member: OrganizationMemberOutput = {
    '@id': '/api/organizations/org-1/members/member-1',
    '@type': 'OrganizationMember',
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    displayName: 'Alice',
    isActive: true,
    isOwner: false,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
  };

  beforeEach(() => {
    sessionRevision.set(0);
    isAuthenticated.set(true);
    selectedOrganizationId.set(null);
    service.listAll.mockReset().mockReturnValue(of([member]));
    permissions.hasPermission.mockReset().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision, isAuthenticated } },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganizationId } },
        { provide: OrganizationMemberService, useValue: service },
        { provide: OrganizationPermissionService, useValue: permissions },
      ],
    });
    store = TestBed.inject(MemberDirectoryStore);
  });

  it('retries a failed directory and caches a successful empty roster', () => {
    service.listAll
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValue(of([]));
    store.ensureLoaded('org-1');
    expect(store.callState().status).toBe('error');
    store.ensureLoaded('org-1');
    store.ensureLoaded('org-1');
    expect(service.listAll).toHaveBeenCalledTimes(2);
    expect(store.callState().status).toBe('success');
    expect(store.byId().size).toBe(0);
  });

  it('clears previous names immediately on organization changes and cancels obsolete reads', () => {
    store.ensureLoaded('org-1');
    expect(store.displayNameFor('member-1')).toBe('Alice');
    const response = new Subject<readonly OrganizationMemberOutput[]>();
    service.listAll.mockReturnValueOnce(response);
    store.ensureLoaded('org-2');
    expect(store.displayNameFor('member-1')).toBe('Unknown member');
    store.ensureLoaded('org-1');
    expect(response.observed).toBe(false);
    response.next([{ ...member, displayName: 'Other organization' }]);
    expect(store.displayNameFor('member-1')).toBe('Alice');
  });

  it('retains names during a same-organization refresh and permits retry after failure', () => {
    store.ensureLoaded('org-1');
    const response = new Subject<readonly OrganizationMemberOutput[]>();
    service.listAll.mockReturnValueOnce(response);
    store.reload();
    expect(store.displayNameFor('member-1')).toBe('Alice');
    response.error(new Error('offline'));
    expect(store.displayNameFor('member-1')).toBe('Alice');
    store.ensureLoaded('org-1');
    expect(service.listAll).toHaveBeenCalledTimes(3);
    expect(store.callState().status).toBe('success');
  });

  it('cancels on logout and loads afresh after the next login', () => {
    const response = new Subject<readonly OrganizationMemberOutput[]>();
    service.listAll.mockReturnValueOnce(response);
    store.ensureLoaded('org-1');
    isAuthenticated.set(false);
    sessionRevision.update((revision) => revision + 1);
    TestBed.tick();
    expect(response.observed).toBe(false);
    expect(store.byId().size).toBe(0);
    expect(store.callState().status).toBe('idle');
    isAuthenticated.set(true);
    sessionRevision.update((revision) => revision + 1);
    store.ensureLoaded('org-1');
    expect(service.listAll).toHaveBeenCalledTimes(2);
    expect(store.displayNameFor('member-1')).toBe('Alice');
  });

  it('clears cached names when the active organization changes without a new lookup', () => {
    selectedOrganizationId.set('org-1');
    store.ensureLoaded('org-1');
    TestBed.tick();
    selectedOrganizationId.set('org-2');
    TestBed.tick();
    expect(store.byId().size).toBe(0);
  });
});
