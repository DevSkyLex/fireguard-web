import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Dispatcher } from '@ngrx/signals/events';
import { TrustedDeviceStore } from './trusted-device.store';
import { TrustedDeviceService } from '@core/services/api/trusted-device';
import type { HydraCollection } from '@core/models/api';
import type { TrustedDeviceOutput } from '@core/models/trusted-device';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('TrustedDeviceStore', () => {
  let store: TrustedDeviceStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockTrustedDeviceService: {
    list: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    revokeAll: ReturnType<typeof vi.fn>;
  };

  const device1: TrustedDeviceOutput = {
    '@id': '/api/trusted-devices/1',
    '@type': 'TrustedDevice',
    id: 'device-1',
    name: 'Macbook',
    lastUsedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-06-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  };
  const device2: TrustedDeviceOutput = {
    ...device1,
    '@id': '/api/trusted-devices/2',
    id: 'device-2',
    name: 'iPhone',
  };
  const devicesCollection: HydraCollection<TrustedDeviceOutput> = {
    '@id': '/api/trusted-devices',
    '@type': 'Collection',
    totalItems: 2,
    member: [device1, device2],
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockTrustedDeviceService = {
      list: vi.fn(),
      revoke: vi.fn(),
      revokeAll: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TrustedDeviceStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: TrustedDeviceService, useValue: mockTrustedDeviceService },
      ],
    });

    store = TestBed.inject(TrustedDeviceStore);
  });

  it('should load devices and update computed flags', async () => {
    mockTrustedDeviceService.list.mockReturnValue(of(devicesCollection));

    store.loadDevices();
    await flushEffects();

    expect(store.isLoading()).toBe(false);
    expect(store.devices()).toEqual([device1, device2]);
    expect(store.deviceCount()).toBe(2);
    expect(store.hasDevices()).toBe(true);
  });

  it('should dispatch event when loading devices fails', async () => {
    mockTrustedDeviceService.list.mockReturnValue(throwError(() => new Error('Failed')));

    store.loadDevices();
    await flushEffects();

    expect(store.isLoading()).toBe(false);
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should revoke one device from the local list', async () => {
    mockTrustedDeviceService.list.mockReturnValue(of(devicesCollection));
    mockTrustedDeviceService.revoke.mockReturnValue(of(undefined));

    store.loadDevices();
    await flushEffects();
    store.revokeDevice('device-1');
    await flushEffects();

    expect(mockTrustedDeviceService.revoke).toHaveBeenCalledWith('device-1');
    expect(store.revokeOperation().status).toBe('success');
    expect(store.devices()).toEqual([device2]);
  });

  it('should revoke all devices and clear local collection', async () => {
    mockTrustedDeviceService.list.mockReturnValue(of(devicesCollection));
    mockTrustedDeviceService.revokeAll.mockReturnValue(of(undefined));

    store.loadDevices();
    await flushEffects();
    store.revokeAllDevices();
    await flushEffects();

    expect(store.revokeAllOperation().status).toBe('success');
    expect(store.devices()).toEqual([]);
    expect(store.hasDevices()).toBe(false);
  });
});
