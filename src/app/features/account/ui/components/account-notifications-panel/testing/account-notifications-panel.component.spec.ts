import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CallState } from '@core/request-state';
import type { NotificationOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { AccountNotificationsPanel } from '../account-notifications-panel.component';

describe('AccountNotificationsPanel', () => {
  const buildMockNotificationStore = () => {
    return {
      notifications: signal<NotificationOutput[]>([]),
      totalNotifications: signal(0),
      isLoading: signal(false),
      isLoadingMore: signal(false),
      isMarkingAsRead: signal(false),
      hasUnread: signal(false),
      hasMore: signal(false),
      unreadCount: signal(0),
      listError: signal(null),
      currentPage: signal(1),
      itemsPerPage: signal(10),
      listCallState: signal({ status: 'idle', data: null, error: null }),
      markAsReadCallState: signal<CallState<NotificationOutput>>({
        status: 'idle',
        data: null,
        error: null,
      }),
      load: vi.fn(),
      loadMore: vi.fn(),
      loadPage: vi.fn(),
      loadTypes: vi.fn(),
      markAsRead: vi.fn(),
      synchronizeNotification: vi.fn(),
    };
  };

  const setup = () => {
    const mockNotificationStore = buildMockNotificationStore();

    TestBed.configureTestingModule({
      providers: [{ provide: NotificationStore, useValue: mockNotificationStore }],
    });

    const component = TestBed.runInInjectionContext(() => new AccountNotificationsPanel());
    return { component, mockNotificationStore };
  };

  it('should call markAsRead with the correct id', () => {
    const { component, mockNotificationStore } = setup();
    const notification = { id: 'abc-123' } as NotificationOutput;

    component.onMarkAsRead(notification);

    expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('abc-123');
  });

  it('should load the requested page on load', () => {
    const { component, mockNotificationStore } = setup();

    component.onLoad({ page: 2, itemsPerPage: 20 });

    expect(mockNotificationStore.loadPage).toHaveBeenCalledWith({ page: 2, limit: 20 });
  });

  it('should retry the last requested page', () => {
    const { component, mockNotificationStore } = setup();

    component.onLoad({ page: 3, itemsPerPage: 20 });
    (component as unknown as { retry: () => void }).retry();

    expect(mockNotificationStore.loadPage).toHaveBeenLastCalledWith({ page: 3, limit: 20 });
  });

  it('should synchronize a local mark-as-read success with the root notification store', () => {
    const localNotificationStore = buildMockNotificationStore();
    const rootNotificationStore = buildMockNotificationStore();
    const updatedNotification = {
      id: 'abc-123',
      isRead: true,
    } as NotificationOutput;

    TestBed.configureTestingModule({
      imports: [AccountNotificationsPanel],
      providers: [{ provide: NotificationStore, useValue: rootNotificationStore }],
    });
    TestBed.overrideComponent(AccountNotificationsPanel, {
      set: {
        providers: [{ provide: NotificationStore, useValue: localNotificationStore }],
      },
    });
    const fixture = TestBed.createComponent(AccountNotificationsPanel);

    localNotificationStore.markAsReadCallState.set({
      status: 'success',
      data: updatedNotification,
      error: null,
    });
    TestBed.flushEffects();

    expect(rootNotificationStore.synchronizeNotification).toHaveBeenCalledWith(updatedNotification);
    fixture.destroy();
  });
});
