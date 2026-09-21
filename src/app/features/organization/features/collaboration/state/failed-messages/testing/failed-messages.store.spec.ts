import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import {
  ConversationService,
  MessagingOutboxRepository,
} from '@features/organization/features/collaboration/data-access';
import type {
  ConversationOutput,
  MessagingOutboxOperation,
} from '@features/organization/features/collaboration/models';
import { FailedMessagesStore } from '../failed-messages.store';

function conversation(id: string, organization = 'org-1', isChannel = false): ConversationOutput {
  return {
    '@id': `/api/conversations/${id}`,
    '@type': 'Conversation',
    id,
    organization: `/api/organizations/${organization}`,
    subjectType: 'direct',
    visibility: 'participants',
    messagesCount: 0,
    isArchived: false,
    unreadCount: 0,
    createdAt: '',
    updatedAt: '',
    isChannel,
    isFavorite: false,
  };
}
function failed(id: string, conversationId = id): MessagingOutboxOperation {
  return {
    id,
    conversationId,
    type: 'message.send',
    status: 'failed',
    createdAt: '2026-09-21T12:00:00Z',
    payload: { clientId: `client-${id}`, conversationId, input: { body: `Draft ${id}` } },
  };
}
describe('FailedMessagesStore', () => {
  const profile = signal<{ id: string } | null>({ id: 'user-1' });
  let list: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    profile.set({ id: 'user-1' });
    list = vi.fn().mockResolvedValue([]);
    get = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FailedMessagesStore,
        { provide: USER_IDENTITY_PORT, useValue: { profile } },
        { provide: MessagingOutboxRepository, useValue: { list } },
        { provide: ConversationService, useValue: { get } },
      ],
    });
  });
  afterEach(() => TestBed.resetTestingModule());
  it('filters pending sends and inaccessible organizations, resolving each conversation once', async () => {
    list.mockResolvedValue([
      failed('a'),
      failed('b', 'a'),
      failed('other'),
      failed('denied'),
      { ...failed('pending'), status: 'pending' },
    ]);
    get.mockImplementation((id: string) =>
      id === 'denied'
        ? throwError(() => ({ type: 'denied', status: 403, detail: 'Denied' }))
        : of(conversation(id, id === 'other' ? 'org-2' : 'org-1', true)),
    );
    const store = TestBed.inject(FailedMessagesStore);
    store.load('org-1');
    await vi.waitFor(() => expect(store.isQueryLoaded()).toBe(true));
    expect(store.items().map((row) => row.id)).toEqual(['a', 'b']);
    expect(store.items()[0].link).toEqual(['/organizations', 'org-1', 'channels', 'a']);
    expect(get).toHaveBeenCalledTimes(3);
  });
  it('reports unavailable on network failure and preserves the local outbox for retry', async () => {
    list.mockResolvedValue([failed('a')]);
    get.mockReturnValue(throwError(() => new Error('offline')));
    const store = TestBed.inject(FailedMessagesStore);
    store.load('org-1');
    await vi.waitFor(() => expect(store.queryHasError()).toBe(true));
    expect(store.items()).toEqual([]);
    get.mockReturnValue(of(conversation('a')));
    store.load('org-1');
    await vi.waitFor(() => expect(store.items()).toHaveLength(1));
  });
  it('cancels late organization reads and clears visible drafts immediately', async () => {
    const late = new Subject<ConversationOutput>();
    list.mockResolvedValue([failed('a')]);
    get.mockReturnValue(late);
    const store = TestBed.inject(FailedMessagesStore);
    store.load('org-1');
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    list.mockResolvedValue([]);
    store.load('org-2');
    late.next(conversation('a'));
    late.complete();
    await vi.waitFor(() => expect(store.isQueryLoaded()).toBe(true));
    expect(store.items()).toEqual([]);
  });
  it('hides resolved drafts immediately after an account change', async () => {
    list.mockResolvedValue([failed('a')]);
    get.mockReturnValue(of(conversation('a')));
    const store = TestBed.inject(FailedMessagesStore);
    store.load('org-1');
    await vi.waitFor(() => expect(store.items()).toHaveLength(1));
    profile.set({ id: 'user-2' });
    expect(store.items()).toEqual([]);
    store.load(null);
    expect(store.failedMessageEntities()).toEqual([]);
  });
  it('discards a late response belonging to another account', async () => {
    const late = new Subject<ConversationOutput>();
    list.mockResolvedValue([failed('a')]);
    get.mockReturnValue(late);
    const store = TestBed.inject(FailedMessagesStore);
    store.load('org-1');
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    profile.set({ id: 'user-2' });
    late.next(conversation('a'));
    late.complete();
    expect(store.items()).toEqual([]);
  });
  it('does not touch local storage or access endpoints on the server', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    TestBed.inject(FailedMessagesStore).load('org-1');
    expect(list).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });
});
