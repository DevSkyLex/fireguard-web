import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ServiceRequestConversionCommand } from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { serviceRequestContext } from '@features/organization/features/service-requests/state/service-request/testing/service-request-context.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ServiceRequestCommandRepository } from '../service-request-command.repository';

const command: ServiceRequestConversionCommand = {
  kind: 'convert',
  userId: 'user',
  organizationId: 'org',
  request: serviceRequestFixture({ status: 'qualified', revision: 7 }),
  input: {
    clientOperationId: 'stable-uuid',
    existingInterventionId: 'work',
    existingTaskId: 'task',
  },
};

function setup(
  entries = new Map<string, unknown>([['metadata:ownerUserId', command.userId]]),
  platform = 'browser',
) {
  const grants = signal<readonly string[]>([
    ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE,
    ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
  ]);
  const context = serviceRequestContext(grants);
  TestBed.configureTestingModule({
    providers: [
      ...context.providers,
      ServiceRequestCommandRepository,
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  const repository = TestBed.inject(ServiceRequestCommandRepository);
  const get = vi
    .spyOn(repository, 'get')
    .mockImplementation(async <T>(store: string, key: string): Promise<T | null> => {
      const value = entries.get(`${store}:${key}`);
      return value === undefined ? null : (structuredClone(value) as T);
    });
  const getAll = vi
    .spyOn(repository, 'getAll')
    .mockImplementation(async <T>(store: string): Promise<readonly T[]> =>
      [...entries]
        .filter(([key]) => key.startsWith(store + ':'))
        .map(([, value]) => structuredClone(value) as T),
    );
  const put = vi.spyOn(repository, 'put').mockImplementation(async (store, key, value, current) => {
    if (current && !current()) throw new DOMException('Ownership changed', 'AbortError');
    entries.set(`${store}:${key}`, structuredClone(value));
  });
  const remove = vi.spyOn(repository, 'remove').mockImplementation(async (store, key, current) => {
    if (current && !current()) throw new DOMException('Ownership changed', 'AbortError');
    entries.delete(`${store}:${key}`);
  });
  const clearAll = vi.spyOn(repository, 'clearAll').mockImplementation(async () => {
    entries.clear();
  });
  TestBed.tick();
  return { repository, context, grants, entries, get, getAll, put, remove, clearAll };
}

describe('ServiceRequestCommandRepository', () => {
  it('restores the exact UUID, work tuple and captured revision through a repository reload', async () => {
    const first = setup();
    await first.repository.retain(command);
    TestBed.resetTestingModule();
    const reloaded = setup(first.entries);
    expect(await reloaded.repository.readPending('user', 'org')).toEqual([command]);
    expect(reloaded.clearAll).not.toHaveBeenCalled();
    await reloaded.repository.acknowledge(command, 1);
    expect(await reloaded.repository.readPending('user', 'org')).toEqual([]);
  });

  it('does not replace an accepted UUID with another revision or work choice', async () => {
    const { repository, entries } = setup();
    await repository.retain(command);
    await expect(
      repository.retain({ ...command, request: { ...command.request, revision: 99 } }),
    ).rejects.toThrow('different intention');
    expect(entries.get('commands:stable-uuid')).toEqual(command);
  });
  it('reuses an already durable exact conversion without rewriting its journal entry', async () => {
    const { repository, put } = setup();
    await repository.retain(command);
    put.mockClear();
    put.mockRejectedValue(new DOMException('Quota full', 'QuotaExceededError'));
    await repository.retain(structuredClone(command));
    expect(put).not.toHaveBeenCalled();
    expect(await repository.readPending('user', 'org')).toEqual([command]);
  });

  it('actively purges account replacement after route destruction without another journal read', async () => {
    const { repository, context, entries, clearAll } = setup();
    await repository.retain(command);
    const profile = context.profile();
    if (!profile) throw new Error('Missing fixture member');
    context.profile.set({ ...profile, userId: 'another-user' });
    context.revision.set(2);
    TestBed.tick();
    await vi.waitFor(() => expect(clearAll).toHaveBeenCalledOnce());
    expect(entries.size).toBe(0);
    expect(repository.isCurrent('user', 'org', 1)).toBe(false);
  });

  it('purges logout even when the same account subsequently returns', async () => {
    const { repository, context, entries } = setup();
    await repository.retain(command);
    context.authenticated.set(false);
    context.revision.set(2);
    TestBed.tick();
    await vi.waitFor(() => expect(entries.size).toBe(0));
    context.authenticated.set(true);
    context.revision.set(3);
    TestBed.tick();
    expect(await repository.readPending('user', 'org')).toEqual([]);
  });

  it('fences an old acceptance while owner binding is still pending', async () => {
    const { repository, context, put } = setup();
    let release: () => void = vi.fn();
    const binding = vi.spyOn(repository, 'ensureOwnerBound').mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const retention = repository.retain(command);
    const rejected = expect(retention).rejects.toThrow('ownership changed');
    await vi.waitFor(() => expect(binding).toHaveBeenCalledOnce());
    context.revision.set(2);
    TestBed.tick();
    release();
    await rejected;
    expect(put).not.toHaveBeenCalled();
  });

  it('checks management and original organization while permitting exact replay after planning revocation', async () => {
    const { repository, grants, remove } = setup();
    await repository.retain(command);
    grants.set([ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE]);
    expect(repository.isCurrent('user', 'org', 1)).toBe(true);
    expect(await repository.readPending('user', 'foreign-org')).toEqual([]);
    grants.set([]);
    expect(repository.isCurrent('user', 'org', 1)).toBe(false);
    await repository.acknowledge(command, 1);
    expect(remove).not.toHaveBeenCalled();
  });

  it('purges before a new session reads immediately, without waiting for its lifecycle effect', async () => {
    const { repository, context, clearAll } = setup();
    await repository.retain(command);
    context.revision.set(2);
    expect(await repository.readPending('user', 'org')).toEqual([]);
    expect(clearAll).toHaveBeenCalled();
    const fresh = { ...command, input: { ...command.input, clientOperationId: 'new-session' } };
    await repository.retain(fresh, 2);
    expect(await repository.readPending('user', 'org')).toEqual([fresh]);
  });

  it('blocks private reads and new commands until a failed session purge succeeds', async () => {
    const { repository, context, entries, clearAll, getAll, put } = setup();
    await repository.retain(command);
    put.mockClear();
    getAll.mockClear();
    clearAll.mockRejectedValue(new DOMException('Clear blocked', 'AbortError'));
    context.revision.set(2);
    await expect(repository.readPending('user', 'org')).rejects.toThrow('Clear blocked');
    await expect(
      repository.retain({ ...command, input: { clientOperationId: 'fresh' } }, 2),
    ).rejects.toThrow('Clear blocked');
    expect(getAll).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(entries.get('commands:stable-uuid')).toEqual(command);
    clearAll.mockImplementation(async () => {
      entries.clear();
    });
    expect(await repository.readPending('user', 'org')).toEqual([]);
    expect(entries.has('commands:stable-uuid')).toBe(false);
  });

  it('propagates storage failure before claiming durable acceptance', async () => {
    const { repository, entries, put } = setup();
    put.mockImplementation(async (store, key, value) => {
      if (store === 'commands') throw new DOMException('Quota', 'QuotaExceededError');
      entries.set(`${store}:${key}`, value);
    });
    await expect(repository.retain(command)).rejects.toMatchObject({ name: 'QuotaExceededError' });
    expect(entries.has('commands:stable-uuid')).toBe(false);
  });

  it('never opens the journal during SSR', async () => {
    const { repository, get, getAll, put, clearAll } = setup(undefined, 'server');
    expect(await repository.readPending('user', 'org')).toEqual([]);
    await expect(repository.retain(command)).rejects.toThrow('ownership changed');
    expect(get).not.toHaveBeenCalled();
    expect(getAll).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(clearAll).not.toHaveBeenCalled();
  });
});
