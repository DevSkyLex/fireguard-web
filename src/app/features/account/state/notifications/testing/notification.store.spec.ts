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
    getSubscription: ReturnType<typeof vi.fn>;
  };
  let mockMercureService: { subscribe: ReturnType<typeof vi.fn> };

  const configure = (platformId: 'browser' | 'server' = 'browser') => {
    mockDispatcher = { dispatch: vi.fn() };
    mockNotificationService = {
      list: vi.fn(),
      listTypes: vi.fn(),
      markAsRead: vi.fn(),
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
});
