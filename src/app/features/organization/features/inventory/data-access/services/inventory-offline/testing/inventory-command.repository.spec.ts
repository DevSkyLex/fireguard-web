import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import type { InventoryPhysicalCommand } from '@features/organization/features/inventory/models';
import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports/organization-member-access';
import { InventoryCommandRepository } from '../inventory-command.repository';

describe('InventoryCommandRepository', () => {
  const initialProfile: CurrentOrganizationMemberProfileOutput = {
    '@id': '/me',
    '@type': 'OrganizationMember',
    id: 'member-a',
    userId: 'user-a',
    organizationId: 'org-a',
    isActive: true,
    joinedAt: '2026-10-06T10:00:00Z',
    roles: [],
    permissions: [],
  };
  const command: InventoryPhysicalCommand = {
    kind: 'correction',
    userId: 'user-a',
    organizationId: 'org-a',
    input: {
      clientOperationId: 'stable-operation',
      partId: 'part',
      warehouseId: 'warehouse',
      quantity: '999999999999999999.123456',
      reason: 'Physical count',
    },
  };

  function setup(platform = 'browser') {
    const profile = signal<CurrentOrganizationMemberProfileOutput | null>(initialProfile);
    const revision = signal(1);
    const authenticated = signal(true);
    TestBed.configureTestingModule({
      providers: [
        InventoryCommandRepository,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { profile } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
      ],
    });
    const repository = TestBed.inject(InventoryCommandRepository);
    const entries = new Map<string, unknown>([['metadata:ownerUserId', 'user-a']]);
    const get = vi
      .spyOn(repository, 'get')
      .mockImplementation(async <T>(storeName: string, key: string): Promise<T | null> => {
        const value = entries.get(`${storeName}:${key}`);
        return value === undefined ? null : (structuredClone(value) as T);
      });
    const getAll = vi
      .spyOn(repository, 'getAll')
      .mockImplementation(async <T>(storeName: string): Promise<readonly T[]> =>
        [...entries.entries()]
          .filter(([key]) => key.startsWith(storeName + ':'))
          .map(([, value]) => structuredClone(value) as T),
      );
    const put = vi
      .spyOn(repository, 'put')
      .mockImplementation(
        async (
          storeName: string,
          key: string,
          value: unknown,
          current?: () => boolean,
        ): Promise<void> => {
          if (current && !current())
            throw new DOMException('Offline operation ownership changed.', 'AbortError');
          entries.set(`${storeName}:${key}`, structuredClone(value));
        },
      );
    const remove = vi
      .spyOn(repository, 'remove')
      .mockImplementation(
        async (storeName: string, key: string, current?: () => boolean): Promise<void> => {
          if (current && !current())
            throw new DOMException('Offline operation ownership changed.', 'AbortError');
          entries.delete(`${storeName}:${key}`);
        },
      );
    const clearAll = vi
      .spyOn(repository, 'clearAll')
      .mockImplementation(async (): Promise<void> => {
        entries.clear();
      });
    return {
      repository,
      profile,
      revision,
      authenticated,
      entries,
      get,
      getAll,
      put,
      remove,
      clearAll,
    };
  }

  it('retains exact physical facts and retries the same intention without replacing its UUID', async () => {
    const { repository, entries } = setup();
    await repository.retain(command);
    await repository.retain({ ...command, input: { ...command.input } });
    const pending = await repository.readPending('user-a', 'org-a');
    expect(pending).toEqual([command]);
    expect(entries.get('commands:stable-operation')).toEqual(command);
    expect(pending[0]?.input.quantity).toBe('999999999999999999.123456');
    expect([...entries.keys()].filter((key) => key.startsWith('commands:'))).toEqual([
      'commands:stable-operation',
    ]);
  });

  it('rejects a retained UUID reused for different physical facts and preserves the original', async () => {
    const { repository, entries } = setup();
    await repository.retain(command);
    await expect(
      repository.retain({ ...command, input: { ...command.input, quantity: '2.000000' } }),
    ).rejects.toThrow('different intention');
    expect(entries.get('commands:stable-operation')).toEqual(command);
  });

  it('serializes concurrent competing intentions sharing one UUID', async () => {
    const { repository, entries } = setup();
    const first = repository.retain(command);
    const competing = repository.retain({
      ...command,
      input: { ...command.input, quantity: '2.000000' },
    });
    const outcomes = await Promise.allSettled([first, competing]);
    expect(outcomes[0]?.status).toBe('fulfilled');
    expect(outcomes[1]?.status).toBe('rejected');
    expect(entries.get('commands:stable-operation')).toEqual(command);
  });

  it('resolves durable acceptance only after the storage write commits', async () => {
    const { repository, entries, put } = setup();
    let commit!: () => void;
    const gate = new Promise<void>((resolve) => {
      commit = resolve;
    });
    put.mockImplementation(async (storeName, key, value, current) => {
      if (storeName === 'commands') await gate;
      if (current && !current())
        throw new DOMException('Offline operation ownership changed.', 'AbortError');
      entries.set(`${storeName}:${key}`, structuredClone(value));
    });
    let accepted = false;
    const retention = repository.retain(command).then(() => {
      accepted = true;
    });
    await vi.waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        'commands',
        'stable-operation',
        command,
        expect.any(Function),
      ),
    );
    expect(accepted).toBe(false);
    expect(entries.has('commands:stable-operation')).toBe(false);
    commit();
    await retention;
    expect(accepted).toBe(true);
    expect(entries.get('commands:stable-operation')).toEqual(command);
  });

  it('propagates storage failure without claiming durable acceptance', async () => {
    const { repository, entries, put } = setup();
    put.mockImplementation(async (storeName, key, value) => {
      if (storeName === 'commands') throw new DOMException('Quota exceeded.', 'QuotaExceededError');
      entries.set(`${storeName}:${key}`, structuredClone(value));
    });
    await expect(repository.retain(command)).rejects.toMatchObject({ name: 'QuotaExceededError' });
    expect(entries.has('commands:stable-operation')).toBe(false);
  });

  it('filters by account and organization and preserves other-organization facts', async () => {
    const { repository, profile, entries } = setup();
    await repository.retain(command);
    const other: InventoryPhysicalCommand = {
      ...command,
      organizationId: 'org-b',
      input: { ...command.input, clientOperationId: 'other-organization' },
    };
    entries.set('commands:other-organization', other);
    entries.set('commands:foreign-account', {
      ...command,
      userId: 'user-b',
      input: { ...command.input, clientOperationId: 'foreign-account' },
    });
    expect(await repository.readPending('user-a', 'org-a')).toEqual([command]);
    expect(await repository.readPending('user-a', 'org-b')).toEqual([]);
    profile.set({ ...initialProfile, organizationId: 'org-b' });
    expect(await repository.readPending('user-a', 'org-b')).toEqual([other]);
    expect(entries.get('commands:stable-operation')).toEqual(command);
  });

  it('rebinds storage for a new account before exposing its command journal', async () => {
    const { repository, profile, entries, clearAll } = setup();
    await repository.retain(command);
    profile.set({ ...initialProfile, userId: 'user-b' });
    expect(await repository.readPending('user-b', 'org-a')).toEqual([]);
    expect(clearAll).toHaveBeenCalledTimes(1);
    expect(entries.has('commands:stable-operation')).toBe(false);
    expect(entries.get('metadata:ownerUserId')).toBe('user-b');
  });

  it('fences ownership changes while account binding is pending', async () => {
    const { repository, profile, put } = setup();
    let release!: () => void;
    vi.spyOn(repository, 'ensureOwnerBound').mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const retention = repository.retain(command);
    const rejected = expect(retention).rejects.toThrow(/ownership changed/i);
    profile.set({ ...initialProfile, userId: 'user-b' });
    release();
    await rejected;
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects an old pending retain after logout and same-account return', async () => {
    const { repository, profile, revision, authenticated, put } = setup();
    let release!: () => void;
    vi.spyOn(repository, 'ensureOwnerBound').mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const retention = repository.retain(command);
    const rejected = expect(retention).rejects.toThrow(/ownership changed/i);
    authenticated.set(false);
    profile.set(null);
    revision.set(2);
    authenticated.set(true);
    profile.set(initialProfile);
    revision.set(3);
    release();
    await rejected;
    expect(put).not.toHaveBeenCalled();
  });

  it('discards an old read result after scope changes during the IndexedDB read', async () => {
    const { repository, profile, getAll } = setup();
    let release!: (commands: readonly InventoryPhysicalCommand[]) => void;
    getAll.mockReturnValue(
      new Promise<readonly InventoryPhysicalCommand[]>((resolve) => {
        release = resolve;
      }),
    );
    const reading = repository.readPending('user-a', 'org-a');
    await vi.waitFor(() => expect(getAll).toHaveBeenCalledWith('commands'));
    profile.set({ ...initialProfile, organizationId: 'org-b' });
    release([command]);
    expect(await reading).toEqual([]);
  });

  it('keeps acknowledged facts when the original owner is no longer current', async () => {
    const { repository, profile, entries, remove } = setup();
    await repository.retain(command);
    profile.set({ ...initialProfile, organizationId: 'org-b' });
    await repository.acknowledge(command);
    expect(remove).not.toHaveBeenCalled();
    expect(entries.get('commands:stable-operation')).toEqual(command);
    profile.set(initialProfile);
    await repository.acknowledge(command);
    expect(entries.has('commands:stable-operation')).toBe(false);
  });

  it('discards a pending read from a previous session even when the same account returns', async () => {
    const { repository, revision, getAll } = setup();
    let release!: (commands: readonly InventoryPhysicalCommand[]) => void;
    getAll.mockReturnValue(
      new Promise<readonly InventoryPhysicalCommand[]>((resolve) => {
        release = resolve;
      }),
    );
    const reading = repository.readPending('user-a', 'org-a');
    await vi.waitFor(() => expect(getAll).toHaveBeenCalledWith('commands'));
    revision.set(3);
    release([command]);
    expect(await reading).toEqual([]);
  });

  it('keeps a confirmed command when its acknowledgment belongs to an old session', async () => {
    const { repository, revision, entries, remove } = setup();
    await repository.retain(command);
    const originalRevision = repository.sessionRevision();
    revision.set(3);
    expect(repository.isCurrent('user-a', 'org-a', originalRevision)).toBe(false);
    await repository.acknowledge(command, originalRevision);
    expect(remove).not.toHaveBeenCalled();
    expect(entries.get('commands:stable-operation')).toEqual(command);
    expect(await repository.readPending('user-a', 'org-a')).toEqual([command]);
    await repository.acknowledge(command, repository.sessionRevision());
    expect(entries.has('commands:stable-operation')).toBe(false);
  });

  it('recovers the serialized journal after a rejected conflicting intention', async () => {
    const { repository } = setup();
    await repository.retain(command);
    await expect(
      repository.retain({ ...command, input: { ...command.input, reason: 'Different facts' } }),
    ).rejects.toThrow('different intention');
    const next: InventoryPhysicalCommand = {
      ...command,
      input: { ...command.input, clientOperationId: 'next-operation' },
    };
    await repository.retain(next);
    expect(await repository.readPending('user-a', 'org-a')).toEqual([command, next]);
  });

  it('refuses authenticated journal access for an inactive organization member', async () => {
    const { repository, profile, get, put } = setup();
    profile.set({ ...initialProfile, isActive: false });
    expect(await repository.readPending('user-a', 'org-a')).toEqual([]);
    await expect(repository.retain(command)).rejects.toThrow(/ownership changed/i);
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('never opens or mutates the journal during SSR', async () => {
    const { repository, get, put } = setup('server');
    expect(await repository.readPending('user-a', 'org-a')).toEqual([]);
    await expect(repository.retain(command)).rejects.toThrow(/ownership changed/i);
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});
