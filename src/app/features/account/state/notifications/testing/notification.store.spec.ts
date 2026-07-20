import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService } from '@core/mercure';
import { NotificationService } from '@features/account/data-access';
import type { NotificationOutput, NotificationTypeOutput } from '@features/account/models';
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
    getUnreadCount: ReturnType<typeof vi.fn>;
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
      // The badge reads the authoritative total; the loaded page under-counts.
      getUnreadCount: vi.fn(() => of({ count: 0 })),
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

  afterEach(() => {
    vi.useRealTimers();
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

  it('should fetch notifications and write them to transfer state when not hydrated', async () => {
    mockNotificationService.list.mockReturnValue(of(notificationCollection));

    await store.initialize();

    expect(mockNotificationService.list).toHaveBeenCalledTimes(1);
    expect(store.notifications()).toEqual([notification]);
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

  // The transport has no reconnect of its own, so a single failure must not end
  // the channel — and each attempt must re-request a subscription, because the
  // subscriber JWT expires and a replayed one would be rejected.
  it('should retry the Mercure subscription rather than give up on first failure', async () => {
    vi.useFakeTimers();
    mockNotificationService.getSubscription.mockReturnValue(
      throwError(() => new Error('Mercure bootstrap failed')),
    );

    store.connectMercure();
    await vi.advanceTimersByTimeAsync(1_500);

    expect(mockNotificationService.getSubscription.mock.calls.length).toBeGreaterThan(1);
    expect(store.mercureConnected()).toBe(true);
  });

  it('should reset the Mercure guard once reconnection is abandoned', async () => {
    vi.useFakeTimers();
    mockNotificationService.getSubscription.mockReturnValue(
      throwError(() => new Error('Mercure bootstrap failed')),
    );

    store.connectMercure();
    // Past the full 1+2+4+8+16+30+30+30s backoff budget.
    await vi.advanceTimersByTimeAsync(130_000);

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

  // The badge used to count the loaded entities only, so a user with more
  // unread items than one page holds saw the page size and never the truth.
  it('should report the unread total the server gives, not the loaded page', async () => {
    configure();
    mockNotificationService.list.mockReturnValue(of(notificationCollection));
    mockNotificationService.getUnreadCount.mockReturnValue(of({ count: 214 }));

    store = TestBed.inject(NotificationStore);
    await store.initialize();

    expect(store.unreadCount()).toBe(214);
    expect(store.hasUnread()).toBe(true);
  });

  it('should fall back to the loaded page before the total is known', () => {
    configure();
    store = TestBed.inject(NotificationStore);

    // Nothing loaded and no total yet: the badge must not claim anything.
    expect(store.unreadCount()).toBe(0);
  });

  // Looping single-id calls left everything past the loaded page unread, and
  // markAsRead is an exhaustMap action so all but the first were dropped.
  it('should mark everything read in one call and zero the badge', async () => {
    configure();
    mockNotificationService.list.mockReturnValue(of(notificationCollection));
    mockNotificationService.getUnreadCount.mockReturnValue(of({ count: 214 }));
    mockNotificationService.markAllAsRead.mockReturnValue(of({ count: 214 }));

    store = TestBed.inject(NotificationStore);
    await store.initialize();

    store.markAllAsRead();
    await Promise.resolve();

    expect(mockNotificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.markAsRead).not.toHaveBeenCalled();
    expect(store.unreadCount()).toBe(0);
    expect(store.notifications().every((entry) => entry.isRead)).toBe(true);
  });
});
