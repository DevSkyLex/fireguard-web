import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode } from '@core/theme';
import { ThemeSwitcher } from '../theme-switcher.component';

describe('ThemeSwitcher', () => {
  let fixture: ComponentFixture<ThemeSwitcher>;
  let theme: WritableSignal<ThemeMode>;
  let resolvedTheme: WritableSignal<'light' | 'dark'>;
  let setTheme: ReturnType<typeof vi.fn>;

  /**
   * The trigger button.
   */
  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('#theme-switcher-trigger') as HTMLButtonElement;
  }

  beforeEach(async () => {
    theme = signal<ThemeMode>('system');
    resolvedTheme = signal<'light' | 'dark'>('light');
    setTheme = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: THEME_PORT, useValue: { theme, resolvedTheme, setTheme } },
      ],
    });

    fixture = TestBed.createComponent(ThemeSwitcher);
    await fixture.whenStable();
  });

  it('should name the selected mode, not the rendered appearance', async () => {
    // Under `system` the glyph is a sun or a moon, so the accessible name is
    // the only thing that can say which of the three is selected.
    expect(trigger().getAttribute('aria-label')).toContain('System');

    theme.set('dark');
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-label')).toContain('Dark');
  });

  it('should show the selected mode, giving system a glyph of its own', async () => {
    // `name` is an Angular input, not a DOM attribute, so the assertion is on
    // the glyph itself: each mode must render a distinct one, or `system` is
    // indistinguishable from an explicit choice.
    const system: string = trigger().innerHTML;

    theme.set('light');
    await fixture.whenStable();
    const light: string = trigger().innerHTML;

    theme.set('dark');
    await fixture.whenStable();

    expect(system).not.toBe(light);
    expect(trigger().innerHTML).not.toBe(light);
    expect(trigger().innerHTML).not.toBe(system);
  });

  it('should not let the resolved appearance change the trigger under system', async () => {
    // The appearance is already visible on every pixel of the page; borrowing
    // its glyph would hide the mode without adding anything.
    const before: string = trigger().innerHTML;

    resolvedTheme.set('dark');
    await fixture.whenStable();

    expect(trigger().innerHTML).toBe(before);
    expect(theme()).toBe('system');
  });

  it('should offer the three modes with the selected one marked', async () => {
    trigger().click();
    await fixture.whenStable();

    const items = Array.from(
      document.querySelectorAll('[role="menu"] button') as NodeListOf<HTMLButtonElement>,
    );

    expect(items.map((item: HTMLButtonElement): string => item.textContent?.trim() ?? '')).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
    expect(items[2].getAttribute('aria-current')).toBe('true');
    expect(items[0].getAttribute('aria-current')).toBeNull();
  });

  it('should apply the mode the user picked', async () => {
    trigger().click();
    await fixture.whenStable();

    const items = Array.from(
      document.querySelectorAll('[role="menu"] button') as NodeListOf<HTMLButtonElement>,
    );
    items[1].click();
    await fixture.whenStable();

    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
