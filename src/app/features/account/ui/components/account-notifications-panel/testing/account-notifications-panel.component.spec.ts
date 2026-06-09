import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { NotificationOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { AccountNotificationsPanel } from '../account-notifications-panel.component';

describe('AccountNotificationsPanel', () => {
  const setup = () => {
    const mockNotificationStore = {
      notifications: signal<NotificationOutput[]>([]),
      totalNotifications: signal(0),
      isLoading: signal(false),
      isLoadingMore: signal(false),
      isMarkingAsRead: signal(false),
      hasUnread: signal(false),
      hasMore: signal(false),
      unreadCount: signal(0),
      listError: signal(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      initializeTypes: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
      loadMore: vi.fn(),
      loadTypes: vi.fn(),
      markAsRead: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: NotificationStore, useValue: mockNotificationStore }],
    });

    const component = TestBed.runInInjectionContext(() => new AccountNotificationsPanel());
    return { component, mockNotificationStore };
  };

  it('should initialize reference types on init', () => {
    const { component, mockNotificationStore } = setup();

    component.ngOnInit();

    expect(mockNotificationStore.initialize).not.toHaveBeenCalled();
    expect(mockNotificationStore.initializeTypes).toHaveBeenCalledTimes(1);
  });

  it('should call markAsRead with the correct id', () => {
    const { component, mockNotificationStore } = setup();

    component.onMarkAsRead('abc-123');

    expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('abc-123');
  });

  it('should load the next page on loadMore', () => {
    const { component, mockNotificationStore } = setup();

    component.onLoadMore();

    expect(mockNotificationStore.loadMore).toHaveBeenCalledTimes(1);
  });
});
