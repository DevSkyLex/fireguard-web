import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import { AuthSessionNavigationService } from '../auth-session-navigation.service';

describe('AuthSessionNavigationService', () => {
  let logoutSucceeded: Subject<void>;
  let logoutFailed: Subject<void>;
  let navigate: ReturnType<typeof vi.fn>;
  let events: { on: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    logoutSucceeded = new Subject<void>();
    logoutFailed = new Subject<void>();
    navigate = vi.fn().mockResolvedValue(true);
    router = { url: '/organizations/current', navigate };
    events = {
      on: vi
        .fn()
        .mockReturnValueOnce(logoutSucceeded.asObservable())
        .mockReturnValueOnce(logoutFailed.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: router },
        { provide: Events, useValue: events },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('replaces authenticated history after either logout outcome', () => {
    const service = TestBed.inject(AuthSessionNavigationService);
    service.start();

    logoutSucceeded.next();
    logoutFailed.next();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, ['/auth/login'], { replaceUrl: true });
    expect(navigate).toHaveBeenNthCalledWith(2, ['/auth/login'], { replaceUrl: true });
  });

  it('subscribes only once', () => {
    const service = TestBed.inject(AuthSessionNavigationService);

    service.start();
    service.start();
    logoutSucceeded.next();

    expect(events.on).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('does not add a duplicate login entry', () => {
    router.url = '/auth/login?reason=expired';
    const service = TestBed.inject(AuthSessionNavigationService);
    service.start();

    logoutSucceeded.next();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not subscribe or navigate during server rendering', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Router, useValue: router },
        { provide: Events, useValue: events },
      ],
    });
    const service = TestBed.inject(AuthSessionNavigationService);

    service.start();
    service.navigateToLogin();

    expect(events.on).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
