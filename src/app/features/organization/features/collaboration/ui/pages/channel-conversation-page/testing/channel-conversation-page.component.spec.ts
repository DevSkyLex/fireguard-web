import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type { ChannelOutput } from '@features/organization/features/collaboration/models';
import {
  channelsStoreEvents,
  ChannelParticipantsStore,
  ChannelsStore,
  MessageThreadStore,
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
  };
  let channelEntityMap: WritableSignal<Readonly<Record<string, ChannelOutput>>>;
  let channelsLoadOne: ReturnType<typeof vi.fn>;
  let channelsUpdate: ReturnType<typeof vi.fn>;
  let channelsRemove: ReturnType<typeof vi.fn>;
  let channelsSetParent: ReturnType<typeof vi.fn>;
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
          },
        },
        { provide: ConversationService, useValue: { favorite, unfavorite } },
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
      remove: { providers: [MessageThreadStore, ChannelParticipantsStore] },
      add: {
        providers: [
          { provide: MessageThreadStore, useValue: thread },
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
    expect(fixture.componentInstance['deleteDialogState']()).toBe('open');

    fixture.componentInstance['confirmDelete']();

    expect(channelsRemove).toHaveBeenCalledWith('channel-1');
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
});
