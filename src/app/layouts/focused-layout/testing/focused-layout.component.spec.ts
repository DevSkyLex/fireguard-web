import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { FocusedLayout } from '../focused-layout.component';

describe('FocusedLayout', () => {
  beforeEach(() => {
    // The header carries the brand and the theme switcher since the shell
    // stopped rendering an empty bar, so the port has to be bound here too.
    const themePort: ThemePort = {
      theme: signal<ThemeMode>('light'),
      resolvedTheme: signal<'light' | 'dark'>('light'),
      setTheme: (): void => undefined,
    };

    TestBed.configureTestingModule({
      imports: [FocusedLayout],
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: themePort }],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FocusedLayout);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render router outlet inside centered content wrapper', () => {
    const fixture = TestBed.createComponent(FocusedLayout);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#focused-layout'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-focused-layout-header'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-focused-layout-content'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-focused-layout-footer'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('router-outlet'))).not.toBeNull();
  });
});
