import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { Observable, of, throwError } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/api/models';
import { UserService } from '@features/account/data-access';
import type { UpdateUserInput, UserInput, UserOutput } from '@features/account/models';
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

  it('should report isEmpty when no users are loaded and list is not pending', () => {
    expect(store.isEmpty()).toBe(true);
  });

  it('should report isEmpty as false once users are loaded', async () => {
    store.load();
    await flushEffects();

    expect(store.isEmpty()).toBe(false);
  });

  it('should mark the list call state as error and dispatch listFailed on load failure', async () => {
    const dispatcher = TestBed.inject(Dispatcher);
    mockUserService.list.mockReturnValue(throwError(() => new Error('list boom')));

    store.load();
    await flushEffects();

    expect(store.listCallState().status).toBe('error');
    expect(store.listCallState().error).toEqual(
      expect.objectContaining({ message: expect.any(String) as string }),
    );
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Users Store] listFailed' }),
    );
  });

  it('should create a user and expose it through users and totalUsers', async () => {
    const newUser = { id: 'user-2', email: 'new@example.com' } as unknown as UserOutput;
    const input: UserInput = {
      username: 'newuser',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      avatarUrl: null,
      tenantId: 'tenant-1',
      password: 'S3curePass!',
    } as unknown as UserInput;
    mockUserService.create.mockReturnValue(of(newUser));

    store.load();
    await flushEffects();

    store.create(input);
    await flushEffects();

    expect(mockUserService.create).toHaveBeenCalledWith(input);
    expect(store.users()).toContainEqual(newUser);
    expect(store.totalUsers()).toBe(2);
    expect(store.createCallState().status).toBe('success');
    expect(store.isCreating()).toBe(false);
    expect(store.createError()).toBeNull();
  });

  it('should mark the create call state as error and dispatch createFailed on create failure', async () => {
    const dispatcher = TestBed.inject(Dispatcher);
    mockUserService.create.mockReturnValue(throwError(() => new Error('create boom')));
    const input: UserInput = {
      username: 'baduser',
      email: 'bad@example.com',
      firstName: 'Bad',
      lastName: 'User',
      avatarUrl: null,
      tenantId: 'tenant-1',
      password: 'S3curePass!',
    } as unknown as UserInput;

    store.create(input);
    await flushEffects();

    expect(store.createCallState().status).toBe('error');
    expect(store.createError()).toEqual(
      expect.objectContaining({ message: expect.any(String) as string }),
    );
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Users Store] createFailed' }),
    );
  });

  it('should update a user and reflect changes in users', async () => {
    const updatedUser = { ...user, email: 'updated@example.com' };
    mockUserService.update.mockReturnValue(of(updatedUser));
    const input: UpdateUserInput = { email: 'updated@example.com' };

    store.load();
    await flushEffects();

    store.update({ id: user.id, input });
    await flushEffects();

    expect(mockUserService.update).toHaveBeenCalledWith(user.id, input);
    expect(store.users()).toContainEqual(updatedUser);
    expect(store.updateCallState().status).toBe('success');
    expect(store.isUpdating()).toBe(false);
    expect(store.updateError()).toBeNull();
  });

  it('should mark the update call state as error and dispatch updateFailed on update failure', async () => {
    const dispatcher = TestBed.inject(Dispatcher);
    mockUserService.update.mockReturnValue(throwError(() => new Error('update boom')));

    store.update({ id: user.id, input: { email: 'fail@example.com' } });
    await flushEffects();

    expect(store.updateCallState().status).toBe('error');
    expect(store.updateError()).toEqual(
      expect.objectContaining({ message: expect.any(String) as string }),
    );
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Users Store] updateFailed' }),
    );
  });

  it('should delete a user and decrement totalUsers', async () => {
    mockUserService.remove.mockReturnValue(of(undefined));

    store.load();
    await flushEffects();

    store.deleteOne(user.id);
    await flushEffects();

    expect(mockUserService.remove).toHaveBeenCalledWith(user.id);
    expect(store.users()).toEqual([]);
    expect(store.totalUsers()).toBe(0);
    expect(store.deleteCallState().status).toBe('success');
    expect(store.isDeleting()).toBe(false);
  });

  it('should not let totalUsers go below zero when deleting from an empty state', async () => {
    mockUserService.remove.mockReturnValue(of(undefined));

    store.deleteOne('nonexistent-id');
    await flushEffects();

    expect(store.totalUsers()).toBe(0);
    expect(store.deleteCallState().status).toBe('success');
  });

  it('should mark the delete call state as error and dispatch deleteFailed on delete failure', async () => {
    const dispatcher = TestBed.inject(Dispatcher);
    mockUserService.remove.mockReturnValue(throwError(() => new Error('delete boom')));

    store.deleteOne(user.id);
    await flushEffects();

    expect(store.deleteCallState().status).toBe('error');
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Users Store] deleteFailed' }),
    );
  });

  it('should mark the statuses call state as error and dispatch statusesFailed on load failure', async () => {
    const dispatcher = TestBed.inject(Dispatcher);
    mockUserService.listStatuses.mockReturnValue(throwError(() => new Error('statuses boom')));

    store.loadStatuses();
    await flushEffects();

    expect(store.statusesCallState().status).toBe('error');
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Users Store] statusesFailed' }),
    );
  });

  it('should report isLoadingStatuses while the statuses call is pending', async () => {
    let resolveStatuses: (() => void) | undefined;
    mockUserService.listStatuses.mockReturnValue(
      new Observable<HydraCollection<OptionOutput>>((subscriber) => {
        resolveStatuses = () => {
          subscriber.next(statusesCollection);
          subscriber.complete();
        };
      }),
    );

    store.loadStatuses();
    await flushEffects();

    expect(store.isLoadingStatuses()).toBe(true);

    resolveStatuses?.();
    await flushEffects();

    expect(store.isLoadingStatuses()).toBe(false);
  });
});
