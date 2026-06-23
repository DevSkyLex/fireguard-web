import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/api/models';
import { UserService } from '@features/account/data-access';
import type { UserOutput } from '@features/account/models';
import { UsersStore } from '../users.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('UsersStore', () => {
  let store: UsersStore;
  let mockUserService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    listStatuses: ReturnType<typeof vi.fn>;
  };

  const user = { id: 'user-1', email: 'jane@example.com' } as unknown as UserOutput;
  const usersCollection: HydraCollection<UserOutput> = {
    '@id': '/api/users',
    '@type': 'Collection',
    totalItems: 1,
    member: [user],
  };
  const statusesCollection: HydraCollection<OptionOutput> = {
    '@id': '/api/users/statuses',
    '@type': 'Collection',
    totalItems: 2,
    member: [
      { '@id': '/api/options/active', '@type': 'Option', value: 'active', label: 'Active' },
      { '@id': '/api/options/inactive', '@type': 'Option', value: 'inactive', label: 'Inactive' },
    ],
  };

  beforeEach(() => {
    mockUserService = {
      list: vi.fn().mockReturnValue(of(usersCollection)),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      listStatuses: vi.fn().mockReturnValue(of(statusesCollection)),
    };

    TestBed.configureTestingModule({
      providers: [
        UsersStore,
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: UserService, useValue: mockUserService },
      ],
    });

    store = TestBed.inject(UsersStore);
  });

  it('should load users and expose totals', async () => {
    store.load();
    await flushEffects();

    expect(mockUserService.list).toHaveBeenCalledTimes(1);
    expect(store.users()).toEqual([user]);
    expect(store.totalUsers()).toBe(1);
    expect(store.listCallState().status).toBe('success');
  });

  it('should load status options', async () => {
    store.loadStatuses();
    await flushEffects();

    expect(mockUserService.listStatuses).toHaveBeenCalledTimes(1);
    expect(store.statuses()).toEqual(statusesCollection.member);
    expect(store.statusesCallState().status).toBe('success');
  });
});
