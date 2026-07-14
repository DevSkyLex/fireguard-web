import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import { TotpService } from '@features/account/data-access';
import type {
  ConfirmTotpOutput,
  DisableTotpOutput,
  SetupTotpOutput,
} from '@features/account/models';
import { UserStore } from '../../user';
import { AccountTotpEnrollmentStore } from '../account-totp-enrollment.store';

interface MockTotpService {
  readonly setup: ReturnType<typeof vi.fn<() => Observable<SetupTotpOutput>>>;
  readonly confirm: ReturnType<typeof vi.fn<(code: string) => Observable<ConfirmTotpOutput>>>;
  readonly disable: ReturnType<typeof vi.fn<(code: string) => Observable<DisableTotpOutput>>>;
}

interface MockUserStore {
  readonly reload: ReturnType<typeof vi.fn<() => void>>;
}

interface SetupResult {
  readonly store: AccountTotpEnrollmentStore;
  readonly mockTotpService: MockTotpService;
  readonly mockUserStore: MockUserStore;
}

const SETUP_OUTPUT: SetupTotpOutput = {
  '@id': '',
  '@type': 'Totp',
  secret: 'JBSWY3DPEHPK3PXP',
  qrCodeUri: 'otpauth://totp/FireGuard%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP',
};

describe('AccountTotpEnrollmentStore', () => {
  const setup = (): SetupResult => {
    const mockTotpService: MockTotpService = {
      setup: vi.fn<() => Observable<SetupTotpOutput>>(() => of(SETUP_OUTPUT)),
      confirm: vi.fn<(code: string) => Observable<ConfirmTotpOutput>>(() =>
        of({ '@id': '', '@type': 'Totp', success: true }),
      ),
      disable: vi.fn<(code: string) => Observable<DisableTotpOutput>>(() =>
        of({ '@id': '', '@type': 'Totp', success: true }),
      ),
    };
    const mockUserStore: MockUserStore = {
      reload: vi.fn<() => void>(),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountTotpEnrollmentStore,
        { provide: TotpService, useValue: mockTotpService },
        { provide: UserStore, useValue: mockUserStore },
      ],
    });

    const store: AccountTotpEnrollmentStore = TestBed.inject(AccountTotpEnrollmentStore);
    return { store, mockTotpService, mockUserStore };
  };

  describe('setup', () => {
    it('should generate a pending secret and expose it as the setup result', () => {
      const { store } = setup();

      store.setup();

      expect(store.setupResult()).toEqual(SETUP_OUTPUT);
      expect(store.isSettingUp()).toBe(false);
      expect(store.setupError()).toBeNull();
    });

    it('should expose a setup error on failure', () => {
      const { store, mockTotpService } = setup();
      mockTotpService.setup.mockReturnValueOnce(throwError(() => new Error('boom')));

      store.setup();

      expect(store.setupError()).not.toBeNull();
      expect(store.setupResult()).toBeNull();
    });
  });

  describe('confirm', () => {
    it('should activate TOTP and reload the user profile on success', () => {
      const { store, mockTotpService, mockUserStore } = setup();

      store.confirm('123456');

      expect(mockTotpService.confirm).toHaveBeenCalledWith('123456');
      expect(store.isConfirming()).toBe(false);
      expect(store.confirmError()).toBeNull();
      expect(mockUserStore.reload).toHaveBeenCalledTimes(1);
    });

    it('should expose a confirm error and not reload on failure', () => {
      const { store, mockTotpService, mockUserStore } = setup();
      mockTotpService.confirm.mockReturnValueOnce(throwError(() => new Error('invalid code')));

      store.confirm('000000');

      expect(store.confirmError()).not.toBeNull();
      expect(mockUserStore.reload).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('should disable TOTP and reload the user profile on success', () => {
      const { store, mockTotpService, mockUserStore } = setup();

      store.disable('654321');

      expect(mockTotpService.disable).toHaveBeenCalledWith('654321');
      expect(store.isDisabling()).toBe(false);
      expect(store.disableError()).toBeNull();
      expect(mockUserStore.reload).toHaveBeenCalledTimes(1);
    });

    it('should expose a disable error and not reload on failure', () => {
      const { store, mockTotpService, mockUserStore } = setup();
      mockTotpService.disable.mockReturnValueOnce(throwError(() => new Error('invalid code')));

      store.disable('000000');

      expect(store.disableError()).not.toBeNull();
      expect(mockUserStore.reload).not.toHaveBeenCalled();
    });
  });

  describe('cancelSetup', () => {
    it('should reset the setup and confirm state back to idle', () => {
      const { store, mockTotpService } = setup();
      mockTotpService.confirm.mockReturnValueOnce(throwError(() => new Error('invalid code')));
      store.setup();
      store.confirm('000000');
      expect(store.setupResult()).not.toBeNull();
      expect(store.confirmError()).not.toBeNull();

      store.cancelSetup();

      expect(store.setupResult()).toBeNull();
      expect(store.confirmError()).toBeNull();
    });
  });
});
