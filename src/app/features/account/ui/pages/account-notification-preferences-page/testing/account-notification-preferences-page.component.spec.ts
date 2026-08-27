import {
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type {
  NotificationPreferenceOutput,
  NotificationTypeOutput,
  UpdateNotificationPreferencesInput,
} from '@features/account/models';
import { AccountNotificationPreferencesStore, NotificationStore } from '@features/account/state';
import { AccountNotificationPreferencesPage } from '../account-notification-preferences-page.component';

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

describe('AccountNotificationPreferencesPage', () => {
  let fixture: ComponentFixture<AccountNotificationPreferencesPage>;
  let notificationStore: {
    loadTypes: ReturnType<typeof vi.fn>;
    types: WritableSignal<ReadonlyArray<NotificationTypeOutput>>;
    typesLoaded: WritableSignal<boolean>;
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

  beforeEach(async () => {
    notificationStore = {
      loadTypes: vi.fn(),
      types: signal<ReadonlyArray<NotificationTypeOutput>>(TYPES),
      typesLoaded: signal(true),
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
      imports: [AccountNotificationPreferencesPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: NotificationStore, useValue: notificationStore },
      ],
    })
      .overrideComponent(AccountNotificationPreferencesPage, {
        set: {
          providers: [{ provide: AccountNotificationPreferencesStore, useValue: preferencesStore }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountNotificationPreferencesPage);
    await fixture.whenStable();
  });

  it('should load the type catalog and the customized preference set', () => {
    expect(notificationStore.loadTypes).toHaveBeenCalled();
    expect(preferencesStore.load).toHaveBeenCalled();
  });

  it('should render one sorted row per distinct category with defaults merged', () => {
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
    await click(switchFor('notif-pref-email-intervention'));

    const expected: UpdateNotificationPreferencesInput = {
      preferences: [{ category: 'intervention', emailEnabled: false, mercureEnabled: true }],
    };

    expect(preferencesStore.save).toHaveBeenCalledWith(expected);
  });

  it('should announce state changes through a polite live region', () => {
    const region: HTMLElement | null = root().querySelector('[aria-live="polite"]');

    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(region?.querySelector('table')).not.toBeNull();
  });

  it('should show the loading skeleton with its screen-reader text while either half is on its way', async () => {
    notificationStore.types.set([]);
    notificationStore.typesLoaded.set(false);
    await fixture.whenStable();

    const loading: HTMLElement | null = root().querySelector('[data-testid="notif-pref-loading"]');
    expect(loading).not.toBeNull();
    expect(loading?.textContent).toContain('Loading your notification preferences');
  });

  it('should show the error surface with a retry that reloads', async () => {
    preferencesStore.loadError.set({ message: 'Server Error' } as StoreError);
    notificationStore.types.set([]);
    await fixture.whenStable();

    const errorPanel: HTMLElement | null = root().querySelector('[data-testid="notif-pref-error"]');
    expect(errorPanel).not.toBeNull();

    preferencesStore.load.mockClear();
    const retryButton: HTMLElement | null = errorPanel?.querySelector('button') ?? null;
    retryButton?.click();
    await fixture.whenStable();

    expect(preferencesStore.load).toHaveBeenCalledTimes(1);
  });

  it('should say so when no categories are available', async () => {
    notificationStore.types.set([]);
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="notif-pref-empty"]')).not.toBeNull();
  });
});
