import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import { NotificationService } from '@features/account/data-access';
import type {
  NotificationPreferencesOutput,
  UpdateNotificationPreferencesInput,
} from '@features/account/models';
import { AccountNotificationPreferencesStore } from '../account-notification-preferences.store';

interface MockNotificationService {
  readonly getPreferences: ReturnType<
    typeof vi.fn<() => Observable<NotificationPreferencesOutput>>
  >;
  readonly updatePreferences: ReturnType<
    typeof vi.fn<
      (input: UpdateNotificationPreferencesInput) => Observable<NotificationPreferencesOutput>
    >
  >;
}

interface SetupResult {
  readonly store: AccountNotificationPreferencesStore;
  readonly mockNotificationService: MockNotificationService;
}

const LOADED_OUTPUT: NotificationPreferencesOutput = {
  '@id': '/api/notifications/preferences',
  '@type': 'Notification',
  preferences: [
    { category: 'organization', emailEnabled: false, mercureEnabled: true, updatedAt: null },
  ],
};

const SAVED_OUTPUT: NotificationPreferencesOutput = {
  '@id': '/api/notifications/preferences',
  '@type': 'Notification',
  preferences: [
    { category: 'organization', emailEnabled: false, mercureEnabled: true, updatedAt: null },
    {
      category: 'intervention',
      emailEnabled: true,
      mercureEnabled: false,
      updatedAt: '2026-08-27T10:00:00+00:00',
    },
  ],
};

const SAVE_INPUT: UpdateNotificationPreferencesInput = {
  preferences: [{ category: 'intervention', emailEnabled: true, mercureEnabled: false }],
};

describe('AccountNotificationPreferencesStore', () => {
  const setup = (): SetupResult => {
    const mockNotificationService: MockNotificationService = {
      getPreferences: vi.fn<() => Observable<NotificationPreferencesOutput>>(() =>
        of(LOADED_OUTPUT),
      ),
      updatePreferences: vi.fn<
        (input: UpdateNotificationPreferencesInput) => Observable<NotificationPreferencesOutput>
      >(() => of(SAVED_OUTPUT)),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountNotificationPreferencesStore,
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    const store: AccountNotificationPreferencesStore = TestBed.inject(
      AccountNotificationPreferencesStore,
    );
    return { store, mockNotificationService };
  };

  it('should start idle with no rows', () => {
    const { store, mockNotificationService } = setup();

    expect(store.preferences()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.isSaving()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(mockNotificationService.getPreferences).not.toHaveBeenCalled();
  });

  it('should load the customized rows into the canonical set', () => {
    const { store, mockNotificationService } = setup();

    store.load();

    expect(mockNotificationService.getPreferences).toHaveBeenCalledTimes(1);
    expect(store.preferences()).toEqual(LOADED_OUTPUT.preferences);
    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBeNull();
  });

  it('should expose a load error and keep no phantom rows when the load fails', () => {
    const { store, mockNotificationService } = setup();
    mockNotificationService.getPreferences.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load();

    expect(store.loadError()).not.toBeNull();
    expect(store.preferences()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  it('should replace the canonical set with the PATCH response on save', () => {
    const { store, mockNotificationService } = setup();
    store.load();

    store.save(SAVE_INPUT);

    expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith(SAVE_INPUT);
    expect(store.preferences()).toEqual(SAVED_OUTPUT.preferences);
    expect(store.isSaving()).toBe(false);
  });

  it('should keep the canonical rows untouched when the save fails', () => {
    const { store, mockNotificationService } = setup();
    store.load();
    mockNotificationService.updatePreferences.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );

    store.save(SAVE_INPUT);

    expect(store.preferences()).toEqual(LOADED_OUTPUT.preferences);
    expect(store.isSaving()).toBe(false);
    expect(store.loadError()).toBeNull();
  });
});
