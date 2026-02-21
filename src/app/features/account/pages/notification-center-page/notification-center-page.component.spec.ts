import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationStore } from '@core/stores/notification';
import { NotificationCenterPage } from './notification-center-page.component';
import type { NotificationOutput } from '@core/models/notification';

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
      load: vi.fn(),
      loadTypes: vi.fn(),
      markAsRead: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationStore, useValue: mockNotificationStore },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new NotificationCenterPage());
    return { component, mockNotificationStore };
  };

  it('should call load and loadTypes on init', () => {
    const { component, mockNotificationStore } = setup();

    component.ngOnInit();

    expect(mockNotificationStore.load).toHaveBeenCalledTimes(1);
    expect(mockNotificationStore.loadTypes).toHaveBeenCalledTimes(1);
  });

  it('should call markAsRead with the correct id', () => {
    const { component, mockNotificationStore } = setup();

    component.onMarkAsRead('abc-123');

    expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('abc-123');
  });
});
