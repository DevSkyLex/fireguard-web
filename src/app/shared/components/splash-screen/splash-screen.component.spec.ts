import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SPLASH_SCREEN_PORT, type SplashScreenPort } from '@ports/splash-screen';
import { SplashScreen } from './splash-screen.component';

describe('SplashScreen', () => {
  const visible = signal(true);
  const mockSplashScreenPort: SplashScreenPort = {
    visible,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    visible.set(true);

    TestBed.configureTestingModule({
      imports: [SplashScreen],
      providers: [
        { provide: SPLASH_SCREEN_PORT, useValue: mockSplashScreenPort },
      ],
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
    expect(fixture.nativeElement.querySelector('p-progressspinner')).toBeTruthy();
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
