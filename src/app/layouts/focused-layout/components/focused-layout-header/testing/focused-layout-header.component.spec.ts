import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { FocusedLayoutHeader } from '../focused-layout-header.component';

describe('FocusedLayoutHeader', () => {
  beforeEach(() => {
    const themePort: ThemePort = {
      theme: signal<ThemeMode>('light'),
      resolvedTheme: signal<'light' | 'dark'>('light'),
      setTheme: (): void => undefined,
    };

    TestBed.configureTestingModule({
      imports: [FocusedLayoutHeader],
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: themePort }],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FocusedLayoutHeader);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should offer the brand as a way home', () => {
    const fixture = TestBed.createComponent(FocusedLayoutHeader);
    fixture.detectChanges();

    const homeLink: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a[href="/"]');

    expect(homeLink).not.toBeNull();
    expect(homeLink?.textContent).toContain('Fireguard');
  });
});
