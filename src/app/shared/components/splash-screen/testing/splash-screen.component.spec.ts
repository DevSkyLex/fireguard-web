import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SPLASH_SCREEN_PORT,
  type SplashScreenPhase,
  type SplashScreenPort,
} from '@core/ports/splash-screen';
import { SplashScreen } from '../splash-screen.component';

describe('SplashScreen', () => {
  const visible = signal(true);
  const phase = signal<SplashScreenPhase>('session');
  const retry = vi.fn();
  const mockSplashScreenPort: SplashScreenPort = {
    visible,
    phase,
    retry,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    visible.set(true);
    phase.set('session');
    retry.mockClear();

    TestBed.configureTestingModule({
      imports: [SplashScreen],
      providers: [{ provide: SPLASH_SCREEN_PORT, useValue: mockSplashScreenPort }],
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SplashScreen);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the overlay while visible is true', () => {
    const fixture = TestBed.createComponent(SplashScreen);
    fixture.detectChanges();

    expect(fixture.componentInstance['rendered']()).toBe(true);
    expect(fixture.componentInstance['hiding']()).toBe(false);
    expect(fixture.nativeElement.querySelector('p-progressbar')).toBeTruthy();
  });

  it('should surface a phase-appropriate boot status message', () => {
    const fixture = TestBed.createComponent(SplashScreen);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restoring your session…');

    phase.set('navigation');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading…');
  });

  it('should offer a retry affordance when the boot has stalled', () => {
    phase.set('stalled');

    const fixture = TestBed.createComponent(SplashScreen);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Can't reach the server");
    expect(fixture.nativeElement.querySelector('p-progressbar')).toBeNull();

    const retryButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('p-button button');
    expect(retryButton).toBeTruthy();

    retryButton?.click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('should fade out before removing the overlay when visibility turns false', async () => {
    const fixture = TestBed.createComponent(SplashScreen);
    fixture.detectChanges();

    visible.set(false);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.componentInstance['hiding']()).toBe(true);
    expect(fixture.componentInstance['rendered']()).toBe(true);

    vi.advanceTimersByTime(300);
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.componentInstance['hiding']()).toBe(false);
    expect(fixture.componentInstance['rendered']()).toBe(false);
  });
});
