import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT } from '@core/theme';
import { SplitLayoutShowcase } from '../split-layout-showcase.component';

describe('SplitLayoutShowcase', () => {
  let fixture: ComponentFixture<SplitLayoutShowcase>;
  const theme = signal<'light' | 'dark'>('light');

  beforeEach(async () => {
    theme.set('light');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: THEME_PORT, useValue: { resolvedTheme: theme } },
      ],
    });

    fixture = TestBed.createComponent(SplitLayoutShowcase);
    await fixture.whenStable();
  });

  it('prioritizes only the matching main image and keeps detail images lazy', async () => {
    const light = fixture.nativeElement.querySelector(
      '[data-testid="auth-showcase-dashboard-light"]',
    ) as HTMLImageElement;
    const dark = fixture.nativeElement.querySelector(
      '[data-testid="auth-showcase-dashboard-dark"]',
    ) as HTMLImageElement;
    expect(light.getAttribute('loading')).toBe('eager');
    expect(light.getAttribute('fetchpriority')).toBe('high');
    expect(dark.getAttribute('loading')).toBe('lazy');
    theme.set('dark');
    await fixture.whenStable();
    expect(light.getAttribute('loading')).toBe('lazy');
    expect(dark.getAttribute('loading')).toBe('eager');
    expect(dark.getAttribute('fetchpriority')).toBe('high');
    for (const image of fixture.nativeElement.querySelectorAll(
      '[data-testid^="auth-showcase-activity-"]',
    )) {
      expect(image.getAttribute('loading')).toBe('lazy');
    }
  });

  it('should name the product', () => {
    expect(fixture.nativeElement.textContent).toContain('Fireguard');
  });

  it('should match the logo to the showcase background', async () => {
    const logo = fixture.nativeElement.querySelector(
      '[data-testid="auth-showcase-logo"]',
    ) as HTMLImageElement;

    expect(logo.getAttribute('src')).toBe('fireguard-logo-white.svg');

    theme.set('dark');
    await fixture.whenStable();

    expect(logo.getAttribute('src')).toBe('fireguard-logo-primary.svg');
  });

  it('should pair a concrete product promise with real workspace previews', () => {
    expect(fixture.nativeElement.textContent).toContain('publish the report');
    expect(fixture.nativeElement.querySelector('#auth-showcase-preview')).not.toBeNull();
  });

  it('should provide a matching screenshot for each theme', () => {
    const previews = fixture.nativeElement.querySelectorAll('#auth-showcase-preview img');
    const sources = Array.from(previews as NodeListOf<HTMLImageElement>).map(
      (preview: HTMLImageElement): string => preview.getAttribute('src') ?? '',
    );

    expect(previews.length).toBe(4);
    expect(sources).toEqual([
      'auth-showcase/dashboard-light.png',
      'auth-showcase/dashboard-dark.png',
      'auth-showcase/activity-light.png',
      'auth-showcase/activity-dark.png',
    ]);
  });

  it('should keep the visual evidence decorative for assistive technology', () => {
    const preview = fixture.nativeElement.querySelector('#auth-showcase-preview');
    const images = fixture.nativeElement.querySelectorAll('#auth-showcase-preview img');

    expect(preview?.getAttribute('aria-hidden')).toBe('true');
    expect(
      Array.from(images as NodeListOf<HTMLImageElement>).every(
        (image: HTMLImageElement): boolean => image.getAttribute('alt') === '',
      ),
    ).toBe(true);
  });
});
