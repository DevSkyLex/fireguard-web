import { ApplicationInitStatus, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '@core/theme';
import { NOTIFICATION_CENTER_PORT, USER_IDENTITY_PORT } from '@features/account/ports';
import { PresencePreferenceCoordinatorService } from '@features/account/services/presence-preference-coordinator';
import { InboxStore } from '@features/account/state';
import { provideAccountFeature } from '../account.feature';

const configure = (platform: 'browser' | 'server') => {
  const profile = signal<{ id: string } | null>(null);
  const unreadCount = signal(0);
  const resolvedTheme = signal<'light' | 'dark'>('light');
  const setFaviconOverride = vi.fn();
  const presenceStarted = vi.fn(() => ({}));
  const notifications = {
    initialize: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    connectMercure: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideAccountFeature(),
      { provide: PresencePreferenceCoordinatorService, useFactory: presenceStarted },
      { provide: PLATFORM_ID, useValue: platform },
      { provide: USER_IDENTITY_PORT, useValue: { profile } },
      { provide: NOTIFICATION_CENTER_PORT, useValue: notifications },
      { provide: InboxStore, useValue: { unreadCount } },
      { provide: ThemeService, useValue: { resolvedTheme, setFaviconOverride } },
    ],
  });
  TestBed.inject(ApplicationInitStatus);
  return {
    profile,
    unreadCount,
    resolvedTheme,
    notifications,
    presenceStarted,
    setFaviconOverride,
  };
};

describe('provideAccountFeature', () => {
  it('should mirror the bell count on the favicon and restore it when read', () => {
    const { unreadCount, resolvedTheme, setFaviconOverride } = configure('browser');
    TestBed.tick();
    expect(setFaviconOverride).toHaveBeenLastCalledWith(null);

    unreadCount.set(2);
    TestBed.tick();
    expect(setFaviconOverride).toHaveBeenLastCalledWith('fireguard-logo-primary-unread.svg');

    resolvedTheme.set('dark');
    TestBed.tick();
    expect(setFaviconOverride).toHaveBeenLastCalledWith('fireguard-logo-primary-unread-dark.svg');

    resolvedTheme.set('light');
    TestBed.tick();
    expect(setFaviconOverride).toHaveBeenLastCalledWith('fireguard-logo-primary-unread.svg');

    unreadCount.set(0);
    TestBed.tick();
    expect(setFaviconOverride).toHaveBeenLastCalledWith(null);
  });

  it('should start browser realtime when a profile arrives without preloading the feed', () => {
    const { profile, notifications, presenceStarted } = configure('browser');
    expect(presenceStarted).toHaveBeenCalledTimes(1);
    TestBed.tick();
    expect(notifications.connectMercure).not.toHaveBeenCalled();

    profile.set({ id: 'user-1' });
    TestBed.tick();

    expect(notifications.connectMercure).toHaveBeenCalledTimes(1);
    expect(notifications.initialize).not.toHaveBeenCalled();
    expect(notifications.load).not.toHaveBeenCalled();
  });

  it('should not schedule a delayed realtime continuation after the profile is cleared', async () => {
    const { profile, notifications, presenceStarted } = configure('browser');
    expect(presenceStarted).toHaveBeenCalledTimes(1);
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
    const { profile, notifications, presenceStarted, setFaviconOverride } = configure('server');
    expect(presenceStarted).not.toHaveBeenCalled();
    profile.set({ id: 'user-1' });
    TestBed.tick();

    expect(notifications.initialize).not.toHaveBeenCalled();
    expect(notifications.load).not.toHaveBeenCalled();
    expect(notifications.connectMercure).not.toHaveBeenCalled();
    expect(setFaviconOverride).not.toHaveBeenCalled();
  });
});
