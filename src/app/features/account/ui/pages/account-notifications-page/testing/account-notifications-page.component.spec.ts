import {
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type {
  NotificationFilter,
  NotificationOutput,
  NotificationTypeOutput,
} from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { AccountNotificationsPage } from '../account-notifications-page.component';

const TYPES: ReadonlyArray<NotificationTypeOutput> = [
  { '@id': '/api/notification-types/1', '@type': 'NotificationType', type: 'a', category: 'work' },
  {
    '@id': '/api/notification-types/2',
    '@type': 'NotificationType',
    type: 'b',
    category: 'billing',
  },
  { '@id': '/api/notification-types/3', '@type': 'NotificationType', type: 'c', category: 'work' },
];

describe('AccountNotificationsPage', () => {
  let fixture: ComponentFixture<AccountNotificationsPage>;
  let store: {
    loadTypes: ReturnType<typeof vi.fn>;
    loadUnreadCount: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    loadMore: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
    notifications: WritableSignal<ReadonlyArray<NotificationOutput>>;
    types: WritableSignal<ReadonlyArray<NotificationTypeOutput>>;
    activeFilter: WritableSignal<NotificationFilter | null>;
    isLoading: WritableSignal<boolean>;
    isLoadingMore: WritableSignal<boolean>;
    isMarkingAllAsRead: WritableSignal<boolean>;
    hasMore: WritableSignal<boolean>;
    unreadCount: WritableSignal<number>;
    listError: WritableSignal<StoreError | null>;
  };

  beforeEach(async () => {
    store = {
      loadTypes: vi.fn(),
      loadUnreadCount: vi.fn(),
      load: vi.fn(),
      loadMore: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      setFilter: vi.fn(),
      notifications: signal<ReadonlyArray<NotificationOutput>>([]),
      types: signal<ReadonlyArray<NotificationTypeOutput>>(TYPES),
      activeFilter: signal<NotificationFilter | null>(null),
      isLoading: signal(false),
      isLoadingMore: signal(false),
      isMarkingAllAsRead: signal(false),
      hasMore: signal(false),
      unreadCount: signal(0),
      listError: signal<StoreError | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: NotificationStore, useValue: store },
      ],
    });

    fixture = TestBed.createComponent(AccountNotificationsPage);
    await fixture.whenStable();
  });

  it('should load the type catalog backing the filters', () => {
    expect(store.loadTypes).toHaveBeenCalled();
  });

  it('should not refetch the feed the account provider already primed', () => {
    // `NotificationStore` is root-provided and initialized once the profile
    // lands; loading again here would duplicate that request on every visit.
    expect(store.load).not.toHaveBeenCalled();
  });

  it('should offer each category once, sorted', () => {
    expect(fixture.componentInstance['categories']()).toEqual(['billing', 'work']);
  });

  it('should apply a category filter', () => {
    fixture.componentInstance['filterByCategory']('work');

    expect(store.setFilter).toHaveBeenCalledWith({ category: 'work' });
  });

  it('should clear the filter rather than send an empty one', () => {
    fixture.componentInstance['filterByCategory'](null);

    expect(store.setFilter).toHaveBeenCalledWith(null);
  });

  it('should reflect the active filter back to the list', async () => {
    store.activeFilter.set({ category: 'billing' });
    await fixture.whenStable();

    expect(fixture.componentInstance['activeCategory']()).toBe('billing');
  });

  it('should say the reader is caught up when nothing is unread', () => {
    expect(fixture.nativeElement.textContent).toContain('all caught up');
  });

  it('should show the unread count when there is one', async () => {
    store.unreadCount.set(4);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('4');
    expect(fixture.nativeElement.textContent).not.toContain('all caught up');
  });

  it('should clear every unread notification at once', async () => {
    store.unreadCount.set(3);
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-notifications-mark-all"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(store.markAllAsRead).toHaveBeenCalled();
  });
});
