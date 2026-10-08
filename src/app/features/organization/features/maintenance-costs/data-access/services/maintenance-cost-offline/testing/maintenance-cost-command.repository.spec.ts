import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import type { MaintenanceCostCommand } from '@features/organization/features/maintenance-costs/models';
import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports/organization-member-access';
import { MaintenanceCostCommandRepository } from '../maintenance-cost-command.repository';

describe('MaintenanceCostCommandRepository', () => {
  const actor: CurrentOrganizationMemberProfileOutput = {
    '@id': '/me',
    '@type': 'OrganizationMember',
    id: 'member-a',
    userId: 'user-a',
    organizationId: 'org-a',
    isActive: true,
    joinedAt: '2026-10-08T10:00:00Z',
    roles: [],
    permissions: [],
  };
  const expense: MaintenanceCostCommand = {
    kind: 'expense',
    organizationId: 'org-a',
    interventionId: 'dossier-a',
    input: {
      clientId: 'stable-expense',
      amount: '9007199254740993.123456',
      description: 'Original repair',
      incurredAt: '2025-01-01T00:00:00Z',
    },
  };

  function setup(platform = 'browser') {
    const profile = signal<CurrentOrganizationMemberProfileOutput | null>(actor);
    const revision = signal(1);
    const authenticated = signal(true);
    TestBed.configureTestingModule({
      providers: [
        MaintenanceCostCommandRepository,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { profile } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
      ],
    });
    const repository = TestBed.inject(MaintenanceCostCommandRepository);
    const entries = new Map<string, unknown>([['metadata:ownerUserId', 'user-a']]);
    vi.spyOn(repository, 'get').mockImplementation(
      async <T>(store: string, key: string): Promise<T | null> => {
        const value = entries.get(`${store}:${key}`);
        return value === undefined ? null : (structuredClone(value) as T);
      },
    );
    const getAll = vi
      .spyOn(repository, 'getAll')
      .mockImplementation(async <T>(store: string): Promise<readonly T[]> =>
        [...entries.entries()]
          .filter(([key]) => key.startsWith(`${store}:`))
          .map(([, value]) => structuredClone(value) as T),
      );
    const put = vi
      .spyOn(repository, 'put')
      .mockImplementation(async (store, key, value, current) => {
        if (current && !current()) throw new Error('Ownership changed');
        entries.set(`${store}:${key}`, structuredClone(value));
      });
    const remove = vi
      .spyOn(repository, 'remove')
      .mockImplementation(async (store, key, current) => {
        if (current && !current()) throw new Error('Ownership changed');
        entries.delete(`${store}:${key}`);
      });
    const clear = vi.spyOn(repository, 'clearAll').mockImplementation(async () => {
      entries.clear();
    });
    return { repository, entries, profile, revision, authenticated, getAll, put, remove, clear };
  }

  it('retains exact immutable expense and rate UUIDs and permits only matching dossier recovery', async () => {
    const { repository, entries } = setup();
    await repository.retain(expense);
    expect(await repository.readPending('org-a', 'dossier-a')).toEqual(expense);
    expect(await repository.readPending('org-a', 'dossier-b')).toBeNull();
    expect(await repository.readPending('org-b', 'dossier-a')).toBeNull();
    expect(entries.get('commands:expense:stable-expense')).toEqual({
      userId: 'user-a',
      command: expense,
    });
    const rate: MaintenanceCostCommand = {
      kind: 'rate',
      organizationId: 'org-a',
      input: {
        clientId: 'stable-rate',
        memberId: 'member-a',
        hourlyAmount: '50.123456',
        effectiveFrom: '2025-01-01',
      },
    };
    await repository.retain(rate);
    expect(await repository.readPending('org-a', null)).toEqual(rate);
  });

  it('rejects a changed body under the same identity and retains the original facts', async () => {
    const { repository } = setup();
    await repository.retain(expense);
    await expect(
      repository.retain({ ...expense, input: { ...expense.input, amount: '1' } }),
    ).rejects.toThrow('different intention');
    expect(await repository.readPending('org-a', 'dossier-a')).toEqual(expense);
  });

  it('recovers the original account-bound command after the journal owner is recreated', async () => {
    const { repository, entries } = setup();
    await repository.retain(expense);
    const reloaded = TestBed.runInInjectionContext(() => new MaintenanceCostCommandRepository());
    vi.spyOn(reloaded, 'get').mockImplementation(
      async <T>(store: string, key: string): Promise<T | null> =>
        (entries.get(`${store}:${key}`) as T | undefined) ?? null,
    );
    vi.spyOn(reloaded, 'getAll').mockImplementation(
      async <T>(store: string): Promise<readonly T[]> =>
        [...entries.entries()]
          .filter(([key]) => key.startsWith(`${store}:`))
          .map(([, value]) => structuredClone(value) as T),
    );
    vi.spyOn(reloaded, 'put').mockImplementation(async (store, key, value) => {
      entries.set(`${store}:${key}`, structuredClone(value));
    });
    vi.spyOn(reloaded, 'clearAll').mockImplementation(async () => {
      entries.clear();
    });
    expect(reloaded).not.toBe(repository);
    expect(await reloaded.readPending('org-a', 'dossier-a')).toEqual(expense);
    expect(entries.get('commands:expense:stable-expense')).toEqual({
      userId: 'user-a',
      command: expense,
    });
  });

  it('does not report acceptance before storage commits and propagates storage failures', async () => {
    const { repository, put, entries } = setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    put.mockImplementation(async (store, key, value, current) => {
      if (store === 'commands') await gate;
      if (current && !current()) throw new Error('Ownership changed');
      entries.set(`${store}:${key}`, structuredClone(value));
    });
    let accepted = false;
    const retaining = repository.retain(expense).then(() => {
      accepted = true;
    });
    await vi.waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        'commands',
        'expense:stable-expense',
        { userId: 'user-a', command: expense },
        expect.any(Function),
      ),
    );
    expect(accepted).toBe(false);
    release();
    await retaining;
    expect(accepted).toBe(true);
    put.mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'));
    await expect(
      repository.retain({ ...expense, input: { ...expense.input, clientId: 'second-expense' } }),
    ).rejects.toMatchObject({ name: 'QuotaExceededError' });
  });

  it('purges an old account before a new account reads the journal', async () => {
    const { repository, profile, entries, clear } = setup();
    await repository.retain(expense);
    profile.set({ ...actor, userId: 'user-b' });
    expect(await repository.readPending('org-a', 'dossier-a')).toBeNull();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(entries.has('commands:expense:stable-expense')).toBe(false);
    expect(entries.get('metadata:ownerUserId')).toBe('user-b');
  });

  it('purges private facts at session replacement and fences an outstanding read', async () => {
    const { repository, revision, entries, getAll } = setup();
    TestBed.tick();
    await repository.retain(expense);
    let release!: (records: readonly unknown[]) => void;
    getAll.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const reading = repository.readPending('org-a', 'dossier-a');
    await vi.waitFor(() => expect(getAll).toHaveBeenCalled());
    revision.set(2);
    TestBed.tick();
    release([{ userId: 'user-a', command: expense }]);
    expect(await reading).toBeNull();
    expect(await repository.readPending('org-a', 'dossier-a')).toBeNull();
    expect(entries.has('commands:expense:stable-expense')).toBe(false);
  });

  it('fences retention after logout or organization replacement and never touches storage in SSR', async () => {
    const { repository, profile, put, authenticated } = setup();
    let release!: () => void;
    vi.spyOn(repository, 'ensureOwnerBound').mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const retaining = repository.retain(expense);
    const rejected = expect(retaining).rejects.toThrow('ownership changed');
    profile.set({ ...actor, organizationId: 'org-b' });
    authenticated.set(false);
    release();
    await rejected;
    expect(put).not.toHaveBeenCalled();
  });

  it('does not open the private journal during SSR', async () => {
    const { repository, put, getAll } = setup('server');
    expect(await repository.readPending('org-a', 'dossier-a')).toBeNull();
    await expect(repository.retain(expense)).rejects.toThrow('ownership changed');
    expect(put).not.toHaveBeenCalled();
    expect(getAll).not.toHaveBeenCalled();
  });

  it('keeps a failed session purge mandatory before exposing any previous private intention', async () => {
    const { repository, revision, entries, clear } = setup();
    await repository.retain(expense);
    clear.mockRejectedValue(new Error('Purge unavailable'));
    revision.set(2);
    await expect(repository.readPending('org-a', 'dossier-a')).rejects.toThrow('Purge unavailable');
    await expect(repository.retain(expense)).rejects.toThrow('Purge unavailable');
    expect(entries.has('commands:expense:stable-expense')).toBe(true);
    clear.mockImplementation(async () => {
      entries.clear();
    });
    expect(await repository.readPending('org-a', 'dossier-a')).toBeNull();
    expect(entries.has('commands:expense:stable-expense')).toBe(false);
  });
});
