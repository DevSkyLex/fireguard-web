import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { SplitLayoutHeader } from '../split-layout-header.component';

describe('SplitLayoutHeader', () => {
  beforeEach(() => {
    const themePort: ThemePort = {
      theme: signal<ThemeMode>('light'),
      resolvedTheme: signal<'light' | 'dark'>('light'),
      setTheme: (): void => undefined,
    };

    TestBed.configureTestingModule({
      imports: [SplitLayoutHeader],
      providers: [{ provide: THEME_PORT, useValue: themePort }],
    });
  });

  it('should render header element', () => {
    const fixture = TestBed.createComponent(SplitLayoutHeader);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('header');
    expect(header).not.toBeNull();
  });
});
