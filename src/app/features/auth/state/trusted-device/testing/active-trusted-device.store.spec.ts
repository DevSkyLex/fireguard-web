import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { TrustedDeviceService } from '@features/auth/data-access';
import type { TrustDeviceOutput } from '@features/auth/models';
import { ActiveTrustedDeviceStore } from '../active-trusted-device.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveTrustedDeviceStore', () => {
  let store: ActiveTrustedDeviceStore;
  let mockTrustedDeviceService: {
    trustDevice: ReturnType<typeof vi.fn>;
  };

  const trustedDevice = {
    '@id': '/api/auth/trusted-devices/current',
    '@type': 'TrustDevice',
    trusted: true,
  } as unknown as TrustDeviceOutput;

  beforeEach(() => {
    mockTrustedDeviceService = {
      trustDevice: vi.fn().mockReturnValue(of(trustedDevice)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: TrustedDeviceService, useValue: mockTrustedDeviceService },
      ],
    });

    store = TestBed.inject(ActiveTrustedDeviceStore);
  });

  it('should trust the current device and clear the pending flag', async () => {
    store.setPendingTrustDevice(true);

    store.trustDevice();
    await flushEffects();

    expect(mockTrustedDeviceService.trustDevice).toHaveBeenCalledTimes(1);
    expect(store.pendingTrustDevice()).toBe(false);
    expect(store.trustSuccess()).toBe(true);
  });

  it('should reset to the initial state', () => {
    store.setPendingTrustDevice(true);
    store.clear();

    expect(store.pendingTrustDevice()).toBe(false);
    expect(store.trustCallState().status).toBe('idle');
  });
});
