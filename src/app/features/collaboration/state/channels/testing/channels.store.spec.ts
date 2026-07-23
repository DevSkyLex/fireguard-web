import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ChannelService } from '@features/collaboration/data-access';
import type { ChannelOutput, ListChannelsQuery } from '@features/collaboration/models';
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

function collection(member: readonly ChannelOutput[]): HydraCollection<ChannelOutput> {
  return {
    '@id': '/api/channels',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<ChannelOutput>;
}

describe('ChannelsStore', () => {
  let service: {
    list: ReturnType<typeof vi.fn>;
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
      list: vi.fn(),
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
    // `@id` is a Skolem genid the API mints afresh on every response, so two
    // payloads for the same channel differ there while `id` stays stable.
    service.list.mockReturnValue(of(collection([channel({ '@id': '/.well-known/genid/aaaa' })])));

    const store = createStore();
    store.load(query);

    expect(store.channelIds()).toEqual(['channel-1']);

    service.list.mockReturnValue(
      of(collection([channel({ '@id': '/.well-known/genid/bbbb', name: 'Renamed' })])),
    );
    store.load(query);

    expect(store.channelIds()).toEqual(['channel-1']);
    expect(store.channelEntityMap()['channel-1'].name).toBe('Renamed');
  });

  it('should record the server total rather than the row count', () => {
    // itemsPerPage is clamped server-side, so member.length is not the total.
    const page = collection([channel()]);
    service.list.mockReturnValue(of({ ...page, totalItems: 87 }));

    const store = createStore();
    store.load(query);

    expect(store.total()).toBe(87);
  });

  it('should treat an absent archive filter as a third state, not false', () => {
    service.list.mockReturnValue(of(collection([])));

    const store = createStore();
    store.load(query);

    // `null` means the filter was never sent — archived and unarchived alike.
    expect(store.includeArchived()).toBeNull();

    store.load({ ...query, isArchived: false });

    expect(store.includeArchived()).toBe(false);
  });

  it('should not let a write response clobber derived fields', () => {
    service.list.mockReturnValue(of(collection([channel({ unreadCount: 7, isFavorite: true })])));
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
    service.list.mockReturnValue(of(collection([channel(), channel({ id: 'channel-2' })])));
    service.remove.mockReturnValue(of(undefined));

    const store = createStore();
    store.load(query);
    store.remove('channel-1');

    expect(store.channelIds()).toEqual(['channel-2']);
    expect(store.total()).toBe(1);
  });

  it('should expose an unread total for the navigation badge', () => {
    service.list.mockReturnValue(
      of(collection([channel({ unreadCount: 3 }), channel({ id: 'channel-2', unreadCount: 4 })])),
    );

    const store = createStore();
    store.load(query);

    expect(store.unreadTotal()).toBe(7);
  });

  it('should separate root channels from nested ones', () => {
    service.list.mockReturnValue(
      of(collection([channel(), channel({ id: 'channel-2', parent: '/api/channels/channel-1' })])),
    );

    const store = createStore();
    store.load(query);

    expect(store.rootChannels().map((c: ChannelOutput) => c.id)).toEqual(['channel-1']);
  });

  it('should record a load failure without dropping cached rows', () => {
    service.list.mockReturnValueOnce(of(collection([channel()])));

    const store = createStore();
    store.load(query);

    service.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.load(query);

    expect(store.loadError()).not.toBeNull();
    expect(store.channelEntities()).toHaveLength(1);
  });

  it('should clear a channel unread badge when its conversation is marked read', () => {
    service.list.mockReturnValue(
      of(collection([channel({ unreadCount: 5 }), channel({ id: 'channel-2', unreadCount: 4 })])),
    );

    const store = createStore();
    store.load(query);
    // A channel id is its conversation id.
    TestBed.inject(Dispatcher).dispatch(messageThreadStoreEvents.conversationRead('channel-1'));

    expect(store.channelEntityMap()['channel-1'].unreadCount).toBe(0);
    // Only the read channel's badge clears.
    expect(store.channelEntityMap()['channel-2'].unreadCount).toBe(4);
  });

  it('should keep hierarchy failures on their own call state', () => {
    service.list.mockReturnValue(of(collection([channel()])));
    service.setParent.mockReturnValue(throwError(() => new Error('cycle')));

    const store = createStore();
    store.load(query);
    store.setParent({ channelId: 'channel-1', input: { parentChannelId: 'channel-2' } });

    // A 409 here means "that move would make a cycle" — worth wording apart
    // from a generic mutation failure.
    expect(store.isReorganizing()).toBe(false);
    expect(store.mutationError()).toBeNull();
  });
});
