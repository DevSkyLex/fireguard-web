import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  ChannelService,
  ConversationService,
  MessageService,
} from '@features/collaboration/data-access';
import { ChannelPanelStore, type ChannelPanelStoreType } from '../channel-panel.store';

/**
 * Wraps rows in a Hydra envelope. Rows are deliberately partial — each test
 * states only the fields it asserts on — so the whole thing is cast once here
 * rather than every call site building a full DTO.
 */
function collection(member: readonly unknown[]): HydraCollection<never> {
  return {
    '@id': '/x',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as unknown as HydraCollection<never>;
}

/**
 * A router whose deepest route carries the two ids. `events` stays open so a
 * test can push a navigation.
 */
function routerStub(params: Record<string, string>, events: Subject<unknown>) {
  const leaf = {
    firstChild: null,
    snapshot: { paramMap: { get: (key: string): string | null => params[key] ?? null } },
  };

  return {
    events,
    routerState: { root: { firstChild: leaf, snapshot: { paramMap: { get: () => null } } } },
  };
}

describe('ChannelPanelStore', () => {
  let events: Subject<unknown>;
  let params: Record<string, string>;
  let channels: {
    get: ReturnType<typeof vi.fn>;
    listParticipants: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let conversations: {
    listActivity: ReturnType<typeof vi.fn>;
    listAttachments: ReturnType<typeof vi.fn>;
    listLinks: ReturnType<typeof vi.fn>;
  };
  let messages: { listPinned: ReturnType<typeof vi.fn> };

  function createStore(): ChannelPanelStoreType {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerStub(params, events) },
        { provide: ChannelService, useValue: channels },
        { provide: ConversationService, useValue: conversations },
        { provide: MessageService, useValue: messages },
      ],
    });

    const store: ChannelPanelStoreType = TestBed.inject(ChannelPanelStore);

    // The store opens the channel from an effect on the routed signal, so
    // nothing loads until effects run.
    TestBed.tick();

    return store;
  }

  beforeEach(() => {
    events = new Subject<unknown>();
    params = { organizationId: 'org-1', channelId: 'chan-1' };
    channels = {
      get: vi.fn().mockReturnValue(
        of({
          '@id': '/c/1',
          '@type': 'ChannelOutput',
          id: 'chan-1',
          organization: '/api/organizations/org-1',
          name: 'Bâtiment Nord',
          participantCount: 2,
          isArchived: false,
          messagesCount: 12,
          unreadCount: 3,
          createdAt: '2026-01-01T00:00:00+00:00',
          updatedAt: '2026-01-01T00:00:00+00:00',
          isFavorite: false,
        }),
      ),
      listParticipants: vi
        .fn()
        .mockReturnValue(of(collection([{ memberId: 'mem-1', source: 'manual', addedAt: 'x' }]))),
      list: vi.fn().mockReturnValue(of(collection([]))),
    };
    conversations = {
      listActivity: vi.fn().mockReturnValue(of(collection([{ bucket: '2026-07-20', count: 2 }]))),
      listAttachments: vi.fn().mockReturnValue(of(collection([{ id: 'f1' }]))),
      listLinks: vi.fn().mockReturnValue(of(collection([{ id: 'l1' }]))),
    };
    messages = { listPinned: vi.fn().mockReturnValue(of(collection([{ id: 'm1' }]))) };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should publish the routed channel read straight off the router', () => {
    const store = createStore();

    // Seeded from the current route, not from a navigation event — a direct
    // page load must not be missed.
    expect(store.channelId()).toBe('chan-1');
    expect(store.organizationId()).toBe('org-1');
  });

  it('should be inactive when the URL is not a conversation', () => {
    params = { organizationId: 'org-1' };

    expect(createStore().channelId()).toBeNull();
  });

  it('should load the info tab eagerly on open', () => {
    const store = createStore();

    expect(channels.get).toHaveBeenCalledWith('chan-1');
    expect(channels.listParticipants).toHaveBeenCalledWith('chan-1');
    expect(conversations.listActivity).toHaveBeenCalledWith('chan-1', { buckets: 26 });
    expect(store.channel()?.name).toBe('Bâtiment Nord');
    expect(store.participants()).toHaveLength(1);
    expect(store.activity()).toHaveLength(1);
  });

  it('should not fetch pins, files or links until their tab is opened', () => {
    const store = createStore();

    expect(messages.listPinned).not.toHaveBeenCalled();
    expect(conversations.listAttachments).not.toHaveBeenCalled();
    expect(conversations.listLinks).not.toHaveBeenCalled();

    store.setTab('files');

    expect(conversations.listAttachments).toHaveBeenCalledWith('chan-1');
    expect(store.files()).toHaveLength(1);
    expect(messages.listPinned).not.toHaveBeenCalled();
  });

  it('should fetch a tab only once', () => {
    const store = createStore();

    store.setTab('pins');
    store.setTab('info');
    store.setTab('pins');

    expect(messages.listPinned).toHaveBeenCalledTimes(1);
  });

  it('should reset the per-channel tabs when another channel is opened', () => {
    const store = createStore();
    store.setTab('links');
    expect(store.links()).toHaveLength(1);

    params = { organizationId: 'org-1', channelId: 'chan-2' };
    events.next({ constructor: { name: 'NavigationEnd' } });

    // The stub event is not a real NavigationEnd, so drive the transition
    // directly — what matters is the reset, not the router plumbing.
    store.open({ organizationId: 'org-1', channelId: 'chan-2' });

    expect(store.activeTab()).toBe('info');
    expect(store.links()).toHaveLength(0);
    expect(channels.get).toHaveBeenLastCalledWith('chan-2');
  });

  it('should not reload a channel it is already showing', () => {
    const store = createStore();

    store.open({ organizationId: 'org-1', channelId: 'chan-1' });

    expect(channels.get).toHaveBeenCalledTimes(1);
  });

  it('should not refetch the channel list when the organization has not changed', () => {
    const store = createStore();

    store.open({ organizationId: 'org-1', channelId: 'chan-2' });

    expect(channels.list).toHaveBeenCalledTimes(1);
  });

  it('should derive linked threads from the parent IRI', () => {
    channels.list.mockReturnValue(
      of(
        collection([
          { id: 'chan-2', name: 'child', parent: '/api/channels/chan-1' },
          { id: 'chan-3', name: 'other', parent: '/api/channels/chan-9' },
          { id: 'chan-4', name: 'root' },
        ]),
      ),
    );

    const store = createStore();

    expect(store.children().map((child) => child.id)).toEqual(['chan-2']);
  });

  it('should surface a failed info read without breaking the rest', () => {
    channels.get.mockReturnValue(throwError(() => new Error('nope')));

    const store = createStore();

    expect(store.channel()).toBeNull();
    expect(store.isChannelLoading()).toBe(false);
    expect(store.participants()).toHaveLength(1);
  });

  it('should retry the active tab', () => {
    const store = createStore();
    store.setTab('pins');

    store.retryTab();

    expect(messages.listPinned).toHaveBeenCalledTimes(2);
  });
});
