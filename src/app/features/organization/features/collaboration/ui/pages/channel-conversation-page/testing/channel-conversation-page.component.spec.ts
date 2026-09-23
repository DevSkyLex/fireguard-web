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
import { of, Subject, throwError } from 'rxjs';
import {
  provideInteractionCapabilities,
  INTERACTION_CAPABILITIES_PORT,
} from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
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
  const mobile = signal(false);
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
  let pinned: WritableSignal<readonly MessageOutput[]>;
  let pinnedLoad: ReturnType<typeof vi.fn>;
  let pinnedUnpin: ReturnType<typeof vi.fn>;
  let favorite: ReturnType<typeof vi.fn>;
  let unfavorite: ReturnType<typeof vi.fn>;
  let directoryAvailable: WritableSignal<boolean>;
  let directoryEntries: WritableSignal<ReadonlyMap<string, MemberDirectoryEntry>>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let memberProfile: WritableSignal<{ id: string; organizationId: string } | null>;
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
        provideInteractionCapabilities(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobile,
            mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
          },
        },
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
            profile: memberProfile,
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
              load: pinnedLoad,
              unpin: pinnedUnpin,
              sortedPins: pinned,
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
    mobile.set(false);
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
    pinned = signal<readonly MessageOutput[]>([]);
    pinnedLoad = vi.fn();
    pinnedUnpin = vi.fn();
    favorite = vi.fn().mockReturnValue(of(channel({ isFavorite: true })));
    unfavorite = vi.fn().mockReturnValue(of(undefined));
    directoryAvailable = signal<boolean>(true);
    directoryEntries = signal<ReadonlyMap<string, MemberDirectoryEntry>>(new Map());
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.MESSAGING_WRITE,
      ORGANIZATION_PERMISSION.MESSAGING_MANAGE,
    ]);
    memberProfile = signal<{ id: string; organizationId: string } | null>({
      id: 'member-1',
      organizationId: 'org-1',
    });
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

  afterEach(() => TestBed.resetTestingModule());

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
  it('preserves the draft and loaded thread when channel actions switch to mobile', async () => {
    await createPage();
    const field = byTestId('message-composer-input') as HTMLTextAreaElement;
    field.value = 'Inspect the north entrance';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const loads = thread.load.mock.calls.length;

    mobile.set(true);
    await fixture.whenStable();

    expect(byTestId('message-composer-input')).toBe(field);
    expect(field.value).toBe('Inspect the north entrance');
    expect(thread.load).toHaveBeenCalledTimes(loads);
    expect(byTestId('channel-conversation-participants-count')).toBeNull();
    expect(byTestId('channel-conversation-favorite')).toBeNull();
    expect(byTestId('channel-conversation-back')).toBeNull();
    expect(byTestId('channel-conversation-name')).toBeNull();

    byTestId('channel-conversation-actions')?.click();
    await fixture.whenStable();
    const drawer = document.querySelector('hlm-drawer-content');
    expect(drawer).not.toBeNull();
    expect(
      drawer?.querySelector('[data-testid="channel-conversation-info-action"]'),
    ).not.toBeNull();
    expect(
      drawer?.querySelector('[data-testid="channel-conversation-participants-action"]'),
    ).not.toBeNull();
    expect(drawer?.querySelector('[data-testid="channel-conversation-favorite"]')).not.toBeNull();
    expect(
      drawer?.querySelector('[data-testid="channel-conversation-edit-action"]'),
    ).not.toBeNull();
    expect(
      drawer?.querySelector('[data-testid="channel-conversation-delete-action"]'),
    ).not.toBeNull();

    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    await fixture.whenStable();
    expect(drawer?.querySelector('[data-testid="channel-conversation-edit-action"]')).toBeNull();
    expect(drawer?.querySelector('[data-testid="channel-conversation-delete-action"]')).toBeNull();
    expect(
      drawer?.querySelector('[data-testid="channel-conversation-participants-action"]'),
    ).not.toBeNull();
  });
  it('opens channel info only after the mobile action drawer has closed', async () => {
    mobile.set(true);
    await createPage();
    byTestId('channel-conversation-actions')?.click();
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="channel-conversation-info-action"]')
      ?.click();
    expect(fixture.componentInstance['infoSheetVisible']()).toBe(false);
    await fixture.whenStable();

    expect(document.querySelector('hlm-drawer-content')).toBeNull();
    expect(fixture.componentInstance['infoSheetVisible']()).toBe(true);
  });

  it('ignores drawer dismissal and rechecks management permissions before opening an edit', async () => {
    await createPage();
    fixture.componentInstance['onMobileActionsClosed'](undefined);
    expect(fixture.componentInstance['infoSheetVisible']()).toBe(false);
    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    fixture.componentInstance['onMobileActionsClosed']('edit');
    expect(fixture.componentInstance['editDialogVisible']()).toBe(false);
  });

  it('pins and saves existing messages according to their current state', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['togglePin']('missing');
    page['toggleSave']('missing');
    expect(thread.pin).not.toHaveBeenCalled();
    expect(thread.save).not.toHaveBeenCalled();

    thread.messageEntityMap.mockReturnValue({
      'message-1': { id: 'message-1', isSaved: false } as MessageOutput,
    });
    page['togglePin']('message-1');
    page['toggleSave']('message-1');
    expect(thread.pin).toHaveBeenCalledExactlyOnceWith('message-1');
    expect(thread.save).toHaveBeenCalledExactlyOnceWith('message-1');

    thread.messageEntityMap.mockReturnValue({
      'message-1': {
        id: 'message-1',
        pinnedAt: '2026-01-03T00:00:00Z',
        isSaved: true,
      } as MessageOutput,
    });
    page['togglePin']('message-1');
    page['toggleSave']('message-1');
    expect(thread.unpin).toHaveBeenCalledExactlyOnceWith('message-1');
    expect(thread.unsave).toHaveBeenCalledExactlyOnceWith('message-1');
  });

  it('edits and deletes only the selected message and clears targets on close', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['submitMessageEdit']('Updated');
    page['confirmMessageDelete']();
    expect(thread.editMessage).not.toHaveBeenCalled();
    expect(thread.deleteMessage).not.toHaveBeenCalled();

    page['editTargetId'].set('message-1');
    page['submitMessageEdit']('Updated');
    expect(thread.editMessage).toHaveBeenCalledExactlyOnceWith({
      messageId: 'message-1',
      input: { body: 'Updated' },
    });
    page['onMessageEditDialogVisibleChange'](true);
    expect(page['editTargetId']()).toBe('message-1');
    page['onMessageEditDialogVisibleChange'](false);
    expect(page['editTargetId']()).toBeNull();

    page['messageDeleteTargetId'].set('message-2');
    page['confirmMessageDelete']();
    expect(thread.deleteMessage).toHaveBeenCalledExactlyOnceWith('message-2');
    page['onMessageDeleteDialogVisibleChange'](true);
    expect(page['messageDeleteTargetId']()).toBe('message-2');
    page['onMessageDeleteDialogVisibleChange'](false);
    expect(page['messageDeleteTargetId']()).toBeNull();

    page['replyTargetId'].set('message-3');
    page['onReplySheetVisibleChange'](true);
    expect(page['replyTargetId']()).toBe('message-3');
    page['onReplySheetVisibleChange'](false);
    expect(page['replyTargetId']()).toBeNull();
  });

  it('releases favorite busy state after a failed write without refreshing the channel', async () => {
    favorite.mockReturnValue(throwError(() => new Error('offline')));
    await createPage();
    channelsLoadOne.mockClear();

    expect(fixture.componentInstance['toggleFavorite']()).toBe(true);
    expect(fixture.componentInstance['favoritePending']()).toBe(false);
    expect(channelsLoadOne).not.toHaveBeenCalled();
  });

  it('opens mobile participant, edit and delete actions only for the current authorized channel', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['onMobileActionsClosed']('participants');
    expect(page['participantsSheetVisible']()).toBe(true);
    page['onMobileActionsClosed']('edit');
    expect(page['editDialogVisible']()).toBe(true);
    page['onMobileActionsClosed']('delete');
    expect(page['deletePending']()).toBe(true);

    page['editDialogVisible'].set(false);
    page['deletePending'].set(false);
    channelEntityMap.set({});
    page['onMobileActionsClosed']('edit');
    page['onMobileActionsClosed']('delete');
    expect(page['editDialogVisible']()).toBe(false);
    expect(page['deletePending']()).toBe(false);
  });

  it('uses the roster while a deep-linked channel resolves and avoids writes without its entity', async () => {
    channelEntityMap.set({});
    participants.set([
      { memberId: 'member-1', source: 'direct', addedAt: '2026-01-01' },
      { memberId: 'member-2', source: 'direct', addedAt: '2026-01-01' },
    ]);
    await createPage();
    const page = fixture.componentInstance;

    expect(page['participantCount']()).toBe(2);
    expect(page['composerPlaceholder']()).toBe('Write a message');
    expect(page['toggleFavorite']()).toBe(false);
    page['submitEdit']({ name: 'Premature rename', parentChannelId: null });
    expect(favorite).not.toHaveBeenCalled();
    expect(channelsUpdate).not.toHaveBeenCalled();

    channelEntityMap.set({ 'channel-1': channel({ name: 'Resolved', participantCount: 6 }) });
    await fixture.whenStable();
    expect(page['participantCount']()).toBe(6);
    expect(page['composerPlaceholder']()).toContain('#Resolved');
  });

  it('restricts mentions to resolved participants and offers only active nonparticipants to add', async () => {
    participants.set([
      { memberId: 'member-1', role: 'admin', source: 'direct', addedAt: '2026-01-01' },
      { memberId: 'member-missing', source: 'direct', addedAt: '2026-01-01' },
    ]);
    directoryEntries.set(
      new Map([
        [
          'member-1',
          {
            memberId: 'member-1',
            displayName: 'Ada Lovelace',
            roleNames: [],
            isActive: true,
          },
        ],
        [
          'member-2',
          { memberId: 'member-2', displayName: 'Zoe Martin', roleNames: [], isActive: true },
        ],
        [
          'member-3',
          { memberId: 'member-3', displayName: 'Inactive', roleNames: [], isActive: false },
        ],
      ]),
    );
    await createPage();
    const page = fixture.componentInstance;

    expect(page['mentionCandidates']().map((member) => member.memberId)).toEqual(['member-1']);
    expect(page['addableMembers']().map((member) => member.memberId)).toEqual(['member-2']);
    expect(page['participantViews']()).toEqual([
      expect.objectContaining({
        memberId: 'member-1',
        displayName: 'Ada Lovelace',
        isResolved: true,
        role: 'admin',
      }),
      expect.objectContaining({
        memberId: 'member-missing',
        displayName: 'Unknown member',
        isResolved: false,
      }),
    ]);
    expect(page['participantAvatars']()[0]?.initials).toBe('AL');

    directoryAvailable.set(false);
    await fixture.whenStable();
    expect(page['mentionCandidates']()).toEqual([]);
    expect(page['addableMembers']()).toEqual([]);
    expect(page['participantViews']()[0]?.displayName).toBe('Unknown member');
  });

  it('offers other root channels as parents and resolves the current parent IRI for a move', async () => {
    channelEntityMap.set({
      'channel-1': channel({ parent: '/api/channels/root-1' }),
      'root-1': channel({ id: 'root-1', name: 'Main' }),
      'root-2': channel({ id: 'root-2', name: 'Secondary' }),
    });
    await createPage();
    const page = fixture.componentInstance;

    expect(page['currentParentId']()).toBe('root-1');
    expect(page['parentOptions']()).toEqual([
      { value: 'root-1', label: '#Main' },
      { value: 'root-2', label: '#Secondary' },
    ]);

    page['submitEdit']({ name: 'Bâtiment Nord', parentChannelId: null });
    expect(channelsUpdate).not.toHaveBeenCalled();
    expect(channelsSetParent).toHaveBeenCalledExactlyOnceWith({
      channelId: 'channel-1',
      input: { parentChannelId: null },
    });
  });

  it('honors a wildcard grant and revokes channel actions when that grant disappears', async () => {
    permissions.set(['organization.*']);
    await createPage();

    expect(fixture.componentInstance['canWrite']()).toBe(true);
    expect(fixture.componentInstance['canManage']()).toBe(true);
    expect(byTestId('message-composer-input')).not.toBeNull();

    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    await fixture.whenStable();

    expect(fixture.componentInstance['canWrite']()).toBe(false);
    expect(fixture.componentInstance['canManage']()).toBe(false);
    expect(byTestId('message-composer-read-only')).not.toBeNull();
  });

  it('locks favorite writes until their response and then refreshes the shared channel', async () => {
    const pending = new Subject<ChannelOutput>();
    favorite.mockReturnValue(pending);
    await createPage();
    channelsLoadOne.mockClear();
    const page = fixture.componentInstance;

    expect(page['toggleFavorite']()).toBe(true);
    expect(page['favoritePending']()).toBe(true);
    expect(page['toggleFavorite']()).toBe(false);
    expect(favorite).toHaveBeenCalledExactlyOnceWith('channel-1');
    expect(channelsLoadOne).not.toHaveBeenCalled();

    pending.next(channel({ isFavorite: true }));
    expect(page['favoritePending']()).toBe(false);
    expect(channelsLoadOne).toHaveBeenCalledExactlyOnceWith('channel-1');
  });

  it('routes composer, reaction and pinned-sheet actions to the current thread', async () => {
    await createPage();
    const page = fixture.componentInstance;

    page['send']('North entrance inspected');
    page['toggleReaction']({ messageId: 'message-1', emoji: '👍' });
    page['unpinFromSheet']('message-2');

    expect(thread.send).toHaveBeenCalledExactlyOnceWith({
      conversationId: 'channel-1',
      input: { body: 'North entrance inspected' },
    });
    expect(thread.toggleReaction).toHaveBeenCalledExactlyOnceWith('message-1', '👍');
    expect(pinnedUnpin).toHaveBeenCalledExactlyOnceWith('message-2');
  });

  it('resolves reply and edit targets only while the selected message belongs to the thread', async () => {
    const message: MessageOutput = {
      '@id': '/api/messages/message-1',
      '@type': 'MessageOutput',
      id: 'message-1',
      conversation: '/api/conversations/channel-1',
      authorMember: '/api/organizations/org-1/members/member-1',
      body: 'Safety update',
      mentions: [],
      mentionNames: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      isDeleted: false,
      attachments: [],
      isSaved: false,
      replyCount: 0,
      reactions: [],
      references: [],
    };
    thread.sortedMessages.mockReturnValue([message]);
    thread.messageEntityMap.mockReturnValue({ 'message-1': message });
    await createPage();
    const page = fixture.componentInstance;

    page['replyTargetId'].set('message-1');
    page['editTargetId'].set('message-1');
    expect(page['replyTargetView']()?.id).toBe('message-1');
    expect(page['editTargetMessage']()).toBe(message);

    page['replyTargetId'].set('missing');
    page['editTargetId'].set('missing');
    expect(page['replyTargetView']()).toBeNull();
    expect(page['editTargetMessage']()).toBeNull();
  });

  it('updates the open thread when a pin is removed from the information sheet', async () => {
    await createPage();

    TestBed.inject(Dispatcher).dispatch(pinnedMessagesStoreEvents.unpinned('message-2'));

    expect(thread.noteUnpinned).toHaveBeenCalledExactlyOnceWith('message-2');
  });

  it('shows pinned authors and permits unpinning only for the pinning member or a manager', async () => {
    pinned.set([
      {
        id: 'message-1',
        authorDisplayName: 'Ada Lovelace',
        body: 'Safety update',
        mentionNames: {},
        isDeleted: false,
        createdAt: '2026-01-01T00:00:00Z',
        pinnedBy: '/api/organizations/org-1/members/member-1',
      },
      {
        id: 'message-2',
        body: 'Follow-up',
        mentionNames: {},
        isDeleted: false,
        createdAt: '2026-01-02T00:00:00Z',
        pinnedBy: '/api/organizations/org-1/members/member-2',
      },
    ] as MessageOutput[]);
    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_WRITE]);
    await createPage();
    const page = fixture.componentInstance;

    expect(page['pinnedItems']().map((item) => item.canUnpin)).toEqual([true, false]);
    expect(page['pinnedItems']()[0]?.authorName).toBe('Ada Lovelace');
    expect(page['pinnedItems']()[1]?.authorName).toBe('Unknown member');

    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_MANAGE]);
    expect(page['pinnedItems']().map((item) => item.canUnpin)).toEqual([true, true]);

    memberProfile.set(null);
    permissions.set([]);
    expect(page['pinnedItems']().map((item) => item.canUnpin)).toEqual([false, false]);

    page['infoSheetVisible'].set(true);
    await fixture.whenStable();
    expect(pinnedLoad).toHaveBeenCalledWith('channel-1');
  });

  it('marks the channel read only while its document is visible', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await createPage();
    thread.markRead.mockClear();

    fixture.componentInstance['markRead']();
    expect(thread.markRead).not.toHaveBeenCalled();

    visibility.mockReturnValue('visible');
    fixture.componentInstance['markRead']();
    expect(thread.markRead).toHaveBeenCalledExactlyOnceWith({ conversationId: 'channel-1' });
    visibility.mockRestore();
  });

  it('keeps channel deletion pending while the dialog stays open and clears it on dismissal', async () => {
    await createPage();
    const page = fixture.componentInstance;
    page['requestDelete']();
    page['confirmDelete']();
    channelsMutationCallState.set(errorCallState(toStoreError(new Error('Cannot delete'))));
    await fixture.whenStable();

    page['onDeleteDialogStateChanged']('open');
    expect(page['deletePending']()).toBe(true);
    expect(page['deleteDialogError']()).not.toBeNull();

    page['onDeleteDialogStateChanged']('closed');
    await fixture.whenStable();
    expect(page['deletePending']()).toBe(false);
    expect(page['deleteDialogError']()).toBeNull();
  });
});
