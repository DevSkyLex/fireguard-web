import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import {
  ConversationService,
  MessageService,
} from '@features/organization/features/collaboration/data-access';
import type {
  ChannelOutput,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import {
  channelsStoreEvents,
  ChannelParticipantsStore,
  ChannelsStore,
  MessageThreadStore,
  PinnedMessagesStore,
  pinnedMessagesStoreEvents,
} from '@features/organization/features/collaboration/state';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { ChannelConversationPage } from '../channel-conversation-page.component';

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
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-02T00:00:00+00:00',
    isFavorite: false,
    ...overrides,
  } as ChannelOutput;
}

describe('ChannelConversationPage', () => {
  let fixture: ComponentFixture<ChannelConversationPage>;
  let thread: {
    reset: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    loadOlder: ReturnType<typeof vi.fn>;
    retryFailed: ReturnType<typeof vi.fn>;
    toggleReaction: ReturnType<typeof vi.fn>;
    sortedMessages: ReturnType<typeof vi.fn>;
    pendingMessageIds: ReturnType<typeof vi.fn>;
    failedMessageIds: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isPosting: ReturnType<typeof vi.fn>;
    hasMore: ReturnType<typeof vi.fn>;
    loadError: ReturnType<typeof vi.fn>;
    isInteracting: ReturnType<typeof vi.fn>;
    messageEntityMap: ReturnType<typeof vi.fn>;
    noteReplyPosted: ReturnType<typeof vi.fn>;
    noteUnpinned: ReturnType<typeof vi.fn>;
    pin: ReturnType<typeof vi.fn>;
    unpin: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    unsave: ReturnType<typeof vi.fn>;
    editMessage: ReturnType<typeof vi.fn>;
    deleteMessage: ReturnType<typeof vi.fn>;
    editCallState: ReturnType<typeof signal>;
    deleteCallState: ReturnType<typeof signal>;
  };
  let channelEntityMap: WritableSignal<Readonly<Record<string, ChannelOutput>>>;
  let channelsLoadOne: ReturnType<typeof vi.fn>;
  let channelsUpdate: ReturnType<typeof vi.fn>;
  let channelsRemove: ReturnType<typeof vi.fn>;
  let channelsSetParent: ReturnType<typeof vi.fn>;
  let channelsMutationCallState: WritableSignal<CallState>;
  let channelsIsMutating: Signal<boolean>;
  let channelsMutationError: Signal<StoreError | null>;
  let participants: WritableSignal<
    readonly { memberId: string; role?: string; source: string; addedAt: string }[]
  >;
  let participantsLoad: ReturnType<typeof vi.fn>;
  let participantsReset: ReturnType<typeof vi.fn>;
  let participantsAdd: ReturnType<typeof vi.fn>;
  let participantsRemove: ReturnType<typeof vi.fn>;
  let favorite: ReturnType<typeof vi.fn>;
  let unfavorite: ReturnType<typeof vi.fn>;
  let directoryAvailable: WritableSignal<boolean>;
  let directoryEntries: WritableSignal<ReadonlyMap<string, MemberDirectoryEntry>>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let navigate: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  /**
   * Builds the page with `MessageThreadStore` and `ChannelParticipantsStore`
   * swapped for stubs — both are provided by this page itself, so a plain
   * module-level override would not reach them (the same reason
   * `DirectConversationPage`'s spec overrides `MessageThreadStore`).
   */
  async function createPage(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: ChannelsStore,
          useValue: {
            channelEntityMap,
            rootChannels: (): readonly ChannelOutput[] =>
              Object.values(channelEntityMap()).filter((c) => c.parent === undefined),
            loadOne: channelsLoadOne,
            update: channelsUpdate,
            remove: channelsRemove,
            setParent: channelsSetParent,
            mutationCallState: channelsMutationCallState,
            isMutating: channelsIsMutating,
            mutationError: channelsMutationError,
          },
        },
        { provide: ConversationService, useValue: { favorite, unfavorite } },
        {
          provide: MessageService,
          useValue: { listReplies: vi.fn(), postReply: vi.fn(), listPinned: vi.fn() },
        },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: directoryEntries,
            isAvailable: directoryAvailable,
            isLoading: signal(false),
            ensureLoaded: vi.fn(),
            displayNameFor: (value: string): string => value,
          },
        },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            profile: signal({ id: 'member-1', organizationId: 'org-1' }),
            roles: signal([]),
            permissions,
            isLoadingAccess: signal(false),
            accessError: signal(null),
          },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal('org-1'),
            selectedOrganization: signal(null),
            isLoadingOrganization: signal(false),
          },
        },
      ],
    });

    TestBed.overrideComponent(ChannelConversationPage, {
      remove: { providers: [MessageThreadStore, ChannelParticipantsStore, PinnedMessagesStore] },
      add: {
        providers: [
          { provide: MessageThreadStore, useValue: thread },
          {
            provide: PinnedMessagesStore,
            useValue: {
              reset: vi.fn(),
              load: vi.fn(),
              unpin: vi.fn(),
              sortedPins: signal([]),
              isLoading: signal(false),
              isUnpinning: signal(false),
              loadError: signal(null),
            },
          },
          {
            provide: ChannelParticipantsStore,
            useValue: {
              participants,
              isLoading: signal(false),
              isMutating: signal(false),
              load: participantsLoad,
              reset: participantsReset,
              add: participantsAdd,
              remove: participantsRemove,
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;

    fixture = TestBed.createComponent(ChannelConversationPage);
    fixture.componentRef.setInput('channelId', 'channel-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    channelEntityMap = signal<Readonly<Record<string, ChannelOutput>>>({
      'channel-1': channel(),
    });
    channelsLoadOne = vi.fn();
    channelsUpdate = vi.fn();
    channelsRemove = vi.fn();
    channelsSetParent = vi.fn();
    channelsMutationCallState = signal<CallState>(idleCallState());
    channelsIsMutating = computed(() => channelsMutationCallState().status === 'pending');
    channelsMutationError = computed(() => channelsMutationCallState().error);
    participants = signal([]);
    participantsLoad = vi.fn();
    participantsReset = vi.fn();
    participantsAdd = vi.fn();
    participantsRemove = vi.fn();
    favorite = vi.fn().mockReturnValue(of(channel({ isFavorite: true })));
    unfavorite = vi.fn().mockReturnValue(of(undefined));
    directoryAvailable = signal<boolean>(true);
    directoryEntries = signal<ReadonlyMap<string, MemberDirectoryEntry>>(new Map());
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.MESSAGING_WRITE,
      ORGANIZATION_PERMISSION.MESSAGING_MANAGE,
    ]);
    thread = {
      reset: vi.fn(),
      load: vi.fn(),
      connect: vi.fn(),
      markRead: vi.fn(),
      send: vi.fn(),
      loadOlder: vi.fn(),
      retryFailed: vi.fn(),
      toggleReaction: vi.fn(),
      sortedMessages: vi.fn(() => []),
      pendingMessageIds: vi.fn(() => []),
      failedMessageIds: vi.fn(() => []),
      isLoading: vi.fn(() => false),
      isPosting: vi.fn(() => false),
      hasMore: vi.fn(() => false),
      loadError: vi.fn(() => null),
      isInteracting: vi.fn(() => false),
      messageEntityMap: vi.fn(() => ({})),
      noteReplyPosted: vi.fn(),
      noteUnpinned: vi.fn(),
      pin: vi.fn(),
      unpin: vi.fn(),
      save: vi.fn(),
      unsave: vi.fn(),
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
      editCallState: signal(idleCallState()),
      deleteCallState: signal(idleCallState()),
    };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('should reset then load the routed channel across every collaborator', async () => {
    await createPage();

    expect(thread.reset).toHaveBeenCalled();
    expect(thread.load).toHaveBeenCalledWith('channel-1');
    expect(thread.connect).toHaveBeenCalledWith('channel-1');
    expect(thread.markRead).toHaveBeenCalledWith({ conversationId: 'channel-1' });
    expect(channelsLoadOne).toHaveBeenCalledWith('channel-1');
    expect(participantsReset).toHaveBeenCalled();
    expect(participantsLoad).toHaveBeenCalledWith('channel-1');
  });

  it('should re-run the whole sequence when the router reuses this page for another channel', async () => {
    await createPage();
    fixture.componentRef.setInput('channelId', 'channel-2');
    await fixture.whenStable();

    expect(thread.reset).toHaveBeenCalledTimes(2);
    expect(thread.load).toHaveBeenLastCalledWith('channel-2');
    expect(participantsReset).toHaveBeenCalledTimes(2);
    expect(participantsLoad).toHaveBeenLastCalledWith('channel-2');
  });

  it('should name the channel once resolved, and fall back before it is', async () => {
    channelEntityMap.set({});
    await createPage();
    expect(byTestId('channel-conversation-name')?.textContent?.trim()).toBe('Channel');

    channelEntityMap.set({ 'channel-1': channel({ name: 'Renamed' }) });
    await fixture.whenStable();

    expect(byTestId('channel-conversation-name')?.textContent?.trim()).toBe('#Renamed');
  });

  it('should favorite an unfavorited channel and refresh the shared entity on success', async () => {
    await createPage();

    byTestId('channel-conversation-favorite')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(favorite).toHaveBeenCalledWith('channel-1');
    expect(unfavorite).not.toHaveBeenCalled();
    expect(channelsLoadOne).toHaveBeenCalledWith('channel-1');
  });

  it('should unfavorite an already-favorited channel', async () => {
    channelEntityMap.set({ 'channel-1': channel({ isFavorite: true }) });
    await createPage();

    byTestId('channel-conversation-favorite')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(unfavorite).toHaveBeenCalledWith('channel-1');
    expect(favorite).not.toHaveBeenCalled();
  });

  it('should open the participants sheet from the header count control', async () => {
    await createPage();

    expect(fixture.componentInstance['participantsSheetVisible']()).toBe(false);

    byTestId('channel-conversation-participants-count')?.dispatchEvent(
      new Event('click', { bubbles: true }),
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['participantsSheetVisible']()).toBe(true);
  });

  it('should gate the actions-menu Rename/Delete entries on messaging.manage', async () => {
    await createPage();

    expect(fixture.componentInstance['canManage']()).toBe(true);

    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_WRITE]);
    await fixture.whenStable();

    expect(fixture.componentInstance['canManage']()).toBe(false); // Gates the overlay-rendered menu entries.
  });

  it('should send only what actually changed on edit', async () => {
    await createPage();

    fixture.componentInstance['submitEdit']({ name: 'Bâtiment Nord', parentChannelId: null });
    expect(channelsUpdate).not.toHaveBeenCalled();
    expect(channelsSetParent).not.toHaveBeenCalled();

    fixture.componentInstance['submitEdit']({ name: 'Renamed', parentChannelId: null });
    expect(channelsUpdate).toHaveBeenCalledWith({
      channelId: 'channel-1',
      input: { name: 'Renamed' },
    });
    expect(channelsSetParent).not.toHaveBeenCalled();

    fixture.componentInstance['submitEdit']({ name: 'Renamed', parentChannelId: 'root-9' });
    expect(channelsSetParent).toHaveBeenCalledWith({
      channelId: 'channel-1',
      input: { parentChannelId: 'root-9' },
    });
  });

  it('should delete the open channel on confirm', async () => {
    await createPage();

    fixture.componentInstance['requestDelete']();
    await fixture.whenStable();
    expect(fixture.componentInstance['deletePending']()).toBe(true);

    fixture.componentInstance['confirmDelete']();

    expect(channelsRemove).toHaveBeenCalledWith('channel-1');
  });

  it('should busy-disable the delete confirmation while the confirmed write is in flight', async () => {
    await createPage();

    fixture.componentInstance['requestDelete']();
    expect(fixture.componentInstance['deleteDialogBusy']()).toBe(false);

    fixture.componentInstance['confirmDelete']();
    channelsMutationCallState.set({ status: 'pending', data: null, error: null });
    await fixture.whenStable();

    expect(fixture.componentInstance['deleteDialogBusy']()).toBe(true);
  });

  it('should surface the delete write error inline without attributing an unrelated mutation failure', async () => {
    await createPage();

    channelsMutationCallState.set(errorCallState(toStoreError(new Error('stale'))));
    await fixture.whenStable();
    expect(fixture.componentInstance['deleteDialogError']()).toBeNull();

    fixture.componentInstance['requestDelete']();
    fixture.componentInstance['confirmDelete']();
    channelsMutationCallState.set(errorCallState(toStoreError(new Error('channel is not empty'))));
    await fixture.whenStable();

    expect(fixture.componentInstance['deleteDialogError']()).not.toBeNull();
    expect(fixture.componentInstance['deleteDialogBusy']()).toBe(false);
  });

  it('should navigate back to the channel list once this exact channel reports deleted', async () => {
    await createPage();

    TestBed.inject(Dispatcher).dispatch(channelsStoreEvents.deleted('channel-2'));
    expect(navigate).not.toHaveBeenCalled();

    TestBed.inject(Dispatcher).dispatch(channelsStoreEvents.deleted('channel-1'));

    expect(navigate).toHaveBeenCalledWith(['..'], {
      relativeTo: TestBed.inject(ActivatedRoute),
    });
  });

  it('should add and remove a participant scoped to the routed channel', async () => {
    await createPage();

    fixture.componentInstance['addParticipant']('member-9');
    expect(participantsAdd).toHaveBeenCalledWith({
      channelId: 'channel-1',
      input: { memberId: 'member-9' },
    });

    fixture.componentInstance['removeParticipant']('member-9');
    expect(participantsRemove).toHaveBeenCalledWith({
      channelId: 'channel-1',
      memberId: 'member-9',
    });
  });

  it('should let the composer write when messaging writes are granted', async () => {
    await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="message-composer-input"]'),
    ).not.toBeNull();
  });

  it('should hold the composer back on read-only access', async () => {
    permissions.set([]);
    await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="message-composer-read-only"]'),
    ).not.toBeNull();
  });
  it('limits header avatars to three while keeping the full roster available', async () => {
    participants.set(
      Array.from({ length: 5 }, (_, index) => ({
        memberId: 'member-' + index,
        source: 'direct',
        addedAt: '2026-01-01',
      })),
    );
    channelEntityMap.set({ 'channel-1': channel({ participantCount: 5 }) });
    await createPage();
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="channel-header-avatar"]'),
    ).toHaveLength(3);
    expect(byTestId('channel-conversation-participants-count')?.textContent).toContain('+2');
    expect(
      byTestId('channel-conversation-participants-count')?.getAttribute('aria-label'),
    ).toContain('5');
  });

  it('sends messages and reactions to the routed thread and marks read only while visible', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['send']('Check the north entrance');
    page['toggleReaction']({ messageId: 'message-1', emoji: '👍' });
    expect(thread.send).toHaveBeenCalledExactlyOnceWith({
      conversationId: 'channel-1',
      input: { body: 'Check the north entrance' },
    });
    expect(thread.toggleReaction).toHaveBeenCalledExactlyOnceWith('message-1', '👍');
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    thread.markRead.mockClear();
    visibility.mockReturnValue('hidden');
    page['markRead']();
    expect(thread.markRead).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    page['markRead']();
    expect(thread.markRead).toHaveBeenCalledExactlyOnceWith({ conversationId: 'channel-1' });
  });

  it('chooses pin and bookmark commands from the existing message state', async () => {
    const message: MessageOutput = {
      '@id': '/api/messages/message-1',
      '@type': 'Message',
      id: 'message-1',
      conversation: '/api/conversations/channel-1',
      authorMember: '/api/organizations/org-1/members/member-1',
      body: 'Inspection complete',
      mentions: [],
      mentionNames: {},
      isDeleted: false,
      attachments: [],
      reactions: [],
      isSaved: false,
      replyCount: 0,
      references: [],
      createdAt: '2026-09-22T10:00:00Z',
      updatedAt: '2026-09-22T10:00:00Z',
    };
    await createPage();
    const page = fixture.componentInstance;
    page['togglePin']('missing');
    page['toggleSave']('missing');
    expect(thread.pin).not.toHaveBeenCalled();
    expect(thread.save).not.toHaveBeenCalled();
    thread.messageEntityMap.mockReturnValue({ [message.id]: message });
    page['togglePin'](message.id);
    page['toggleSave'](message.id);
    expect(thread.pin).toHaveBeenCalledExactlyOnceWith(message.id);
    expect(thread.save).toHaveBeenCalledExactlyOnceWith(message.id);
    thread.messageEntityMap.mockReturnValue({
      [message.id]: { ...message, isSaved: true, pinnedAt: '2026-09-22T10:01:00Z' },
    });
    page['togglePin'](message.id);
    page['toggleSave'](message.id);
    expect(thread.unpin).toHaveBeenCalledExactlyOnceWith(message.id);
    expect(thread.unsave).toHaveBeenCalledExactlyOnceWith(message.id);
  });

  it('keeps message mutations open through failure and closes each target only on success', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['submitMessageEdit']('no target');
    page['confirmMessageDelete']();
    expect(thread.editMessage).not.toHaveBeenCalled();
    expect(thread.deleteMessage).not.toHaveBeenCalled();
    page['editTargetId'].set('message-1');
    page['submitMessageEdit']('Updated body');
    thread.editCallState.set(pendingCallState());
    await fixture.whenStable();
    expect(page['messageEditBusy']()).toBe(true);
    expect(thread.editMessage).toHaveBeenCalledExactlyOnceWith({
      messageId: 'message-1',
      input: { body: 'Updated body' },
    });
    thread.editCallState.set(errorCallState(toStoreError(new Error('Conflict'))));
    await fixture.whenStable();
    expect(page['editTargetId']()).toBe('message-1');
    expect(page['messageEditError']()?.message).toBe('Conflict');
    thread.editCallState.set(successCallState(null));
    await fixture.whenStable();
    expect(page['editTargetId']()).toBeNull();
    page['messageDeleteTargetId'].set('message-2');
    page['confirmMessageDelete']();
    thread.deleteCallState.set(pendingCallState());
    await fixture.whenStable();
    expect(page['messageDeleteBusy']()).toBe(true);
    expect(thread.deleteMessage).toHaveBeenCalledExactlyOnceWith('message-2');
    thread.deleteCallState.set(successCallState(null));
    await fixture.whenStable();
    expect(page['messageDeleteTargetId']()).toBeNull();
  });

  it('resets dismissed message and channel overlays without submitting a mutation', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['editTargetId'].set('message-1');
    page['messageDeleteTargetId'].set('message-1');
    page['replyTargetId'].set('message-1');
    page['onMessageEditDialogVisibleChange'](true);
    page['onMessageDeleteDialogVisibleChange'](true);
    page['onReplySheetVisibleChange'](true);
    expect(page['editTargetId']()).toBe('message-1');
    expect(page['messageDeleteTargetId']()).toBe('message-1');
    expect(page['replyTargetId']()).toBe('message-1');
    page['onMessageEditDialogVisibleChange'](false);
    page['onMessageDeleteDialogVisibleChange'](false);
    page['onReplySheetVisibleChange'](false);
    page['requestDelete']();
    page['onDeleteDialogStateChanged']('open');
    expect(page['deletePending']()).toBe(true);
    page['onDeleteDialogStateChanged']('closed');
    expect(page['deletePending']()).toBe(false);
    expect(page['editTargetId']()).toBeNull();
    expect(page['messageDeleteTargetId']()).toBeNull();
    expect(page['replyTargetId']()).toBeNull();
    expect(thread.editMessage).not.toHaveBeenCalled();
    expect(thread.deleteMessage).not.toHaveBeenCalled();
    expect(channelsRemove).not.toHaveBeenCalled();
  });

  it('loads pins when channel information opens and forwards successful unpins to the thread', async () => {
    await createPage();
    const pins = fixture.debugElement.injector.get(PinnedMessagesStore);
    expect(pins.load).not.toHaveBeenCalled();
    fixture.componentInstance['infoSheetVisible'].set(true);
    await fixture.whenStable();
    expect(pins.load).toHaveBeenCalledExactlyOnceWith('channel-1');
    fixture.componentInstance['unpinFromSheet']('message-1');
    expect(pins.unpin).toHaveBeenCalledExactlyOnceWith('message-1');
    TestBed.inject(Dispatcher).dispatch(pinnedMessagesStoreEvents.unpinned('message-1'));
    expect(thread.noteUnpinned).toHaveBeenCalledExactlyOnceWith('message-1');
  });

  it('offers only active nonparticipants in name order and preserves an unchanged parent', async () => {
    const entries: MemberDirectoryEntry[] = [
      { memberId: 'z', displayName: 'Zoe', roleNames: [], isActive: true },
      { memberId: 'a', displayName: 'Anna', roleNames: [], isActive: true },
      { memberId: 'existing', displayName: 'Existing', roleNames: [], isActive: true },
      { memberId: 'inactive', displayName: 'Inactive', roleNames: [], isActive: false },
    ];
    directoryEntries.set(new Map(entries.map((entry) => [entry.memberId, entry])));
    participants.set([{ memberId: 'existing', source: 'direct', addedAt: '2026-09-22' }]);
    channelEntityMap.set({ 'channel-1': channel({ parent: '/api/channels/parent-1' }) });
    await createPage();
    const page = fixture.componentInstance;
    expect(page['addableMembers']().map((entry) => entry.memberId)).toEqual(['a', 'z']);
    page['submitEdit']({ name: 'Bâtiment Nord', parentChannelId: 'parent-1' });
    expect(channelsSetParent).not.toHaveBeenCalled();
  });

  it('releases a failed favorite request so the operator can retry', async () => {
    const request = new Subject<ChannelOutput>();
    favorite.mockReturnValueOnce(request);
    await createPage();
    const page = fixture.componentInstance;
    channelsLoadOne.mockClear();
    page['toggleFavorite']();
    page['toggleFavorite']();
    expect(favorite).toHaveBeenCalledTimes(1);
    expect(page['favoritePending']()).toBe(true);
    request.error(new Error('Unavailable'));
    expect(page['favoritePending']()).toBe(false);
    expect(channelsLoadOne).not.toHaveBeenCalled();
    page['toggleFavorite']();
    expect(favorite).toHaveBeenCalledTimes(2);
    expect(channelsLoadOne).toHaveBeenCalledExactlyOnceWith('channel-1');
  });
});
