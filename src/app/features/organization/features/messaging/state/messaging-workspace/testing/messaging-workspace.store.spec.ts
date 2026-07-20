import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject } from 'rxjs';
import { MercureService } from '@core/mercure';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { MessageOutput } from '@features/organization/features/messaging/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { ConversationInventoryStore } from '../../conversation-inventory';
import { MessagingWorkspaceStore } from '../messaging-workspace.store';

const message = (id: string, body: string, createdAt: string): MessageOutput =>
  ({
    '@id': `/api/messages/${id}`,
    '@type': 'Message',
    id,
    conversation: 'c1',
    authorMember: 'm1',
    body,
    mentions: [],
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    attachments: [],
    pinnedAt: null,
    pinnedBy: null,
    reactions: [],
    isSaved: false,
    replyCount: 0,
    createdAt,
    updatedAt: createdAt,
  }) as MessageOutput;

describe('MessagingWorkspaceStore live thread', () => {
  const hub = new Subject<MessageOutput>();

  const createStore = (initial: readonly MessageOutput[]) => {
    TestBed.configureTestingModule({
      providers: [
        MessagingWorkspaceStore,
        ConversationInventoryStore,
        {
          provide: MessagingService,
          useValue: {
            listConversations: vi.fn(() => of({ member: [], totalItems: 0 })),
            listMessages: vi.fn(() => of({ member: initial, totalItems: initial.length })),
            getSubscription: vi.fn(() => of({ token: 'jwt', topic: 'conversation/c1' })),
            listAttachments: vi.fn(() => of({ member: [], totalItems: 0 })),
            markRead: vi.fn(() => EMPTY),
          },
        },
        { provide: MercureService, useValue: { subscribe: vi.fn(() => hub.asObservable()) } },
        // The root conversation inventory, reached through the workspace
        // store's delegation, follows the organization context — kept empty
        // here so it stays idle.
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization: signal(null) } },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: { permissions: signal<ReadonlyArray<string>>([]) },
        },
      ],
    });

    const store = TestBed.inject(MessagingWorkspaceStore);
    store.selectConversation('c1');
    return store;
  };

  it('should append a message that arrives from the hub', () => {
    const store = createStore([message('m1', 'first', '2026-07-01T10:00:00Z')]);

    hub.next(message('m2', 'second', '2026-07-01T10:01:00Z'));

    expect(store.messages().map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  // The sender's own message arrives twice: once from the POST response, once
  // echoed by the hub. Appending both would show it duplicated to its author
  // and nobody else — the worst kind of bug to reproduce.
  it('should replace rather than duplicate a message it already has', () => {
    const store = createStore([message('m1', 'first', '2026-07-01T10:00:00Z')]);

    hub.next(message('m1', 'first (edited)', '2026-07-01T10:00:00Z'));

    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]?.body).toBe('first (edited)');
  });

  it('should keep the thread oldest first when a hub message arrives out of order', () => {
    const store = createStore([message('m2', 'second', '2026-07-01T10:01:00Z')]);

    hub.next(message('m1', 'first', '2026-07-01T10:00:00Z'));

    expect(store.messages().map((m) => m.id)).toEqual(['m1', 'm2']);
  });
});
