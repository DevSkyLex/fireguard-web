import { ApplicationInitStatus, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOTIFICATION_CENTER_PORT, USER_IDENTITY_PORT } from '@features/account/ports';
import { provideAccountFeature } from '../account.feature';

const configure = (platform: 'browser' | 'server') => {
  const profile = signal<{ id: string } | null>(null);
  const notifications = {
    initialize: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    connectMercure: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideAccountFeature(),
      { provide: PLATFORM_ID, useValue: platform },
      { provide: USER_IDENTITY_PORT, useValue: { profile } },
      { provide: NOTIFICATION_CENTER_PORT, useValue: notifications },
    ],
  });
  TestBed.inject(ApplicationInitStatus);
  return { profile, notifications };
};

describe('provideAccountFeature', () => {
  it('should start browser realtime when a profile arrives without preloading the feed', () => {
    const { profile, notifications } = configure('browser');
    TestBed.tick();
    expect(notifications.connectMercure).not.toHaveBeenCalled();

    profile.set({ id: 'user-1' });
    TestBed.tick();

    expect(notifications.connectMercure).toHaveBeenCalledTimes(1);
    expect(notifications.initialize).not.toHaveBeenCalled();
    expect(notifications.load).not.toHaveBeenCalled();
  });

  it('should not schedule a delayed realtime continuation after the profile is cleared', async () => {
    const { profile, notifications } = configure('browser');
    profile.set({ id: 'user-1' });
    TestBed.tick();
    notifications.connectMercure.mockClear();

    profile.set(null);
    TestBed.tick();
    await Promise.resolve();

    expect(notifications.connectMercure).not.toHaveBeenCalled();
    expect(notifications.initialize).not.toHaveBeenCalled();
  });

  it('should keep notification startup out of SSR with an authenticated profile', () => {
    const { profile, notifications } = configure('server');
    profile.set({ id: 'user-1' });
    TestBed.tick();

    expect(notifications.initialize).not.toHaveBeenCalled();
    expect(notifications.load).not.toHaveBeenCalled();
    expect(notifications.connectMercure).not.toHaveBeenCalled();
  });
});
