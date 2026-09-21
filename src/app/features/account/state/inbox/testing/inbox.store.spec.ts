import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { InboxService, NotificationService } from '@features/account/data-access';
import type { InboxItemOutput, InboxOutput } from '@features/account/models';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { notificationStoreEvents } from '@features/account/state/notifications';
import { messageThreadStoreEvents } from '@features/organization/features/collaboration/state/message-thread';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { InboxStore, type InboxStoreType } from '../inbox.store';

const item = (id: string, sourceKey = 'notification'): InboxItemOutput => ({
  id,
  sourceKey,
  title: id,
  snippet: null,
  kind: sourceKey,
  occurredAt: '2026-09-20T10:00:00.123456Z',
  isRead: false,
  organizationId: 'org-a',
  targetType: sourceKey === 'notification' ? 'notification' : 'conversation',
  targetId: id,
  targetKind: 'channel',
});
const page = (
  items: readonly InboxItemOutput[],
  cursor: string | null = null,
  complete = true,
): InboxOutput => ({
  '@id': '/api/inbox',
  '@type': 'Inbox',
  items,
  nextPageCursor: cursor,
  hasMore: cursor !== null,
  complete,
});

describe('InboxStore', () => {
  const profile = signal<{ id: string } | null>({ id: 'account-a' });
  const organization = signal<string | null>('org-a');
  let api: { list: ReturnType<typeof vi.fn>; unreadCount: ReturnType<typeof vi.fn> };
  let notifications: { markAsRead: ReturnType<typeof vi.fn> };
  let store: InboxStoreType;

  const configure = (platformId = 'browser'): void => {
    profile.set({ id: 'account-a' });
    organization.set('org-a');
    api = {
      list: vi.fn().mockReturnValue(of(page([item('a')], 'opaque+/cursor='))),
      unreadCount: vi.fn().mockReturnValue(of(42)),
    };
    notifications = { markAsRead: vi.fn().mockReturnValue(of({ id: 'a', isRead: true })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: InboxService, useValue: api },
        { provide: NotificationService, useValue: notifications },
        { provide: USER_IDENTITY_PORT, useValue: { profile } },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId: organization } },
      ],
    });
    store = TestBed.inject(InboxStore);
    TestBed.tick();
  };

  it('loads the server badge independently and keeps the feed lazy', () => {
    configure();
    expect(store.unreadCount()).toBe(42);
    expect(api.unreadCount).toHaveBeenCalledWith('org-a');
    expect(api.list).not.toHaveBeenCalled();
    store.ensureLoaded();
    store.ensureLoaded();
    expect(api.list).toHaveBeenCalledOnce();
    expect(store.entryEntities()).toHaveLength(1);
    expect(store.unreadCount()).toBe(42);
  });

  it('echoes the opaque cursor and preserves equal ids from different sources', () => {
    configure();
    store.load();
    const pending = new Subject<InboxOutput>();
    api.list.mockReturnValue(pending);
    store.loadMore();
    store.loadMore();
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.list).toHaveBeenLastCalledWith('org-a', 'opaque+/cursor=');
    pending.next(page([item('a', 'messaging.mention'), item('b')]));
    pending.complete();
    expect(store.entryIds()).toEqual(['notification:a', 'messaging.mention:a', 'notification:b']);
    expect(store.hasMore()).toBe(false);
  });

  it('cancels old organization pages before clearing and replacing the scope', () => {
    configure();
    store.load();
    const oldPage = new Subject<InboxOutput>();
    api.list.mockReturnValueOnce(oldPage).mockReturnValue(of(page([item('new')])));
    store.loadMore();
    organization.set('org-b');
    TestBed.tick();
    expect(oldPage.observed).toBe(false);
    oldPage.next(page([item('secret-old')]));
    expect(store.entryIds()).toEqual(['notification:new']);
    expect(api.list).toHaveBeenLastCalledWith('org-b', null);
    expect(store.moreCallState().status).toBe('idle');
  });

  it('clears all cached data on logout and ignores an in-flight acknowledgement', () => {
    configure();
    store.load();
    const pending = new Subject<unknown>();
    notifications.markAsRead.mockReturnValue(pending);
    store.markAsRead(item('a'));
    profile.set(null);
    TestBed.tick();
    expect(pending.observed).toBe(false);
    pending.next({ id: 'a', isRead: true });
    expect(store.entryEntities()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
    expect(store.readCallState().status).toBe('idle');
  });

  it('retains acquired entries after a source failure and prevents cursor advancement', () => {
    configure();
    store.load();
    api.list.mockReturnValue(of(page([item('partial')], 'must-not-advance', false)));
    store.loadMore();
    expect(store.entryIds()).toEqual(['notification:a', 'notification:partial']);
    expect(store.complete()).toBe(false);
    expect(store.hasMore()).toBe(false);
    store.loadMore();
    expect(api.list).toHaveBeenCalledTimes(2);
    api.list.mockReturnValue(of(page([item('recovered')])));
    store.load();
    expect(api.list).toHaveBeenLastCalledWith('org-a', null);
    expect(store.entryIds()).toEqual(['notification:recovered']);
  });

  it('retains the exact next cursor after a transport failure for retry', () => {
    configure();
    store.load();
    api.list
      .mockReturnValueOnce(throwError(() => ({ status: 500, message: 'offline' })))
      .mockReturnValue(of(page([item('b')])));
    store.loadMore();
    expect(store.entryEntities()).toHaveLength(1);
    expect(store.listError()).not.toBeNull();
    store.loadMore();
    expect(api.list).toHaveBeenLastCalledWith('org-a', 'opaque+/cursor=');
    expect(store.entryEntities()).toHaveLength(2);
  });

  it('acknowledges notifications only, with a canonical badge refresh', () => {
    configure();
    store.load();
    store.markAsRead(item('a', 'messaging.mention'));
    expect(notifications.markAsRead).not.toHaveBeenCalled();
    api.unreadCount.mockReturnValue(of(17));
    store.markAsRead(item('a'));
    expect(notifications.markAsRead).toHaveBeenCalledWith('a');
    expect(store.entryEntities()[0].isRead).toBe(true);
    expect(store.unreadCount()).toBe(17);
  });

  it('keeps a failed acknowledgement unread and permits retry', () => {
    configure();
    store.load();
    notifications.markAsRead.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    store.markAsRead(item('a'));
    expect(store.entryEntities()[0].isRead).toBe(false);
    expect(store.readCallState().status).toBe('error');
    store.markAsRead(item('a'));
    expect(store.entryEntities()[0].isRead).toBe(true);
  });

  it('refreshes from source-owned notification and conversation events', () => {
    configure();
    store.load();
    const dispatcher = TestBed.inject(Dispatcher);
    dispatcher.dispatch(notificationStoreEvents.changed());
    dispatcher.dispatch(messageThreadStoreEvents.conversationRead('conversation-a'));
    expect(api.list).toHaveBeenCalledTimes(3);
    expect(api.unreadCount).toHaveBeenCalledTimes(3);
  });

  it('does not request or transfer secondary authenticated data during SSR', () => {
    configure('server');
    store.load();
    store.loadMore();
    store.loadCount();
    expect(api.list).not.toHaveBeenCalled();
    expect(api.unreadCount).not.toHaveBeenCalled();
    expect(store.entryEntities()).toEqual([]);
  });
});
