import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { NotificationOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { NotificationCenterPage } from '../notification-center-page.component';

describe('NotificationCenterPage', () => {
  const setup = () => {
    const mockNotificationStore = {
      notifications: signal<NotificationOutput[]>([]),
      totalNotifications: signal(0),
      isLoading: signal(false),
      isMarkingAsRead: signal(false),
      hasUnread: signal(false),
      unreadCount: signal(0),
      listError: signal(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      initializeTypes: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
      loadTypes: vi.fn(),
      markAsRead: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: NotificationStore, useValue: mockNotificationStore }],
    });

    const component = TestBed.runInInjectionContext(() => new NotificationCenterPage());
    return { component, mockNotificationStore };
  };

  it('should call initialize and initializeTypes on init', () => {
    const { component, mockNotificationStore } = setup();

    component.ngOnInit();

    expect(mockNotificationStore.initialize).toHaveBeenCalledTimes(1);
    expect(mockNotificationStore.initializeTypes).toHaveBeenCalledTimes(1);
  });

  it('should call markAsRead with the correct id', () => {
    const { component, mockNotificationStore } = setup();

    component.onMarkAsRead('abc-123');

    expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('abc-123');
  });
});

