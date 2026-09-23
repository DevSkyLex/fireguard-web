import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subject } from 'rxjs';
import { BOOT_READINESS_PORT } from '@core/boot-readiness';
import { SplashScreenService } from '../splash-screen.service';

describe('SplashScreenService', () => {
  let service: SplashScreenService;
  let initialized: WritableSignal<boolean>;
  let events: Subject<NavigationStart | NavigationEnd | NavigationCancel | NavigationError>;
  let reload: ReturnType<typeof vi.fn>;

  const createService = (
    options: {
      initialized?: boolean;
      navigated?: boolean;
      platform?: 'browser' | 'server';
    } = {},
  ): void => {
    initialized = signal(options.initialized ?? true);
    events = new Subject();
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        SplashScreenService,
        { provide: Router, useValue: { events, navigated: options.navigated ?? true } },
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
        { provide: BOOT_READINESS_PORT, useValue: { initialized } },
        { provide: DOCUMENT, useValue: { defaultView: { location: { reload } } } },
      ],
    });
    service = TestBed.inject(SplashScreenService);
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('keeps the boot splash until both session initialization and first navigation settle', () => {
    createService({ initialized: false, navigated: false });
    expect(service.visible()).toBe(true);
    expect(service.phase()).toBe('session');

    initialized.set(true);
    expect(service.visible()).toBe(true);
    events.next(new NavigationEnd(1, '/dashboard', '/dashboard'));

    expect(service.visible()).toBe(false);
    expect(service.phase()).toBe('navigation');
  });

  it('shows a stalled boot after ten seconds and retries by reloading the browser', () => {
    createService({ initialized: false, navigated: false });

    vi.advanceTimersByTime(10_000);
    expect(service.visible()).toBe(true);
    expect(service.phase()).toBe('stalled');

    service.retry();
    expect(service.phase()).toBe('session');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not call a completed boot stalled after the timeout', () => {
    createService({ initialized: false });
    initialized.set(true);

    vi.advanceTimersByTime(10_000);

    expect(service.visible()).toBe(false);
    expect(service.phase()).toBe('navigation');
  });

  it('avoids a flash for quick navigation and shows the splash only after the delay', () => {
    createService();
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(149);
    expect(service.visible()).toBe(false);

    events.next(new NavigationStart(2, '/reports'));
    vi.advanceTimersByTime(1);
    expect(service.visible()).toBe(true);
    expect(service.phase()).toBe('navigation');

    events.next(new NavigationEnd(2, '/reports', '/reports'));
    expect(service.visible()).toBe(false);
  });

  it.each([
    new NavigationCancel(1, '/dashboard', 'guard refused'),
    new NavigationError(1, '/dashboard', new Error('resolver failed')),
  ])('clears a pending splash when navigation settles without success', (settled) => {
    createService();
    events.next(new NavigationStart(1, '/dashboard'));
    events.next(settled);
    vi.advanceTimersByTime(150);

    expect(service.visible()).toBe(false);
  });

  it('does not subscribe or reload on the server', () => {
    createService({ initialized: false, navigated: false, platform: 'server' });
    events.next(new NavigationEnd(1, '/', '/'));
    vi.advanceTimersByTime(10_000);

    expect(service.visible()).toBe(true);
    expect(service.phase()).toBe('session');
    service.retry();
    expect(reload).not.toHaveBeenCalled();
  });
});
