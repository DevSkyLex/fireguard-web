import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationMemberOutput,
} from '@features/organization/models';
import { MemberDirectoryStore } from '../member-directory.store';

describe('MemberDirectoryStore', () => {
  const service = { listAll: vi.fn() };
  const permissions = { hasPermission: vi.fn() };
  let store: InstanceType<typeof MemberDirectoryStore>;
  const member: OrganizationMemberOutput = {
    '@id': '/api/organizations/org-1/members/member-1',
    '@type': 'OrganizationMember',
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    displayName: 'Alice Martin',
    isActive: true,
    isOwner: false,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    service.listAll.mockReturnValue(of([member]));
    permissions.hasPermission.mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationMemberService, useValue: service },
        { provide: OrganizationPermissionService, useValue: permissions },
      ],
    });
    store = TestBed.inject(MemberDirectoryStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('does not query or expose the directory without member-read permission', () => {
    permissions.hasPermission.mockReturnValue(false);

    store.ensureLoaded('org-1');

    expect(store.isAvailable()).toBe(false);
    expect(service.listAll).not.toHaveBeenCalled();
    expect(store.callState().status).toBe('idle');
    expect(permissions.hasPermission).toHaveBeenCalledWith(ORGANIZATION_PERMISSION.MEMBERS_READ);
  });

  it('loads one organization once and resolves both member ids and IRIs', () => {
    store.ensureLoaded('org-1');
    store.ensureLoaded('org-1');

    expect(service.listAll).toHaveBeenCalledExactlyOnceWith('org-1');
    expect(store.callState().status).toBe('success');
    expect(store.displayNameFor('member-1')).toBe('Alice Martin');
    expect(store.displayNameFor('/api/organizations/org-1/members/member-1')).toBe('Alice Martin');
    expect(store.displayNameFor('missing-member')).toBe('Unknown member');
  });

  it('keeps known names visible while a same-organization refresh is pending', () => {
    store.ensureLoaded('org-1');
    const response = new Subject<readonly OrganizationMemberOutput[]>();
    service.listAll.mockReturnValue(response);

    store.reload();

    expect(store.isLoading()).toBe(true);
    expect(store.displayNameFor('member-1')).toBe('Alice Martin');
    response.next([{ ...member, displayName: 'Alice Updated' }]);
    response.complete();
    expect(store.displayNameFor('member-1')).toBe('Alice Updated');
    expect(store.callState().status).toBe('success');
  });

  it('preserves the last directory after a failed refresh and permits a later retry', () => {
    store.ensureLoaded('org-1');
    service.listAll.mockReturnValueOnce(throwError(() => new Error('Offline')));

    store.reload();

    expect(store.callState().status).toBe('error');
    expect(store.displayNameFor('member-1')).toBe('Alice Martin');
    service.listAll.mockReturnValue(of([{ ...member, displayName: 'Alice Retried' }]));
    store.reload();
    expect(store.displayNameFor('member-1')).toBe('Alice Retried');
  });

  it('does not reload before a scope exists or after permission is withdrawn', () => {
    store.reload();
    expect(service.listAll).not.toHaveBeenCalled();
    store.ensureLoaded('org-1');
    service.listAll.mockClear();
    permissions.hasPermission.mockReturnValue(false);

    store.reload();

    expect(service.listAll).not.toHaveBeenCalled();
  });
});
