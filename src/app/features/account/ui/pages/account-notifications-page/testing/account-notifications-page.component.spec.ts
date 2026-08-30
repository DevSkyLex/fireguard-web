import {
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { StoreError } from '@core/request-state';
import type {
  NotificationFilter,
  NotificationOutput,
  NotificationPreferenceOutput,
  NotificationTypeOutput,
  UpdateNotificationPreferencesInput,
} from '@features/account/models';
import { AccountNotificationPreferencesStore, NotificationStore } from '@features/account/state';
import { AccountNotificationsPage } from '../account-notifications-page.component';

const TYPES: ReadonlyArray<NotificationTypeOutput> = [
  {
    '@id': '/api/notification-types/1',
    '@type': 'NotificationType',
    type: 'intervention.published',
    category: 'intervention',
  },
  {
    '@id': '/api/notification-types/2',
    '@type': 'NotificationType',
    type: 'non_conformity.opened',
    category: 'non_conformity',
  },
  {
    '@id': '/api/notification-types/3',
    '@type': 'NotificationType',
    type: 'intervention.assigned',
    category: 'intervention',
  },
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
    typesLoaded: WritableSignal<boolean>;
    activeFilter: WritableSignal<NotificationFilter | null>;
    isLoading: WritableSignal<boolean>;
    isLoadingMore: WritableSignal<boolean>;
    isMarkingAllAsRead: WritableSignal<boolean>;
    hasMore: WritableSignal<boolean>;
    unreadCount: WritableSignal<number>;
    listError: WritableSignal<StoreError | null>;
  };
  let preferencesStore: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    preferences: WritableSignal<ReadonlyArray<NotificationPreferenceOutput>>;
    isLoading: WritableSignal<boolean>;
    isSaving: WritableSignal<boolean>;
    loadError: WritableSignal<StoreError | null>;
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const switchFor = (testId: string): HTMLElement =>
    root().querySelector(`[data-testid="${testId}"] [role="switch"]`) as HTMLElement;

  const click = async (element: HTMLElement): Promise<void> => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
  };

  const openPreferences = async (): Promise<void> => {
    fixture.componentRef.setInput('tab', 'preferences');
    await fixture.whenStable();
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
      typesLoaded: signal(true),
      activeFilter: signal<NotificationFilter | null>(null),
      isLoading: signal(false),
      isLoadingMore: signal(false),
      isMarkingAllAsRead: signal(false),
      hasMore: signal(false),
      unreadCount: signal(0),
      listError: signal<StoreError | null>(null),
    };
    preferencesStore = {
      load: vi.fn(),
      save: vi.fn(),
      preferences: signal<ReadonlyArray<NotificationPreferenceOutput>>([
        { category: 'non_conformity', emailEnabled: false, mercureEnabled: true, updatedAt: null },
      ]),
      isLoading: signal(false),
      isSaving: signal(false),
      loadError: signal<StoreError | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [AccountNotificationsPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: NotificationStore, useValue: store },
      ],
    })
      .overrideComponent(AccountNotificationsPage, {
        set: {
          providers: [{ provide: AccountNotificationPreferencesStore, useValue: preferencesStore }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountNotificationsPage);
    await fixture.whenStable();
  });

  it('should load the type catalog backing both panes', () => {
    expect(store.loadTypes).toHaveBeenCalled();
  });

  it('should not refetch the feed the account provider already primed', () => {
    expect(store.load).not.toHaveBeenCalled();
  });

  it('should open on the inbox when no tab is requested', () => {
    expect(fixture.componentInstance['activeTab']()).toBe('inbox');
  });

  it('should fall back to the inbox for an unrecognized tab', async () => {
    fixture.componentRef.setInput('tab', 'nonsense');
    await fixture.whenStable();

    expect(fixture.componentInstance['activeTab']()).toBe('inbox');
  });

  it('should not fetch the preference matrix until its tab opens', () => {
    expect(preferencesStore.load).not.toHaveBeenCalled();
  });

  it('should fetch the preference matrix once when its tab opens', async () => {
    await openPreferences();
    fixture.componentRef.setInput('tab', 'inbox');
    await fixture.whenStable();
    await openPreferences();

    expect(preferencesStore.load).toHaveBeenCalledTimes(1);
  });

  it('should offer each category once, sorted', () => {
    expect(fixture.componentInstance['categories']()).toEqual(['intervention', 'non_conformity']);
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
    store.activeFilter.set({ category: 'intervention' });
    await fixture.whenStable();

    expect(fixture.componentInstance['activeCategory']()).toBe('intervention');
  });

  it('should say the reader is caught up when nothing is unread', () => {
    expect(root().textContent).toContain('all caught up');
  });

  it('should show the unread count when there is one', async () => {
    store.unreadCount.set(4);
    await fixture.whenStable();

    expect(root().textContent).toContain('4');
    expect(root().textContent).not.toContain('all caught up');
  });

  it('should clear every unread notification at once', async () => {
    store.unreadCount.set(3);
    await fixture.whenStable();

    await click(
      root().querySelector('[data-testid="account-notifications-mark-all"]') as HTMLElement,
    );

    expect(store.markAllAsRead).toHaveBeenCalled();
  });

  it('should render one sorted matrix row per distinct category with defaults merged', async () => {
    await openPreferences();

    const labels: string[] = Array.from(root().querySelectorAll('tbody th[scope="row"]')).map(
      (cell: Element): string => cell.textContent?.trim() ?? '',
    );

    expect(labels).toEqual(['Intervention', 'Non conformity']);
    expect(switchFor('notif-pref-email-intervention').getAttribute('data-state')).toBe('checked');
    expect(switchFor('notif-pref-in-app-intervention').getAttribute('data-state')).toBe('checked');
    expect(switchFor('notif-pref-email-non_conformity').getAttribute('data-state')).toBe(
      'unchecked',
    );
    expect(switchFor('notif-pref-in-app-non_conformity').getAttribute('data-state')).toBe(
      'checked',
    );
  });

  it('should commit the complete row immediately when a switch flips', async () => {
    await openPreferences();
    await click(switchFor('notif-pref-email-intervention'));

    const expected: UpdateNotificationPreferencesInput = {
      preferences: [{ category: 'intervention', emailEnabled: false, mercureEnabled: true }],
    };

    expect(preferencesStore.save).toHaveBeenCalledWith(expected);
  });

  it('should announce matrix state changes through a polite live region', async () => {
    await openPreferences();

    const region: HTMLElement | null = root().querySelector('[aria-live="polite"]');

    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(region?.querySelector('table')).not.toBeNull();
  });

  it('should show the matrix skeleton with its screen-reader text while either half is on its way', async () => {
    store.types.set([]);
    store.typesLoaded.set(false);
    await openPreferences();

    const loading: HTMLElement | null = root().querySelector('[data-testid="notif-pref-loading"]');

    expect(loading).not.toBeNull();
    expect(loading?.textContent).toContain('Loading your notification preferences');
  });

  it('should show the matrix error surface with a retry that reloads', async () => {
    preferencesStore.loadError.set({ message: 'Server Error' } as StoreError);
    store.types.set([]);
    await openPreferences();

    const errorPanel: HTMLElement | null = root().querySelector('[data-testid="notif-pref-error"]');
    expect(errorPanel).not.toBeNull();

    preferencesStore.load.mockClear();
    await click(errorPanel?.querySelector('button') as HTMLElement);

    expect(preferencesStore.load).toHaveBeenCalledTimes(1);
  });

  it('should say so when no notification categories are available', async () => {
    store.types.set([]);
    await openPreferences();

    expect(root().querySelector('[data-testid="notif-pref-empty"]')).not.toBeNull();
  });
});
