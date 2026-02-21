import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService, type ThemeMode } from '@core/services/theme';

/**
 * Component ThemeSwitcher
 * @class ThemeSwitcher
 *
 * @description
 * Compact toggle button that cycles the application theme through
 * the three available modes: light → dark → system → light.
 *
 * Reads and mutates the theme via {@link ThemeService}, which handles
 * cookie persistence and DOM attribute application automatically.
 * The button icon and tooltip update reactively via computed signals.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-theme-switcher',
  imports: [ButtonModule, TooltipModule],
  templateUrl: './theme-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcher {
  //#region Properties
  /**
   * Property themeService
   * @readonly
   *
   * @description
   * Injected ThemeService instance used to read the current theme
   * and dispatch theme changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ThemeService}
   */
  protected readonly themeService: ThemeService =
    inject<ThemeService>(ThemeService);
  //#endregion

  //#region Computed
  /**
   * Computed icon
   * @readonly
   *
   * @description
   * PrimeIcons class name reflecting the currently active theme mode.
   * - light  → pi-moon   (invite to switch to dark)
   * - dark   → pi-sun    (invite to switch to light)
   * - system → pi-desktop
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed<string>(() => {
    const icons: Record<ThemeMode, string> = {
      light: 'pi pi-moon',
      dark: 'pi pi-sun',
      system: 'pi pi-desktop',
    };
    return icons[this.themeService.theme()];
  });

  /**
   * Computed tooltip
   * @readonly
   *
   * @description
   * Tooltip label describing the theme mode that will be applied
   * on the next click.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly tooltip: Signal<string> = computed<string>(() => {
    const labels: Record<ThemeMode, string> = {
      light: 'Switch to dark mode',
      dark: 'Switch to system mode',
      system: 'Switch to light mode',
    };
    return labels[this.themeService.theme()];
  });
  //#endregion

  //#region Methods
  /**
   * Method cycle
   * @method cycle
   *
   * @description
   * Advances the theme to the next mode in the cycle:
   * light → dark → system → light.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} - No return value.
   */
  protected cycle(): void {
    const next: Record<ThemeMode, ThemeMode> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };

    this.themeService.setTheme(next[this.themeService.theme()]);
  }
  //#endregion
}
