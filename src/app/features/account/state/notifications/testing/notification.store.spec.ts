import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService } from '@core/mercure';
import { NotificationService } from '@features/account/data-access';
import type { NotificationOutput, NotificationTypeOutput } from '@features/account/models';
import { authStoreEvents } from '@features/auth';
import { NotificationStore } from '../notification.store';

describe('NotificationStore', () => {
  let store: NotificationStore;
  let transferState: TransferState;

  const notification: NotificationOutput = {
    '@id': '/api/notifications/1',
    '@type': 'Notification',
    id: '1',
    type: 'alert',
    category: 'system',
    subject: 'Subject',
    body: 'Body',
    channels: ['in_app'],
    payload: {},
    isRead: false,
    createdAt: '2026-04-15T10:00:00Z',
    readAt: null,
  };

  const notificationCollection: HydraCollection<NotificationOutput> = {
    '@id': '/api/notifications?page=1',
    '@type': 'Collection',
    totalItems: 1,
    member: [notification],
  };

  const otherNotification: NotificationOutput = {
    ...notification,
    '@id': '/api/notifications/2',
    id: '2',
    subject: 'Other subject',
  };

  const otherNotificationCollection: HydraCollection<NotificationOutput> = {
    '@id': '/api/notifications?page=2',
    '@type': 'Collection',
    totalItems: 2,
    member: [otherNotification],
  };

  const notificationTypes: ReadonlyArray<NotificationTypeOutput> = [
    {
      '@id': '/api/notification-types/alert',
      '@type': 'NotificationType',
      type: 'alert',
      category: 'system',
    },
  ];

  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockNotificationService: {
    list: ReturnType<typeof vi.fn>;
    listTypes: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
    getSubscription: ReturnType<typeof vi.fn>;
  };
  let mockMercureService: { subscribe: ReturnType<typeof vi.fn> };

  const configure = (platformId: 'browser' | 'server' = 'browser') => {
    mockDispatcher = { dispatch: vi.fn() };
    mockNotificationService = {
      list: vi.fn(),
      listTypes: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      getSubscription: vi.fn(),
    };
    mockMercureService = {
      subscribe: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MercureService, useValue: mockMercureService },
      ],
    });

    store = TestBed.inject(NotificationStore);
    transferState = TestBed.inject(TransferState);
  };

  beforeEach(() => {
    configure();
  });

  it('should reuse transferred notifications on the browser without calling the API', async () => {
    transferState.set(
      makeStateKey<HydraCollection<NotificationOutput> | null>('notification-list'),
      notificationCollection,
    );

    await store.initialize();

    expect(mockNotificationService.list).not.toHaveBeenCalled();
    expect(store.notifications()).toEqual([notification]);
    expect(store.totalNotifications()).toBe(1);
    expect(store.listCallState().status).toBe('success');
  });

  it('should fetch notifications without seeding transfer state on the browser', async () => {
    mockNotificationService.list.mockReturnValue(of(notificationCollection));

    await store.initialize();

    expect(mockNotificationService.list).toHaveBeenCalledTimes(1);
    expect(store.notifications()).toEqual([notification]);
    // `TransferState` is an SSR-to-browser handoff. A browser-side write would sit
    // there holding this user's notifications until the next `initialize()` read it
    // back — which is how the previous user's list reappeared after a re-login.
    expect(
      transferState.get(
        makeStateKey<HydraCollection<NotificationOutput> | null>('notification-list'),
        null,
      ),
    ).toBeNull();
  });

  it('should write notifications to transfer state when rendering on the server', async () => {
    configure('server');
    mockNotificationService.list.mockReturnValue(of(notificationCollection));

    await store.initialize();

    expect(
      transferState.get(
        makeStateKey<HydraCollection<NotificationOutput> | null>('notification-list'),
        null,
      ),
    ).toEqual(notificationCollection);
  });

  it('should reuse transferred notification types on the browser without calling the API', async () => {
    transferState.set(
      makeStateKey<ReadonlyArray<NotificationTypeOutput> | null>('notification-types'),
      notificationTypes,
    );

    await store.initializeTypes();

    expect(mockNotificationService.listTypes).not.toHaveBeenCalled();
    expect(store.types()).toEqual(notificationTypes);
  });

  it('should not call the Mercure subscription endpoint during SSR', () => {
    configure('server');

    store.connectMercure();

    expect(mockNotificationService.getSubscription).not.toHaveBeenCalled();
    expect(mockMercureService.subscribe).not.toHaveBeenCalled();
  });

  it('should reset the Mercure guard when the subscription bootstrap fails', async () => {
    mockNotificationService.getSubscription.mockReturnValue(
      throwError(() => new Error('Mercure bootstrap failed')),
    );

    store.connectMercure();
    await Promise.resolve();

    expect(store.mercureConnected()).toBe(false);
  });

  it('should only bootstrap notifications once when already loaded', async () => {
    mockNotificationService.list.mockReturnValue(of(notificationCollection));

    await store.initialize();
    await store.initialize();

    expect(mockNotificationService.list).toHaveBeenCalledTimes(1);
  });

  it('should load and replace a specific page for table pagination', async () => {
    mockNotificationService.list.mockReturnValue(of(notificationCollection));

    store.loadPage({ page: 2, limit: 10 });
    await Promise.resolve();

    expect(mockNotificationService.list).toHaveBeenCalledWith({ page: 2, limit: 10 });
    expect(store.notifications()).toEqual([notification]);
    expect(store.currentPage()).toBe(2);
    expect(store.itemsPerPage()).toBe(10);
  });

  it('should not insert a delayed mark-as-read response into another page', async () => {
    const markAsReadResponse = new Subject<NotificationOutput>();
    const updatedNotification: NotificationOutput = {
      ...notification,
      isRead: true,
      readAt: '2026-04-15T11:00:00Z',
    };
    mockNotificationService.list
      .mockReturnValueOnce(of(notificationCollection))
      .mockReturnValueOnce(of(otherNotificationCollection));
    mockNotificationService.markAsRead.mockReturnValue(markAsReadResponse);

    store.loadPage({ page: 1, limit: 10 });
    await Promise.resolve();
    store.markAsRead(notification.id);
    store.loadPage({ page: 2, limit: 10 });
    await Promise.resolve();
    markAsReadResponse.next(updatedNotification);
    await Promise.resolve();

    expect(store.notifications()).toEqual([otherNotification]);
    expect(store.markAsReadCallState().data).toEqual(updatedNotification);
  });

  describe('initialize', () => {
    it('should set listCallState error on failure and dispatch loadFailed', async () => {
      mockNotificationService.list.mockReturnValue(throwError(() => new Error('boom')));

      await store.initialize();

      expect(store.listCallState().status).toBe('error');
      expect(store.listCallState().error).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Notification Store] loadFailed' }),
      );
    });
  });

  describe('initializeTypes', () => {
    it('should fetch types without seeding transfer state on the browser', async () => {
      mockNotificationService.listTypes.mockReturnValue(of(notificationTypes));

      await store.initializeTypes();

      expect(mockNotificationService.listTypes).toHaveBeenCalledTimes(1);
      expect(store.types()).toEqual(notificationTypes);
      expect(
        transferState.get(
          makeStateKey<ReadonlyArray<NotificationTypeOutput> | null>('notification-types'),
          null,
        ),
      ).toBeNull();
    });

    it('should write types to transfer state when rendering on the server', async () => {
      configure('server');
      mockNotificationService.listTypes.mockReturnValue(of(notificationTypes));

      await store.initializeTypes();

      expect(
        transferState.get(
          makeStateKey<ReadonlyArray<NotificationTypeOutput> | null>('notification-types'),
          null,
        ),
      ).toEqual(notificationTypes);
    });

    it('should be a no-op once types are already loaded', async () => {
      mockNotificationService.listTypes.mockReturnValue(of(notificationTypes));

      await store.initializeTypes();
      await store.initializeTypes();

      expect(mockNotificationService.listTypes).toHaveBeenCalledTimes(1);
    });

    it('should not throw and should clear transfer state on API failure', async () => {
      mockNotificationService.listTypes.mockReturnValue(throwError(() => new Error('boom')));

      await store.initializeTypes();

      expect(store.types()).toEqual([]);
      expect(
        transferState.get(
          makeStateKey<ReadonlyArray<NotificationTypeOutput> | null>('notification-types'),
          null,
        ),
      ).toBeNull();
    });
  });

  describe('load', () => {
    it('should replace the collection and reset to page 1 on success', async () => {
      mockNotificationService.list.mockReturnValue(of(notificationCollection));

      store.load();
      await Promise.resolve();

      expect(store.notifications()).toEqual([notification]);
      expect(store.totalNotifications()).toBe(1);
      expect(store.currentPage()).toBe(1);
      expect(store.listCallState().status).toBe('success');
    });

    it('should merge the active filter into the request options', async () => {
      mockNotificationService.list.mockReturnValue(of(notificationCollection));
      store.setFilter({ type: 'alert' });

      store.load();
      await Promise.resolve();

      expect(mockNotificationService.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'alert', page: 1 }),
      );
    });

    it('should set error call state and dispatch loadFailed on failure', async () => {
      mockNotificationService.list.mockReturnValue(throwError(() => new Error('boom')));

      store.load();
      await Promise.resolve();

      expect(store.listCallState().status).toBe('error');
      expect(store.listError()).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Notification Store] loadFailed' }),
      );
    });
  });

  describe('loadPage', () => {
    it('should set error call state and dispatch loadFailed on failure', async () => {
      mockNotificationService.list.mockReturnValue(throwError(() => new Error('boom')));

      store.loadPage({ page: 2, limit: 10 });
      await Promise.resolve();

      expect(store.listCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Notification Store] loadFailed' }),
      );
    });
  });

  describe('loadMore', () => {
    it('should append the next page and increment currentPage on success', async () => {
      mockNotificationService.list
        .mockReturnValueOnce(of(notificationCollection))
        .mockReturnValueOnce(of(otherNotificationCollection));

      store.load();
      await Promise.resolve();
      store.loadMore();
      await Promise.resolve();

      expect(store.notifications()).toEqual([notification, otherNotification]);
      expect(store.currentPage()).toBe(2);
      expect(store.totalNotifications()).toBe(2);
    });

    it('should set error call state and dispatch loadFailed on failure', async () => {
      mockNotificationService.list
        .mockReturnValueOnce(of(notificationCollection))
        .mockReturnValueOnce(throwError(() => new Error('boom')));

      store.load();
      await Promise.resolve();
      store.loadMore();
      await Promise.resolve();

      expect(store.listCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Notification Store] loadFailed' }),
      );
    });
  });

  describe('connectMercure', () => {
    it('should prepend a pushed notification and increment the total count', () => {
      const subscription = { topic: 'topic', token: 'token' };
      const pushed = new Subject<NotificationOutput>();
      mockNotificationService.getSubscription.mockReturnValue(of(subscription));
      mockMercureService.subscribe.mockReturnValue(pushed);

      store.connectMercure();
      expect(store.mercureConnected()).toBe(true);
      expect(mockMercureService.subscribe).toHaveBeenCalledWith('topic', 'token');

      pushed.next(otherNotification);

      expect(store.notifications()).toEqual([otherNotification]);
      expect(store.totalNotifications()).toBe(1);
    });

    it('should reset the guard when the SSE stream errors', () => {
      const subscription = { topic: 'topic', token: 'token' };
      mockNotificationService.getSubscription.mockReturnValue(of(subscription));
      mockMercureService.subscribe.mockReturnValue(throwError(() => new Error('sse down')));

      store.connectMercure();

      expect(store.mercureConnected()).toBe(false);
    });

    it('should not reconnect while already connected', () => {
      const subscription = { topic: 'topic', token: 'token' };
      mockNotificationService.getSubscription.mockReturnValue(of(subscription));
      mockMercureService.subscribe.mockReturnValue(new Subject<NotificationOutput>());

      store.connectMercure();
      store.connectMercure();

      expect(mockNotificationService.getSubscription).toHaveBeenCalledTimes(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark every loaded notification read without refetching', async () => {
      mockNotificationService.list.mockReturnValue(
        of({ member: [notification], totalItems: 1, view: undefined }),
      );
      store.load();
      await Promise.resolve();
      expect(store.notifications()[0].isRead).toBe(false);

      mockNotificationService.markAllAsRead.mockReturnValue(
        of({ '@id': '', '@type': 'Notification', count: 1 }),
      );
      mockNotificationService.list.mockClear();

      store.markAllAsRead();
      await Promise.resolve();

      expect(store.notifications()[0].isRead).toBe(true);
      expect(store.unreadCount()).toBe(0);
      expect(mockNotificationService.list).not.toHaveBeenCalled();
    });

    it('should leave an already-read notification untouched', async () => {
      const read: NotificationOutput = {
        ...notification,
        isRead: true,
        readAt: '2026-04-15T11:00:00Z',
      };
      mockNotificationService.list.mockReturnValue(
        of({ member: [read], totalItems: 1, view: undefined }),
      );
      store.load();
      await Promise.resolve();

      mockNotificationService.markAllAsRead.mockReturnValue(
        of({ '@id': '', '@type': 'Notification', count: 0 }),
      );

      store.markAllAsRead();
      await Promise.resolve();

      expect(store.notifications()[0].readAt).toBe('2026-04-15T11:00:00Z');
    });

    it('should set error call state and dispatch markAllAsReadFailed on failure', async () => {
      mockNotificationService.markAllAsRead.mockReturnValue(throwError(() => new Error('boom')));

      store.markAllAsRead();
      await Promise.resolve();

      expect(store.markAllAsReadCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Notification Store] markAllAsReadFailed' }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should set error call state and dispatch markAsReadFailed on failure', async () => {
      mockNotificationService.markAsRead.mockReturnValue(throwError(() => new Error('boom')));

      store.markAsRead(notification.id);
      await Promise.resolve();

      expect(store.markAsReadCallState().status).toBe('error');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Notification Store] markAsReadFailed' }),
      );
    });

    it('should record success without touching entities when the notification is not loaded', async () => {
      const updatedNotification: NotificationOutput = {
        ...otherNotification,
        isRead: true,
        readAt: '2026-04-15T11:00:00Z',
      };
      mockNotificationService.markAsRead.mockReturnValue(of(updatedNotification));

      store.markAsRead(otherNotification.id);
      await Promise.resolve();

      expect(store.notifications()).toEqual([]);
      expect(store.markAsReadCallState().data).toEqual(updatedNotification);
    });
  });

  describe('synchronizeNotification', () => {
    it('should replace an entity that is already present in the collection', async () => {
      mockNotificationService.list.mockReturnValue(of(notificationCollection));
      store.load();
      await Promise.resolve();

      const updated: NotificationOutput = { ...notification, subject: 'Updated subject' };
      store.synchronizeNotification(updated);

      expect(store.notifications()).toEqual([updated]);
    });

    it('should be a no-op when the notification is not in the collection', () => {
      store.synchronizeNotification(notification);

      expect(store.notifications()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should reset entities and scalar state to their initial values', async () => {
      mockNotificationService.list.mockReturnValue(of(notificationCollection));
      store.load();
      await Promise.resolve();
      store.setFilter({ type: 'alert' });

      store.clear();

      expect(store.notifications()).toEqual([]);
      expect(store.totalNotifications()).toBe(0);
      expect(store.currentPage()).toBe(1);
      expect(store.listCallState().status).toBe('idle');
      expect(store.activeFilter()).toBeNull();
    });
  });

  describe('loadTypes', () => {
    it('should fetch and cache types on success', () => {
      mockNotificationService.listTypes.mockReturnValue(of(notificationTypes));

      store.loadTypes();

      expect(store.types()).toEqual(notificationTypes);
      expect(store.typesLoaded()).toBe(true);
    });

    it('should silently ignore API failures and leave typesLoaded false', () => {
      mockNotificationService.listTypes.mockReturnValue(throwError(() => new Error('boom')));

      store.loadTypes();

      expect(store.typesLoaded()).toBe(false);
      expect(store.types()).toEqual([]);
    });

    it('should not refetch once types are loaded', () => {
      mockNotificationService.listTypes.mockReturnValue(of(notificationTypes));

      store.loadTypes();
      store.loadTypes();

      expect(mockNotificationService.listTypes).toHaveBeenCalledTimes(1);
    });
  });

  describe('setFilter', () => {
    it('should set and clear the active filter', () => {
      store.setFilter({ type: 'alert' });
      expect(store.activeFilter()).toEqual({ type: 'alert' });

      store.setFilter(null);
      expect(store.activeFilter()).toBeNull();
    });
  });

  describe('computed signals', () => {
    it('should report isLoading and isLoadingMore during list/load-more requests', () => {
      mockNotificationService.list.mockReturnValue(
        new Subject<HydraCollection<NotificationOutput>>(),
      );

      store.load();
      expect(store.isLoading()).toBe(true);
      expect(store.isLoadingMore()).toBe(false);
    });

    it('should report isMarkingAsRead while a mark-as-read request is pending', () => {
      mockNotificationService.markAsRead.mockReturnValue(new Subject<NotificationOutput>());

      store.markAsRead(notification.id);

      expect(store.isMarkingAsRead()).toBe(true);
    });

    it('should compute unreadCount and hasUnread from the loaded collection', async () => {
      const readNotification: NotificationOutput = { ...otherNotification, isRead: true };
      const mixedCollection: HydraCollection<NotificationOutput> = {
        '@id': '/api/notifications?page=1',
        '@type': 'Collection',
        totalItems: 2,
        member: [notification, readNotification],
      };
      mockNotificationService.list.mockReturnValue(of(mixedCollection));

      store.load();
      await Promise.resolve();

      expect(store.unreadCount()).toBe(1);
      expect(store.hasUnread()).toBe(true);
    });

    it('should report hasMore when fewer entities are loaded than totalNotifications', async () => {
      mockNotificationService.list.mockReturnValue(of(otherNotificationCollection));

      store.load();
      await Promise.resolve();

      expect(store.hasMore()).toBe(true);
    });

    it('should report listError as null when there is no error', () => {
      expect(store.listError()).toBeNull();
    });
  });

  describe('session teardown', () => {
    /**
     * The real `Dispatcher` is required here: the store reacts through `Events`,
     * which only sees what a genuine dispatcher publishes. The shared `configure()`
     * replaces it with a spy, so these tests build their own TestBed.
     */
    const configureWithRealDispatcher = () => {
      mockNotificationService = {
        list: vi.fn(),
        listTypes: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        getSubscription: vi.fn(),
      };
      mockMercureService = { subscribe: vi.fn() };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: NotificationService, useValue: mockNotificationService },
          { provide: MercureService, useValue: mockMercureService },
        ],
      });

      store = TestBed.inject(NotificationStore);
    };

    it('should drop the previous user notifications when the session ends', async () => {
      configureWithRealDispatcher();
      mockNotificationService.list.mockReturnValue(of(notificationCollection));

      store.load();
      await Promise.resolve();
      expect(store.notifications()).toEqual([notification]);

      TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

      expect(store.notifications()).toEqual([]);
      expect(store.totalNotifications()).toBe(0);
      expect(store.unreadCount()).toBe(0);
      expect(store.listCallState().status).toBe('idle');
    });

    it('should let the next user re-initialize after the session ended', async () => {
      configureWithRealDispatcher();
      mockNotificationService.list.mockReturnValue(of(notificationCollection));

      await store.initialize();
      expect(mockNotificationService.list).toHaveBeenCalledTimes(1);

      TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

      // `initialize()` memoizes its promise; if `clear()` did not drop that memo the
      // next user would silently reuse the previous one and never refetch.
      mockNotificationService.list.mockReturnValue(of(otherNotificationCollection));
      await store.initialize();

      expect(mockNotificationService.list).toHaveBeenCalledTimes(2);
      expect(store.notifications()).toEqual([otherNotification]);
    });

    it('should stop the Mercure stream when the session ends', async () => {
      configureWithRealDispatcher();
      const pushed = new Subject<NotificationOutput>();
      mockNotificationService.getSubscription.mockReturnValue(
        of({ topic: 'topic', token: 'token' }),
      );
      mockMercureService.subscribe.mockReturnValue(pushed.asObservable());

      store.connectMercure();
      await Promise.resolve();

      TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

      // The hub streams with the departing user's token: anything it pushes after
      // logout must not reach the store the next user reads.
      pushed.next(otherNotification);

      expect(store.notifications()).toEqual([]);
      expect(pushed.observed).toBe(false);
    });
  });
});
