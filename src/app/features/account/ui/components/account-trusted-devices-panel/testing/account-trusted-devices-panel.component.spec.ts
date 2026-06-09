import { TestBed } from '@angular/core/testing';
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

  const setup = () => {
    const mockTrustedDeviceStore = {
      loadDevices: vi.fn(),
      revokeDevice: vi.fn(),
      revokeAllDevices: vi.fn(),
    };
    const mockConfirmationService = {
      confirm: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TrustedDeviceStore, useValue: mockTrustedDeviceStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AccountTrustedDevicesPanel());
    return { component, mockTrustedDeviceStore, mockConfirmationService };
  };

  it('should load devices on construction', () => {
    const { mockTrustedDeviceStore } = setup();

    expect(mockTrustedDeviceStore.loadDevices).toHaveBeenCalledTimes(1);
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
