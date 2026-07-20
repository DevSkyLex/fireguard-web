import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import { ConversationDetailsStore } from '../conversation-details.store';

const collection = <T>(member: readonly T[]) => of({ member, totalItems: member.length });

describe('ConversationDetailsStore', () => {
  let listPinnedMessages: ReturnType<typeof vi.fn>;
  let listAttachments: ReturnType<typeof vi.fn>;
  let listParticipants: ReturnType<typeof vi.fn>;

  const configure = (): InstanceType<typeof ConversationDetailsStore> => {
    TestBed.configureTestingModule({
      providers: [
        ConversationDetailsStore,
        {
          provide: MessagingService,
          useValue: { listPinnedMessages, listAttachments, listParticipants },
        },
      ],
    });

    return TestBed.inject(ConversationDetailsStore);
  };

  beforeEach(() => {
    listPinnedMessages = vi.fn(() => collection([{ id: 'p1' }]));
    listAttachments = vi.fn(() =>
      collection([
        { id: 'a1', uploadedAt: '2026-07-01T10:00:00Z' },
        { id: 'a2', uploadedAt: '2026-07-03T10:00:00Z' },
      ]),
    );
    listParticipants = vi.fn(() => collection([{ memberId: 'm1' }]));
  });

  it('should load the three collections together for a channel', () => {
    const store = configure();

    store.load({ conversationId: 'c1', isChannel: true });

    expect(listPinnedMessages).toHaveBeenCalledWith('c1');
    expect(listAttachments).toHaveBeenCalledWith('c1');
    expect(listParticipants).toHaveBeenCalledWith('c1');
    expect(store.pinnedMessages()).toHaveLength(1);
    expect(store.participants()).toHaveLength(1);
    expect(store.isLoading()).toBe(false);
  });

  // A direct conversation has no participant collection on the API: asking for
  // one would 404 and blank the whole panel through forkJoin.
  it('should not ask for participants on a direct conversation', () => {
    const store = configure();

    store.load({ conversationId: 'dm-1', isChannel: false });

    expect(listParticipants).not.toHaveBeenCalled();
    expect(store.participants()).toEqual([]);
    expect(store.pinnedMessages()).toHaveLength(1);
  });

  it('should order files newest first', () => {
    const store = configure();

    store.load({ conversationId: 'c1', isChannel: true });

    expect(store.attachments().map((attachment) => attachment.id)).toEqual(['a2', 'a1']);
  });

  it('should go idle when no conversation is open', () => {
    const store = configure();

    store.load({ conversationId: null, isChannel: false });

    expect(listPinnedMessages).not.toHaveBeenCalled();
    expect(store.pinnedMessages()).toEqual([]);
    expect(store.hasError()).toBe(false);
  });

  it('should surface a failure so the panel can offer a retry', () => {
    listPinnedMessages = vi.fn(() => throwError(() => new Error('nope')));
    const store = configure();

    store.load({ conversationId: 'c1', isChannel: true });

    expect(store.hasError()).toBe(true);
  });
});
