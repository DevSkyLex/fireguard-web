import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideMonitor, lucideMoon, lucideSun } from '@ng-icons/lucide';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { HlmButton } from '@shared/ui/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import type { ThemeOption } from './models';

/**
 * Component ThemeSwitcher
 * @class ThemeSwitcher
 *
 * @description
 * Picks the appearance: light, dark, or whatever the operating system says.
 *
 * `system` is a real third choice rather than the absence of one — it keeps
 * following the OS after the fact, so a device that flips at sunset flips the
 * application with it. A two-state toggle cannot express that, which is why
 * this is a menu and not a switch.
 *
 * The trigger shows the *resolved* appearance, because that is what the user
 * sees on screen; the menu shows which of the three is actually selected.
 *
 * Generic by design: it injects the theme port published by `core/theme`, never
 * the concrete service (`ARCHITECTURE.md` §8.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-theme-switcher />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-theme-switcher',
  imports: [NgIcon, HlmButton, HlmDropdownMenu, HlmDropdownMenuItem, HlmDropdownMenuTrigger],
  providers: [provideIcons({ lucideCheck, lucideMonitor, lucideMoon, lucideSun })],
  templateUrl: './theme-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcher {
  //#region Properties
  /**
   * Property themePort
   * @readonly
   *
   * @description
   * The app-wide appearance contract.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

  /**
   * Property options
   * @readonly
   *
   * @description
   * The three appearances, in the order they are offered.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly ThemeOption[]}
   */
  protected readonly options: readonly ThemeOption[] = [
    { mode: 'light', icon: 'lucideSun', label: $localize`:@@theme.light:Light` },
    { mode: 'dark', icon: 'lucideMoon', label: $localize`:@@theme.dark:Dark` },
    { mode: 'system', icon: 'lucideMonitor', label: $localize`:@@theme.system:System` },
  ];

  /**
   * Property selected
   * @readonly
   *
   * @description
   * The chosen mode — `system` included, which `resolvedTheme` would hide.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ThemeMode>}
   */
  protected readonly selected: Signal<ThemeMode> = computed((): ThemeMode =>
    this.themePort.theme(),
  );

  /**
   * Property triggerIcon
   * @readonly
   *
   * @description
   * The glyph on the trigger: the appearance currently rendered, not the mode
   * that produced it. Under `system` the button therefore shows a sun or a
   * moon, which is what the screen actually looks like.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly triggerIcon: Signal<string> = computed((): string =>
    this.themePort.resolvedTheme() === 'dark' ? 'lucideMoon' : 'lucideSun',
  );

  /**
   * Property triggerLabel
   * @readonly
   *
   * @description
   * Accessible name of the trigger, naming the selected mode so a screen reader
   * is not left with an icon whose meaning depends on the OS.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly triggerLabel: Signal<string> = computed((): string => {
    const current: ThemeOption | undefined = this.options.find(
      (option: ThemeOption): boolean => option.mode === this.selected(),
    );

    return $localize`:@@theme.trigger:Appearance: ${current?.label ?? ''}:mode:`;
  });
  //#endregion

  //#region Methods
  /**
   * Method select
   * @method select
   *
   * @description
   * Applies one appearance. The port owns persistence and the OS listener.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - The appearance picked.
   *
   * @returns {void}
   */
  protected select(mode: ThemeMode): void {
    this.themePort.setTheme(mode);
  }
  //#endregion
}
