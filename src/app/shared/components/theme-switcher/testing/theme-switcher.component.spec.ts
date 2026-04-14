import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/ports/theme';
import { ThemeSwitcher } from '../theme-switcher.component';

describe('ThemeSwitcher', () => {
  const currentTheme = signal<ThemeMode>('light');
  const mockThemePort: ThemePort = {
    theme: currentTheme,
    setTheme: vi.fn((mode: ThemeMode) => {
      currentTheme.set(mode);
    }),
  };

  beforeEach(() => {
    currentTheme.set('light');
    vi.mocked(mockThemePort.setTheme).mockClear();

    TestBed.configureTestingModule({
      imports: [ThemeSwitcher],
      providers: [{ provide: THEME_PORT, useValue: mockThemePort }],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive icon and tooltip from the current theme', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);
    fixture.detectChanges();

    expect(fixture.componentInstance['icon']()).toBe('pi pi-moon');
    expect(fixture.componentInstance['tooltip']()).toBe('Switch to dark mode');

    currentTheme.set('dark');
    fixture.detectChanges();

    expect(fixture.componentInstance['icon']()).toBe('pi pi-sun');
    expect(fixture.componentInstance['tooltip']()).toBe('Switch to system mode');
  });

  it('should cycle to the next theme mode on click', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();
    fixture.detectChanges();

    expect(mockThemePort.setTheme).toHaveBeenCalledWith('dark');
    expect(currentTheme()).toBe('dark');
  });
});