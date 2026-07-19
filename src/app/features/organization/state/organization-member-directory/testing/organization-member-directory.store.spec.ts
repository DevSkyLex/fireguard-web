import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import type { OrganizationMemberOutput } from '@features/organization/models';
import { OrganizationMemberDirectoryStore } from '../organization-member-directory.store';

const member = (overrides: Partial<OrganizationMemberOutput>): OrganizationMemberOutput =>
  ({
    id: 'm1',
    organizationId: 'org-1',
    userId: 'u1',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  }) as OrganizationMemberOutput;

describe('OrganizationMemberDirectoryStore', () => {
  const createStore = (members: readonly OrganizationMemberOutput[]) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrganizationMemberService,
          useValue: { list: vi.fn(() => of({ member: members, totalItems: members.length })) },
        },
      ],
    });

    const store = TestBed.inject(OrganizationMemberDirectoryStore);
    store.load('org-1');
    return store;
  };

  it('should index members by id', () => {
    const store = createStore([member({ id: 'm1', displayName: 'Nadia Rahal' })]);

    expect(store.identities().get('m1')?.displayName).toBe('Nadia Rahal');
  });

  // The payload's name fields are all optional, so the fallback chain is the
  // difference between a name and a raw UUID on screen.
  it('should fall back through displayName, full name, email, then id', () => {
    const store = createStore([
      member({ id: 'a', displayName: 'Preferred', firstName: 'Ignored' }),
      member({ id: 'b', firstName: 'Ada', lastName: 'Lovelace' }),
      member({ id: 'c', email: 'only@fireguard.test' }),
      member({ id: 'd' }),
    ]);

    expect(store.identities().get('a')?.displayName).toBe('Preferred');
    expect(store.identities().get('b')?.displayName).toBe('Ada Lovelace');
    expect(store.identities().get('c')?.displayName).toBe('only@fireguard.test');
    expect(store.identities().get('d')?.displayName).toBe('d');
  });

  it('should derive initials from the resolved name', () => {
    const store = createStore([
      member({ id: 'a', firstName: 'Ada', lastName: 'Lovelace' }),
      member({ id: 'b', displayName: 'Cher' }),
    ]);

    expect(store.identities().get('a')?.initials).toBe('AL');
    expect(store.identities().get('b')?.initials).toBe('CH');
  });

  it('should return nothing for a member it does not know', () => {
    const store = createStore([member({ id: 'a' })]);

    expect(store.identities().get('missing')).toBeUndefined();
  });

  // Loading the whole directory once is the point: this store must never be
  // the admin table's paged, search-filtered state.
  it('should request the directory unfiltered', () => {
    createStore([]);

    const service = TestBed.inject(OrganizationMemberService);
    expect(service.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
  });

  it('should ignore a null organization', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrganizationMemberService,
          useValue: { list: vi.fn(() => of({ member: [], totalItems: 0 })) },
        },
      ],
    });

    TestBed.inject(OrganizationMemberDirectoryStore).load(null);

    expect(TestBed.inject(OrganizationMemberService).list).not.toHaveBeenCalled();
  });
});
