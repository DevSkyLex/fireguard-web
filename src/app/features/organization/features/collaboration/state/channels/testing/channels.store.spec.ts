import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { ChannelService } from '@features/organization/features/collaboration/data-access';
import type {
  ChannelOutput,
  ListChannelsQuery,
} from '@features/organization/features/collaboration/models';
import { messageThreadStoreEvents } from '../../message-thread/events';
import { ChannelsStore, type ChannelsStoreType } from '../channels.store';

function channel(overrides: Partial<ChannelOutput> = {}): ChannelOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ChannelOutput',
    id: 'channel-1',
    organization: '/api/organizations/org-1',
    name: 'Bâtiment Nord',
    participantCount: 4,
    isArchived: false,
    messagesCount: 12,
    unreadCount: 3,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-02T00:00:00+00:00',
    isFavorite: true,
    ...overrides,
  };
}

/** Stubs the already-drained `listAll` — the store never sees a raw page. */
function stubListAll(channels: readonly ChannelOutput[]): ReturnType<typeof vi.fn> {
  return vi.fn().mockReturnValue(of(channels));
}

describe('ChannelsStore', () => {
  let service: {
    listAll: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    setParent: ReturnType<typeof vi.fn>;
  };

  function createStore(): ChannelsStoreType {
    TestBed.configureTestingModule({
      providers: [ChannelsStore, { provide: ChannelService, useValue: service }],
    });

    return TestBed.inject(ChannelsStore);
  }

  const query: ListChannelsQuery = { organization: '/api/organizations/org-1' };

  beforeEach(() => {
    service = {
      listAll: stubListAll([]),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      setParent: vi.fn(),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should start idle and empty', () => {
    const store = createStore();

    expect(store.channelEntities()).toHaveLength(0);
    expect(store.isLoading()).toBe(false);
    expect(store.total()).toBe(0);
  });

  it('should key rows off the scalar id, not the regenerated @id', () => {
    // `@id` is a Skolem genid the API mints afresh on every response — `id` stays stable.
    service.listAll = stubListAll([channel({ '@id': '/.well-known/genid/aaaa' })]);

    const store = createStore();
    store.load(query);

    expect(store.channelIds()).toEqual(['channel-1']);

    service.listAll = stubListAll([channel({ '@id': '/.well-known/genid/bbbb', name: 'Renamed' })]);
    store.load(query);

    expect(store.channelIds()).toEqual(['channel-1']);
    expect(store.channelEntityMap()['channel-1'].name).toBe('Renamed');
  });

  it('should drain a two-page collection into 31 entities and reflect that in total', () => {
    // The page walk itself lives in ChannelService.listAll (specced there).
    const channels = Array.from({ length: 31 }, (_unused, index) =>
      channel({ id: `channel-${index + 1}` }),
    );
    service.listAll = stubListAll(channels);

    const store = createStore();
    store.load(query);

    expect(store.channelEntities()).toHaveLength(31);
    expect(store.total()).toBe(31);
  });

  it('should treat an absent archive filter as a third state, not false', () => {
    service.listAll = stubListAll([]);

    const store = createStore();
    store.load(query);

    // `null` means the filter was never sent — archived and unarchived alike.
    expect(store.includeArchived()).toBeNull();

    store.load({ ...query, isArchived: false });

    expect(store.includeArchived()).toBe(false);
  });

  it('should not let a write response clobber derived fields', () => {
    service.listAll = stubListAll([channel({ unreadCount: 7, isFavorite: true })]);
    // Every channel write answers with fabricated derived fields.
    service.update.mockReturnValue(
      of(channel({ name: 'Renamed', unreadCount: 0, isFavorite: false })),
    );

    const store = createStore();
    store.load(query);
    store.update({ channelId: 'channel-1', input: { name: 'Renamed' } });

    const updated = store.channelEntityMap()['channel-1'];

    expect(updated.name).toBe('Renamed');
    expect(updated.unreadCount).toBe(7);
    expect(updated.isFavorite).toBe(true);
  });

  it('should drop the row locally on delete, since 204 carries no body', () => {
    service.listAll = stubListAll([channel(), channel({ id: 'channel-2' })]);
    service.remove.mockReturnValue(of(undefined));

    const store = createStore();
    store.load(query);
    store.remove('channel-1');

    expect(store.channelIds()).toEqual(['channel-2']);
    expect(store.total()).toBe(1);
  });

  it('should expose an unread total for the navigation badge', () => {
    service.listAll = stubListAll([
      channel({ unreadCount: 3 }),
      channel({ id: 'channel-2', unreadCount: 4 }),
    ]);

    const store = createStore();
    store.load(query);

    expect(store.unreadTotal()).toBe(7);
  });

  it('should separate root channels from nested ones', () => {
    service.listAll = stubListAll([
      channel(),
      channel({ id: 'channel-2', parent: '/api/channels/channel-1' }),
    ]);

    const store = createStore();
    store.load(query);

    expect(store.rootChannels().map((c: ChannelOutput) => c.id)).toEqual(['channel-1']);
  });

  it('should record a load failure without dropping cached rows', () => {
    service.listAll = vi.fn().mockReturnValueOnce(of([channel()]));

    const store = createStore();
    store.load(query);

    service.listAll.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.load(query);

    expect(store.loadError()).not.toBeNull();
    expect(store.channelEntities()).toHaveLength(1);
  });

  it('should clear a channel unread badge when its conversation is marked read', () => {
    service.listAll = stubListAll([
      channel({ unreadCount: 5 }),
      channel({ id: 'channel-2', unreadCount: 4 }),
    ]);

    const store = createStore();
    store.load(query);
    // A channel id is its conversation id.
    TestBed.inject(Dispatcher).dispatch(messageThreadStoreEvents.conversationRead('channel-1'));

    expect(store.channelEntityMap()['channel-1'].unreadCount).toBe(0);
    // Only the read channel's badge clears.
    expect(store.channelEntityMap()['channel-2'].unreadCount).toBe(4);
  });

  it('should show channel detail while the sidebar list is still loading and retain it when the list arrives', () => {
    const list = new Subject<readonly ChannelOutput[]>();
    service.listAll.mockReturnValue(list);
    service.get.mockReturnValue(of(channel({ unreadCount: 7 })));
    const store = createStore();
    store.load(query);
    store.loadOne('channel-1');
    expect(store.channelEntityMap()['channel-1'].unreadCount).toBe(7);
    TestBed.inject(Dispatcher).dispatch(messageThreadStoreEvents.conversationRead('channel-1'));
    list.next([channel({ unreadCount: 3 })]);
    expect(store.channelEntityMap()['channel-1'].unreadCount).toBe(0);
    expect(store.total()).toBe(1);
  });

  it('should clear the previous organization and ignore its delayed detail response', () => {
    const detail = new Subject<ChannelOutput>();
    service.listAll.mockReturnValue(of([channel()]));
    service.get.mockReturnValue(detail);
    const store = createStore();
    store.load(query);
    store.loadOne('channel-1');
    service.listAll.mockReturnValue(new Subject<readonly ChannelOutput[]>());
    store.load({ organization: '/api/organizations/org-2' });
    expect(store.channelEntities()).toEqual([]);
    expect(store.total()).toBe(0);
    detail.next(channel());
    expect(store.channelEntities()).toEqual([]);
  });

  it('should insert a newly created channel into the shared sidebar list', () => {
    service.listAll.mockReturnValue(of([]));
    service.create.mockReturnValue(of(channel({ id: 'created' })));
    const store = createStore();
    store.load(query);
    store.create({ organization: 'org-1', name: 'Safety' });
    expect(store.channelIds()).toEqual(['created']);
    expect(store.total()).toBe(1);
  });

  it('should not add a late creation to a different organization', () => {
    const response = new Subject<ChannelOutput>();
    service.listAll.mockReturnValue(of([]));
    service.create.mockReturnValue(response);
    const store = createStore();
    store.load(query);
    store.create({ organization: 'org-1', name: 'Safety' });
    store.load({ organization: 'org-2' });
    response.next(channel({ id: 'created' }));
    expect(store.channelEntities()).toEqual([]);
    expect(store.total()).toBe(0);
  });

  it('should not restore a removed channel when an earlier list request completes', () => {
    service.listAll.mockReturnValueOnce(of([channel()]));
    service.remove.mockReturnValue(of(undefined));
    const store = createStore();
    store.load(query);
    const list = new Subject<readonly ChannelOutput[]>();
    service.listAll.mockReturnValue(list);
    store.load(query);
    store.remove('channel-1');
    list.next([channel()]);
    expect(store.channelEntities()).toEqual([]);
    expect(store.total()).toBe(0);
  });

  it('should keep hierarchy failures on their own call state', () => {
    service.listAll = stubListAll([channel()]);
    service.setParent.mockReturnValue(throwError(() => new Error('cycle')));

    const store = createStore();
    store.load(query);
    store.setParent({ channelId: 'channel-1', input: { parentChannelId: 'channel-2' } });

    // A 409 here means "that move would make a cycle" — worth wording apart
    // from a generic mutation failure.
    expect(store.isReorganizing()).toBe(false);
    expect(store.mutationError()).toBeNull();
    expect(store.channelEntityMap()['channel-1'].parent).toBeUndefined();
    expect(store.hierarchyCallState().error).not.toBeNull();
  });
  it('keeps an accepted hierarchy write alive and ignores overlapping commands', () => {
    const pending = new Subject<ChannelOutput>();
    service.listAll = stubListAll([channel()]);
    service.setParent.mockReturnValue(pending);
    const store = createStore();
    store.load(query);
    store.setParent({ channelId: 'channel-1', input: { parentChannelId: 'channel-2' } });
    store.setParent({ channelId: 'channel-1', input: { parentChannelId: null } });
    expect(service.setParent).toHaveBeenCalledTimes(1);
    expect(store.isReorganizing()).toBe(true);
    pending.next(channel({ parent: '/api/channels/channel-2', isFavorite: false }));
    pending.complete();
    expect(store.channelEntityMap()['channel-1'].parent).toBe('/api/channels/channel-2');
    expect(store.channelEntityMap()['channel-1'].isFavorite).toBe(true);
    expect(store.isReorganizing()).toBe(false);
  });

  it('ignores a hierarchy response after the organization changes', () => {
    const pending = new Subject<ChannelOutput>();
    service.listAll = stubListAll([channel()]);
    service.setParent.mockReturnValue(pending);
    const store = createStore();
    store.load(query);
    store.setParent({ channelId: 'channel-1', input: { parentChannelId: 'channel-2' } });
    service.listAll = stubListAll([
      channel({ id: 'other', organization: '/api/organizations/org-2' }),
    ]);
    store.load({ organization: 'org-2' });
    pending.next(channel({ parent: '/api/channels/channel-2' }));
    pending.complete();
    expect(store.channelIds()).toEqual(['other']);
    expect(store.isReorganizing()).toBe(false);
  });
});
