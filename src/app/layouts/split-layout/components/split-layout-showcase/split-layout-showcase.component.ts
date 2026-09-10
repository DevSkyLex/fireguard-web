import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { THEME_PORT } from '@core/theme';

/**
 * Component SplitLayoutShowcase
 * @class SplitLayoutShowcase
 *
 * @description
 * Branded presentation for the entry shell. Theme-matched captures show the real
 * Fireguard workspace without coupling the layout to business state or navigation. The visible main capture receives eager loading and high fetch priority through the core theme contract; the alternate and detail captures remain lazy.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-split-layout-showcase />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 */
@Component({
  selector: 'app-split-layout-showcase',
  templateUrl: './split-layout-showcase.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutShowcase {
  /**
   * Property resolvedTheme
   * @readonly
   * @description Applied theme used to prioritize only the matching main capture.
   * Also selects the mark that contrasts with the showcase surface: white over
   * the light primary panel and primary over the dark neutral panel.
   * @access protected
   * @since 1.0.0
   * @type {Signal<'light' | 'dark'>}
   */
  protected readonly resolvedTheme: Signal<'light' | 'dark'> = inject(THEME_PORT).resolvedTheme;

  /**
   * Property logoSource
   * @readonly
   *
   * @description
   * Transparent mark selected for the showcase surface in the resolved theme.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string>}
   */
  protected readonly logoSource: Signal<string> = computed((): string =>
    this.resolvedTheme() === 'dark' ? 'fireguard-logo-primary.svg' : 'fireguard-logo-white.svg',
  );
}
