import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { TrustedDeviceStore } from '@features/auth/state';
import { AccountTrustedDevicesPanel } from '../account-trusted-devices-panel.component';

describe('AccountTrustedDevicesPanel', () => {
  const buildDevice = (overrides: Partial<TrustedDeviceOutput> = {}): TrustedDeviceOutput =>
    ({
      id: 'device-1',
      name: 'Work laptop',
      ...overrides,
    }) as TrustedDeviceOutput;

  const idleCallState = { status: 'idle', data: null, error: null };
  const successCallState = { status: 'success', data: null, error: null };

  const setup = (
    storeOverrides: {
      devices?: readonly TrustedDeviceOutput[];
      totalDevices?: number;
      listCallState?: { status: string; data: null; error: { message: string | null } | null };
      revokeCallState?: { status: string; data: null; error: { message: string | null } | null };
      revokeAllCallState?: {
        status: string;
        data: null;
        error: { message: string | null } | null;
      };
      isRevokingAll?: boolean;
    } = {},
  ) => {
    const mockTrustedDeviceStore = {
      loadDevices: vi.fn(),
      revokeDevice: vi.fn(),
      revokeAllDevices: vi.fn(),
      devices: signal<readonly TrustedDeviceOutput[]>(storeOverrides.devices ?? []),
      totalDevices: signal(storeOverrides.totalDevices ?? 0),
      listCallState: signal(storeOverrides.listCallState ?? successCallState),
      revokeCallState: signal(storeOverrides.revokeCallState ?? idleCallState),
      revokeAllCallState: signal(storeOverrides.revokeAllCallState ?? idleCallState),
      isRevokingAll: signal(storeOverrides.isRevokingAll ?? false),
    };
    const mockConfirmationService = {
      confirm: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AccountTrustedDevicesPanel],
      providers: [
        { provide: TrustedDeviceStore, useValue: mockTrustedDeviceStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    });
    TestBed.overrideProvider(TrustedDeviceStore, { useValue: mockTrustedDeviceStore });

    const fixture: ComponentFixture<AccountTrustedDevicesPanel> = TestBed.createComponent(
      AccountTrustedDevicesPanel,
    );
    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance,
      mockTrustedDeviceStore,
      mockConfirmationService,
    };
  };

  describe('class logic', () => {
    it('should forward lazy table load requests to the store', () => {
      const { component, mockTrustedDeviceStore } = setup();

      (component as unknown as { load: (o: object) => void }).load({ page: 2, itemsPerPage: 10 });

      expect(mockTrustedDeviceStore.loadDevices).toHaveBeenCalledWith({
        page: 2,
        itemsPerPage: 10,
      });
    });

    it('should retry the last requested page', () => {
      const { component, mockTrustedDeviceStore } = setup();

      (component as unknown as { load: (o: object) => void }).load({ page: 3, itemsPerPage: 20 });
      (component as unknown as { reload: () => void }).reload();

      expect(mockTrustedDeviceStore.loadDevices).toHaveBeenLastCalledWith({
        page: 3,
        itemsPerPage: 20,
      });
    });

    it('should confirm before revoking a device', () => {
      const { component, mockTrustedDeviceStore, mockConfirmationService } = setup();

      (component as unknown as { revoke: (device: TrustedDeviceOutput) => void }).revoke(
        buildDevice(),
      );

      const confirmation = mockConfirmationService.confirm.mock.calls[0][0] as Confirmation;
      confirmation.accept?.();
      expect(mockTrustedDeviceStore.revokeDevice).toHaveBeenCalledWith('device-1');
    });

    it('should confirm before revoking all devices', () => {
      const { component, mockTrustedDeviceStore, mockConfirmationService } = setup();

      (component as unknown as { revokeAll: () => void }).revokeAll();

      const confirmation = mockConfirmationService.confirm.mock.calls[0][0] as Confirmation;
      confirmation.accept?.();
      expect(mockTrustedDeviceStore.revokeAllDevices).toHaveBeenCalledTimes(1);
    });
  });

  describe('rendering — populated', () => {
    it('should render the trusted device table with the store-provided devices', () => {
      const { fixture } = setup({ devices: [buildDevice()], totalDevices: 1 });

      expect(fixture.nativeElement.querySelector('app-trusted-device-table')).toBeTruthy();
    });

    it('should not render any error message when call states are idle/success', () => {
      const { fixture } = setup({ devices: [buildDevice()], totalDevices: 1 });

      expect(fixture.nativeElement.querySelectorAll('p-message').length).toBe(0);
    });
  });

  describe('rendering — empty', () => {
    it('should render the trusted device table in an empty state', () => {
      const { fixture } = setup({ devices: [], totalDevices: 0 });

      expect(fixture.nativeElement.querySelector('app-trusted-device-table')).toBeTruthy();
    });
  });

  describe('rendering — loading', () => {
    it('should pass the loading flag while the list call is pending', () => {
      const { fixture } = setup({
        listCallState: { status: 'pending', data: null, error: null },
      });

      expect(fixture.nativeElement.querySelector('app-trusted-device-table')).toBeTruthy();
    });
  });

  describe('rendering — errors', () => {
    it('should render the list load error with a retry action', () => {
      const { fixture, mockTrustedDeviceStore } = setup({
        listCallState: { status: 'error', data: null, error: { message: 'Load failed' } },
      });

      expect(fixture.nativeElement.textContent).toContain('Load failed');

      const retryButton = fixture.nativeElement.querySelector(
        'p-button button',
      ) as HTMLButtonElement | null;
      retryButton?.click();

      expect(mockTrustedDeviceStore.loadDevices).toHaveBeenCalled();
    });

    it('should render the fallback list load error copy when no message is provided', () => {
      const { fixture } = setup({
        listCallState: { status: 'error', data: null, error: { message: null } },
      });

      expect(fixture.nativeElement.textContent).toContain('Trusted devices could not be loaded.');
    });

    it('should render the revoke error with its message', () => {
      const { fixture } = setup({
        revokeCallState: { status: 'error', data: null, error: { message: 'Revoke failed' } },
      });

      expect(fixture.nativeElement.textContent).toContain('Revoke failed');
    });

    it('should render the fallback revoke error copy when no message is provided', () => {
      const { fixture } = setup({
        revokeCallState: { status: 'error', data: null, error: { message: null } },
      });

      expect(fixture.nativeElement.textContent).toContain(
        'The trusted device could not be revoked.',
      );
    });

    it('should render the revoke-all error with its message', () => {
      const { fixture } = setup({
        revokeAllCallState: {
          status: 'error',
          data: null,
          error: { message: 'Revoke all failed' },
        },
      });

      expect(fixture.nativeElement.textContent).toContain('Revoke all failed');
    });

    it('should render the fallback revoke-all error copy when no message is provided', () => {
      const { fixture } = setup({
        revokeAllCallState: { status: 'error', data: null, error: { message: null } },
      });

      expect(fixture.nativeElement.textContent).toContain('Trusted devices could not be revoked.');
    });
  });
});
