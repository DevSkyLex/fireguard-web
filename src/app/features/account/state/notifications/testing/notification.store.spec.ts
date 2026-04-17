import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { MercureService } from '@core/services/mercure';
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
});
